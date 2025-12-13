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
  workday_hours: number;
  max_day_in_lieu_days: number | null;
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
    
    console.log(`Processing attendance adjustments for date: ${targetDate}`);

    // Get all organizations with their settings
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, workday_hours, max_day_in_lieu_days');

    if (orgError) {
      console.error('Error fetching organizations:', orgError);
      throw orgError;
    }

    const results: { organization: string; processed: number; adjustments: number }[] = [];

    for (const org of organizations as Organization[]) {
      console.log(`Processing organization: ${org.id}`);
      
      // Get attendance records for the target date
      const { data: attendanceRecords, error: attError } = await supabase
        .from('attendance_records')
        .select('*')
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
      const employeeWorkHours: Record<string, { totalMinutes: number; records: AttendanceRecord[] }> = {};
      
      for (const record of attendanceRecords as AttendanceRecord[]) {
        if (!employeeWorkHours[record.employee_id]) {
          employeeWorkHours[record.employee_id] = { totalMinutes: 0, records: [] };
        }
        
        if (record.check_in_time && record.check_out_time) {
          const checkIn = new Date(record.check_in_time);
          const checkOut = new Date(record.check_out_time);
          const workedMinutes = Math.round((checkOut.getTime() - checkIn.getTime()) / 60000);
          employeeWorkHours[record.employee_id].totalMinutes += workedMinutes;
          employeeWorkHours[record.employee_id].records.push(record);
        }
      }

      const workdayMinutes = org.workday_hours * 60;
      let adjustmentCount = 0;

      // Process each employee
      for (const [employeeId, data] of Object.entries(employeeWorkHours)) {
        // Get employee's schedule
        const { data: scheduleData } = await supabase
          .from('employee_schedules')
          .select('work_start_time, work_end_time, late_threshold_minutes')
          .eq('employee_id', employeeId)
          .single();

        let expectedMinutes = workdayMinutes;
        
        if (scheduleData) {
          // Calculate expected work hours from schedule
          const [startH, startM] = scheduleData.work_start_time.split(':').map(Number);
          const [endH, endM] = scheduleData.work_end_time.split(':').map(Number);
          expectedMinutes = (endH * 60 + endM) - (startH * 60 + startM);
        }

        const workedMinutes = data.totalMinutes;
        const difference = workedMinutes - expectedMinutes;

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

          // Check if overtime reaches a full day
          if (newOvertimeMinutes >= workdayMinutes) {
            const daysToAdd = Math.floor(newOvertimeMinutes / workdayMinutes);
            const remainingMinutes = newOvertimeMinutes % workdayMinutes;

            // Get or create Day In Lieu leave type
            let { data: dilLeaveType } = await supabase
              .from('leave_types')
              .select('id')
              .eq('organization_id', org.id)
              .eq('name', 'Day In Lieu')
              .eq('is_system', true)
              .single();

            if (!dilLeaveType) {
              const { data: newType, error: typeError } = await supabase
                .from('leave_types')
                .insert({
                  organization_id: org.id,
                  name: 'Day In Lieu',
                  category: 'paid',
                  description: 'Compensatory time off earned from working overtime',
                  default_days: 0,
                  is_system: true,
                  applies_to_all_offices: true,
                  is_active: true
                })
                .select('id')
                .single();

              if (typeError) {
                console.error(`Error creating DIL leave type:`, typeError);
                continue;
              }
              dilLeaveType = newType;
            }

            // Check cap on DIL days
            let actualDaysToAdd = daysToAdd;
            if (org.max_day_in_lieu_days !== null) {
              const { data: currentBalance } = await supabase
                .from('leave_type_balances')
                .select('balance')
                .eq('employee_id', employeeId)
                .eq('leave_type_id', dilLeaveType.id)
                .eq('year', currentYear)
                .single();

              const currentDays = currentBalance?.balance || 0;
              if (currentDays + daysToAdd > org.max_day_in_lieu_days) {
                actualDaysToAdd = Math.max(0, org.max_day_in_lieu_days - currentDays);
                console.log(`Employee ${employeeId}: DIL capped at ${org.max_day_in_lieu_days}, adding only ${actualDaysToAdd} days`);
              }
            }

            if (actualDaysToAdd > 0) {
              // Update leave balance
              const { data: existingBalance } = await supabase
                .from('leave_type_balances')
                .select('id, balance')
                .eq('employee_id', employeeId)
                .eq('leave_type_id', dilLeaveType.id)
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
                    leave_type_id: dilLeaveType.id,
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
                  minutes_converted: actualDaysToAdd * workdayMinutes,
                  attendance_date: targetDate,
                  notes: `Auto-credited ${actualDaysToAdd} day(s) in lieu for accumulated overtime`
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
              console.log(`Employee ${employeeId}: Credited ${actualDaysToAdd} DIL day(s)`);
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

          // Check if undertime reaches a full day
          if (newUndertimeMinutes >= workdayMinutes) {
            const daysToDeduct = Math.floor(newUndertimeMinutes / workdayMinutes);
            const remainingMinutes = newUndertimeMinutes % workdayMinutes;

            let deducted = 0;
            let deductFromType: { id: string; name: string } | null = null;

            // Priority: Day In Lieu first, then Annual Leave
            const leaveTypePriority = ['Day In Lieu', 'Annual Leave', 'Sick Leave'];

            for (const typeName of leaveTypePriority) {
              if (deducted >= daysToDeduct) break;

              const { data: leaveType } = await supabase
                .from('leave_types')
                .select('id, name')
                .eq('organization_id', org.id)
                .eq('name', typeName)
                .eq('is_active', true)
                .single();

              if (!leaveType) continue;

              const { data: balance } = await supabase
                .from('leave_type_balances')
                .select('id, balance')
                .eq('employee_id', employeeId)
                .eq('leave_type_id', leaveType.id)
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
                  minutes_converted: canDeduct * workdayMinutes,
                  attendance_date: targetDate,
                  notes: `Auto-deducted ${canDeduct} day(s) from ${typeName} for accumulated undertime`
                });

              deducted += canDeduct;
              deductFromType = leaveType;
              console.log(`Employee ${employeeId}: Deducted ${canDeduct} day(s) from ${typeName}`);
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
