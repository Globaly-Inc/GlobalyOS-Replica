import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmployeeSchedule {
  employee_id: string;
  work_start_time: string;
  work_end_time: string;
  late_threshold_minutes: number;
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  organization_id: string;
  check_in_time: string;
  check_out_time: string | null;
  date: string;
  work_hours: number | null;
}

interface Organization {
  id: string;
  max_day_in_lieu_days: number | null;
  auto_attendance_adjustments_enabled: boolean;
  timezone: string | null;
}

interface Employee {
  id: string;
  user_id: string;
  office_id: string | null;
}

interface Profile {
  id: string;
  timezone: string | null;
}

/**
 * Get the effective timezone for an employee.
 * Priority: User's profile timezone > Organization timezone > 'UTC'
 */
async function getEmployeeTimezone(
  supabase: any,
  employeeId: string,
  orgTimezone: string | null
): Promise<string> {
  // Get employee's user_id
  const { data: employee } = await supabase
    .from('employees')
    .select('user_id')
    .eq('id', employeeId)
    .single();

  if (employee?.user_id) {
    // Get user's profile timezone
    const { data: profile } = await supabase
      .from('profiles')
      .select('timezone')
      .eq('id', employee.user_id)
      .single();

    if (profile?.timezone) {
      return profile.timezone;
    }
  }

  // Fallback to organization timezone or UTC
  return orgTimezone || 'UTC';
}

/**
 * Format a UTC date to time string (HH:mm) in a given timezone.
 * This is a simple implementation for Deno without date-fns-tz.
 */
function formatTimeInTimezone(utcDateString: string, timezone: string): string {
  try {
    const date = new Date(utcDateString);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return formatter.format(date);
  } catch {
    // Fallback: return UTC time
    const date = new Date(utcDateString);
    return date.toISOString().slice(11, 16);
  }
}

/**
 * Get or create office-specific Day In Lieu leave type
 * Now uses office_leave_types table instead of leave_types
 */
async function getOrCreateOfficeDIL(
  supabase: any,
  officeId: string,
  orgId: string
): Promise<{ id: string } | null> {
  // Check if DIL exists for this office
  let { data: dilLeaveType } = await supabase
    .from('office_leave_types')
    .select('id')
    .eq('office_id', officeId)
    .eq('name', 'Day In Lieu')
    .eq('is_system', true)
    .single();

  if (dilLeaveType) {
    return dilLeaveType;
  }

  // Create office-specific DIL
  const { data: newType, error: typeError } = await supabase
    .from('office_leave_types')
    .insert({
      office_id: officeId,
      organization_id: orgId,
      name: 'Day In Lieu',
      category: 'paid',
      description: 'Compensatory time off earned from working overtime',
      default_days: 0,
      is_system: true,
      is_active: true,
      min_days_advance: 0,
      max_negative_days: 0,
      applies_to_gender: 'all',
      carry_forward_mode: 'positive_only',
    })
    .select('id')
    .single();

  if (typeError) {
    console.error(`Error creating DIL leave type for office ${officeId}:`, typeError);
    return null;
  }

  return newType;
}

/**
 * Get office-specific leave type for deduction
 * Searches in office_leave_types table
 */
async function getOfficeLeaveType(
  supabase: any,
  officeId: string,
  typeName: string
): Promise<{ id: string; name: string } | null> {
  const { data: leaveType } = await supabase
    .from('office_leave_types')
    .select('id, name')
    .eq('office_id', officeId)
    .eq('name', typeName)
    .eq('is_active', true)
    .single();

  return leaveType;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get yesterday's date (or specified date from request)
    const body = await req.json().catch(() => ({}));
    const targetDate = body.date || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    console.log(`Processing attendance adjustments for date: ${targetDate} (office-aware)`);

    // Get all organizations with their settings (only those with feature enabled)
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, max_day_in_lieu_days, auto_attendance_adjustments_enabled, timezone')
      .eq('auto_attendance_adjustments_enabled', true);

    if (orgError) {
      console.error('Error fetching organizations:', orgError);
      throw orgError;
    }

    const results: { organization: string; processed: number; adjustments: number }[] = [];

    for (const org of organizations as Organization[]) {
      console.log(`Processing organization: ${org.id} (timezone: ${org.timezone || 'not set'})`);
      
      // Get attendance records for the target date with employee office info
      const { data: attendanceRecords, error: attError } = await supabase
        .from('attendance_records')
        .select(`
          *,
          employee:employees!attendance_records_employee_id_fkey(
            id,
            office_id
          )
        `)
        .eq('organization_id', org.id)
        .eq('date', targetDate)
        .not('check_out_time', 'is', null);

      if (attError) {
        console.error(`Error fetching attendance for org ${org.id}:`, attError);
        continue;
      }

      if (!attendanceRecords || attendanceRecords.length === 0) {
        console.log(`No complete attendance records for org ${org.id}`);
        continue;
      }

      // Group records by employee and sum their work hours
      const employeeWorkHours: Record<string, { 
        totalMinutes: number; 
        records: AttendanceRecord[];
        officeId: string | null;
      }> = {};
      
      for (const record of attendanceRecords as any[]) {
        const employeeId = record.employee_id;
        const officeId = record.employee?.office_id || null;
        
        if (!employeeWorkHours[employeeId]) {
          employeeWorkHours[employeeId] = { totalMinutes: 0, records: [], officeId };
        }
        
        if (record.check_in_time && record.check_out_time) {
          const checkIn = new Date(record.check_in_time);
          const checkOut = new Date(record.check_out_time);
          const workedMinutes = Math.round((checkOut.getTime() - checkIn.getTime()) / 60000);
          employeeWorkHours[employeeId].totalMinutes += workedMinutes;
          employeeWorkHours[employeeId].records.push(record);
        }
      }

      let adjustmentCount = 0;
      const defaultWorkdayMinutes = 8 * 60; // 8 hours default if no schedule

      // Process each employee
      for (const [employeeId, data] of Object.entries(employeeWorkHours)) {
        const officeId = data.officeId;
        
        if (!officeId) {
          console.log(`Employee ${employeeId} has no office assigned, skipping DIL processing`);
          continue;
        }

        // Get employee's timezone for proper schedule comparison
        const employeeTimezone = await getEmployeeTimezone(supabase, employeeId, org.timezone);
        
        // Get employee's schedule
        const { data: scheduleData } = await supabase
          .from('employee_schedules')
          .select('work_start_time, work_end_time, late_threshold_minutes')
          .eq('employee_id', employeeId)
          .single();

        let expectedMinutes = defaultWorkdayMinutes;
        
        if (scheduleData) {
          // Calculate expected work hours from schedule
          const [startH, startM] = scheduleData.work_start_time.split(':').map(Number);
          const [endH, endM] = scheduleData.work_end_time.split(':').map(Number);
          expectedMinutes = (endH * 60 + endM) - (startH * 60 + startM);
        }

        // For overtime/undertime calculation, we use actual worked minutes
        const workedMinutes = data.totalMinutes;
        const difference = workedMinutes - expectedMinutes;

        console.log(`Employee ${employeeId} (office: ${officeId}): worked ${workedMinutes}min, expected ${expectedMinutes}min, diff ${difference}min`);

        if (Math.abs(difference) < 5) {
          // Less than 5 minutes difference, ignore
          continue;
        }

        const currentYear = new Date(targetDate).getFullYear();

        // Get or create hour balance record
        let { data: hourBalance } = await supabase
          .from('attendance_hour_balances')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('year', currentYear)
          .single();

        if (!hourBalance) {
          const { data: newBalance, error: createError } = await supabase
            .from('attendance_hour_balances')
            .insert({
              employee_id: employeeId,
              organization_id: org.id,
              year: currentYear,
              overtime_minutes: 0,
              undertime_minutes: 0
            })
            .select()
            .single();

          if (createError) {
            console.error(`Error creating hour balance for ${employeeId}:`, createError);
            continue;
          }
          hourBalance = newBalance;
        }

        if (difference > 0) {
          // Overtime - add to overtime_minutes
          const newOvertimeMinutes = (hourBalance.overtime_minutes || 0) + difference;
          
          await supabase
            .from('attendance_hour_balances')
            .update({ 
              overtime_minutes: newOvertimeMinutes,
              updated_at: new Date().toISOString()
            })
            .eq('id', hourBalance.id);

          console.log(`Employee ${employeeId}: Added ${difference} overtime minutes (total: ${newOvertimeMinutes})`);

          // Check if overtime reaches a full day (based on employee's expected hours)
          if (newOvertimeMinutes >= expectedMinutes) {
            const daysToAdd = Math.floor(newOvertimeMinutes / expectedMinutes);
            const remainingMinutes = newOvertimeMinutes % expectedMinutes;

            // Get or create office-specific Day In Lieu leave type
            const dilLeaveType = await getOrCreateOfficeDIL(supabase, officeId, org.id);

            if (!dilLeaveType) {
              console.error(`Failed to get/create DIL for office ${officeId}`);
              continue;
            }

            // Check cap on DIL days
            let actualDaysToAdd = daysToAdd;
            if (org.max_day_in_lieu_days !== null) {
              const { data: currentBalance } = await supabase
                .from('leave_type_balances')
                .select('balance')
                .eq('employee_id', employeeId)
                .eq('office_leave_type_id', dilLeaveType.id)
                .eq('year', currentYear)
                .single();

              const currentDays = currentBalance?.balance || 0;
              if (currentDays + daysToAdd > org.max_day_in_lieu_days) {
                actualDaysToAdd = Math.max(0, org.max_day_in_lieu_days - currentDays);
                console.log(`Employee ${employeeId}: DIL capped at ${org.max_day_in_lieu_days}, adding only ${actualDaysToAdd} days`);
              }
            }

            if (actualDaysToAdd > 0) {
              // Update leave balance (using office_leave_type_id)
              const { data: existingBalance } = await supabase
                .from('leave_type_balances')
                .select('id, balance')
                .eq('employee_id', employeeId)
                .eq('office_leave_type_id', dilLeaveType.id)
                .eq('year', currentYear)
                .single();

              if (existingBalance) {
                await supabase
                  .from('leave_type_balances')
                  .update({ balance: existingBalance.balance + actualDaysToAdd })
                  .eq('id', existingBalance.id);
              } else {
                await supabase
                  .from('leave_type_balances')
                  .insert({
                    employee_id: employeeId,
                    office_leave_type_id: dilLeaveType.id,
                    organization_id: org.id,
                    balance: actualDaysToAdd,
                    year: currentYear
                  });
              }

              // Log the adjustment
              await supabase
                .from('attendance_leave_adjustments')
                .insert({
                  employee_id: employeeId,
                  organization_id: org.id,
                  adjustment_type: 'overtime_credit',
                  leave_type_id: dilLeaveType.id,
                  days_adjusted: actualDaysToAdd,
                  minutes_converted: actualDaysToAdd * expectedMinutes,
                  attendance_date: targetDate,
                  notes: `Auto-credited ${actualDaysToAdd} day(s) in lieu for accumulated overtime (${expectedMinutes} min/day) - Office: ${officeId}`
                });

              // Update remaining overtime minutes
              await supabase
                .from('attendance_hour_balances')
                .update({ 
                  overtime_minutes: remainingMinutes,
                  updated_at: new Date().toISOString()
                })
                .eq('id', hourBalance.id);

              adjustmentCount++;
              console.log(`Employee ${employeeId}: Credited ${actualDaysToAdd} DIL day(s) to office ${officeId}`);
            }
          }
        } else {
          // Undertime - add to undertime_minutes
          const undertimeMinutes = Math.abs(difference);
          const newUndertimeMinutes = (hourBalance.undertime_minutes || 0) + undertimeMinutes;
          
          await supabase
            .from('attendance_hour_balances')
            .update({ 
              undertime_minutes: newUndertimeMinutes,
              updated_at: new Date().toISOString()
            })
            .eq('id', hourBalance.id);

          console.log(`Employee ${employeeId}: Added ${undertimeMinutes} undertime minutes (total: ${newUndertimeMinutes})`);

          // Check if undertime reaches a full day (based on employee's expected hours)
          if (newUndertimeMinutes >= expectedMinutes) {
            const daysToDeduct = Math.floor(newUndertimeMinutes / expectedMinutes);
            const remainingMinutes = newUndertimeMinutes % expectedMinutes;

            let deducted = 0;

            // Priority: Day In Lieu first, then Annual Leave, then Sick Leave
            const leaveTypePriority = ['Day In Lieu', 'Annual Leave', 'Sick Leave'];

            for (const typeName of leaveTypePriority) {
              if (deducted >= daysToDeduct) break;

              // Get office-specific leave type
              const leaveType = await getOfficeLeaveType(supabase, officeId, typeName);

              if (!leaveType) continue;

              const { data: balance } = await supabase
                .from('leave_type_balances')
                .select('id, balance')
                .eq('employee_id', employeeId)
                .eq('office_leave_type_id', leaveType.id)
                .eq('year', currentYear)
                .single();

              if (!balance || balance.balance <= 0) continue;

              const canDeduct = Math.min(balance.balance, daysToDeduct - deducted);
              
              await supabase
                .from('leave_type_balances')
                .update({ balance: balance.balance - canDeduct })
                .eq('id', balance.id);

              // Log the adjustment
              await supabase
                .from('attendance_leave_adjustments')
                .insert({
                  employee_id: employeeId,
                  organization_id: org.id,
                  adjustment_type: 'undertime_deduction',
                  leave_type_id: leaveType.id,
                  days_adjusted: -canDeduct,
                  minutes_converted: canDeduct * expectedMinutes,
                  attendance_date: targetDate,
                  notes: `Auto-deducted ${canDeduct} day(s) from ${typeName} for accumulated undertime (${expectedMinutes} min/day) - Office: ${officeId}`
                });

              deducted += canDeduct;
              console.log(`Employee ${employeeId}: Deducted ${canDeduct} day(s) from ${typeName} (office: ${officeId})`);
            }

            if (deducted > 0) {
              // Update remaining undertime minutes
              await supabase
                .from('attendance_hour_balances')
                .update({ 
                  undertime_minutes: remainingMinutes,
                  updated_at: new Date().toISOString()
                })
                .eq('id', hourBalance.id);

              adjustmentCount++;
            }
          }
        }
      }

      results.push({
        organization: org.id,
        processed: Object.keys(employeeWorkHours).length,
        adjustments: adjustmentCount
      });
    }

    console.log('Processing complete:', results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing attendance adjustments:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
