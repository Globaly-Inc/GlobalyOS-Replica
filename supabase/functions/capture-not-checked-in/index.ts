import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmployeeSchedule {
  id: string;
  employee_id: string;
  start_time: string;
  end_time: string;
  work_days: number[];
  work_location: string;
  break_start_time: string | null;
  break_end_time: string | null;
}

interface LeaveRequest {
  employee_id: string;
  half_day_type: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get request body for optional date override
    let targetDate: string | null = null;
    try {
      const body = await req.json();
      targetDate = body.date || null;
    } catch {
      // No body provided, use current date
    }

    console.log(`[capture-not-checked-in] Starting capture for date: ${targetDate || 'today'}`);

    // Get all organizations with their timezones
    const { data: organizations, error: orgsError } = await supabase
      .from("organizations")
      .select("id, timezone");

    if (orgsError) {
      console.error("[capture-not-checked-in] Error fetching organizations:", orgsError);
      throw orgsError;
    }

    let totalCaptured = 0;

    for (const org of organizations || []) {
      const orgTimezone = org.timezone || "Asia/Kathmandu";
      
      // Calculate the date in org's timezone
      const now = new Date();
      const dateInOrgTz = targetDate || new Date(now.toLocaleString("en-US", { timeZone: orgTimezone }))
        .toISOString()
        .split("T")[0];

      // Get day of week (0 = Sunday, 6 = Saturday)
      const dateObj = new Date(dateInOrgTz + "T12:00:00Z");
      const dayOfWeek = dateObj.getDay();

      console.log(`[capture-not-checked-in] Processing org ${org.id} for date ${dateInOrgTz}, day ${dayOfWeek}`);

      // Get holidays for this date in this organization
      const { data: holidaysToday, error: holidayError } = await supabase
        .from("calendar_events")
        .select(`
          id,
          applies_to_all_offices,
          calendar_event_offices(office_id)
        `)
        .eq("organization_id", org.id)
        .eq("event_type", "holiday")
        .lte("start_date", dateInOrgTz)
        .gte("end_date", dateInOrgTz);

      if (holidayError) {
        console.error(`[capture-not-checked-in] Error fetching holidays for org ${org.id}:`, holidayError);
      }

      // Build a set of office IDs that are on holiday today
      const holidayOfficeIds = new Set<string>();
      let isOrgWideHoliday = false;

      for (const holiday of holidaysToday || []) {
        if (holiday.applies_to_all_offices) {
          isOrgWideHoliday = true;
          break;
        } else {
          for (const ceo of holiday.calendar_event_offices || []) {
            holidayOfficeIds.add(ceo.office_id);
          }
        }
      }

      // Skip this org entirely if it's an org-wide holiday
      if (isOrgWideHoliday) {
        console.log(`[capture-not-checked-in] Org ${org.id} has org-wide holiday on ${dateInOrgTz}, skipping`);
        continue;
      }

      // Get all active employees with schedules for this org (including office_id)
      const { data: schedules, error: schedError } = await supabase
        .from("employee_schedules")
        .select(`
          id,
          employee_id,
          start_time,
          end_time,
          work_days,
          work_location,
          break_start_time,
          break_end_time,
          employees!inner (
            id,
            organization_id,
            status,
            office_id
          )
        `)
        .eq("employees.organization_id", org.id)
        .eq("employees.status", "active");

      if (schedError) {
        console.error(`[capture-not-checked-in] Error fetching schedules for org ${org.id}:`, schedError);
        continue;
      }

      // Filter employees whose schedule includes today
      const employeesScheduledToday = (schedules || []).filter((s: any) => {
        const workDays = s.work_days || [];
        return workDays.includes(dayOfWeek);
      });

      if (employeesScheduledToday.length === 0) {
        console.log(`[capture-not-checked-in] No employees scheduled for org ${org.id} on ${dateInOrgTz}`);
        continue;
      }

      const employeeIds = employeesScheduledToday.map((s: any) => s.employee_id);

      // Get approved leave requests for this date
      const { data: leaveRequests, error: leaveError } = await supabase
        .from("leave_requests")
        .select("employee_id, half_day_type")
        .in("employee_id", employeeIds)
        .eq("status", "approved")
        .lte("start_date", dateInOrgTz)
        .gte("end_date", dateInOrgTz);

      if (leaveError) {
        console.error(`[capture-not-checked-in] Error fetching leave requests for org ${org.id}:`, leaveError);
        continue;
      }

      // Create maps for leave status
      const fullDayLeaveSet = new Set<string>();
      const firstHalfLeaveSet = new Set<string>();
      const secondHalfLeaveSet = new Set<string>();

      for (const leave of leaveRequests || []) {
        if (!leave.half_day_type || leave.half_day_type === "full_day") {
          fullDayLeaveSet.add(leave.employee_id);
        } else if (leave.half_day_type === "first_half") {
          firstHalfLeaveSet.add(leave.employee_id);
        } else if (leave.half_day_type === "second_half") {
          secondHalfLeaveSet.add(leave.employee_id);
        }
      }

      // Get attendance records for this date
      const { data: attendanceRecords, error: attendError } = await supabase
        .from("attendance_records")
        .select("employee_id, check_in_time")
        .in("employee_id", employeeIds)
        .eq("date", dateInOrgTz);

      if (attendError) {
        console.error(`[capture-not-checked-in] Error fetching attendance for org ${org.id}:`, attendError);
        continue;
      }

      const checkedInSet = new Set(
        (attendanceRecords || [])
          .filter((a: any) => a.check_in_time !== null)
          .map((a: any) => a.employee_id)
      );

      // Determine who didn't check in
      const notCheckedInRecords: any[] = [];

      for (const schedule of employeesScheduledToday) {
        const empId = schedule.employee_id;
        const employeeData = (schedule as any).employees;
        const employeeOfficeId = employeeData?.office_id;

        // Skip if employee's office is on holiday today
        if (employeeOfficeId && holidayOfficeIds.has(employeeOfficeId)) {
          continue;
        }

        // Skip if on full day leave
        if (fullDayLeaveSet.has(empId)) {
          continue;
        }

        // Skip if already checked in
        if (checkedInSet.has(empId)) {
          continue;
        }

        // Handle half-day leave logic
        // For historical capture (end of day), if they have first_half leave and didn't check in,
        // they should have checked in after break_end_time
        // If they have second_half leave and didn't check in before break_start_time,
        // they are marked as not checked in
        // For simplicity in historical capture, if they didn't check in at all and have half-day leave,
        // we still record them as not checked in for the period they should have worked

        let expectedStartTime = schedule.start_time;
        
        // If first half leave, expected start is after break
        if (firstHalfLeaveSet.has(empId) && schedule.break_end_time) {
          expectedStartTime = schedule.break_end_time;
        }

        notCheckedInRecords.push({
          organization_id: org.id,
          employee_id: empId,
          date: dateInOrgTz,
          expected_start_time: expectedStartTime,
          work_location: schedule.work_location || null,
          reminder_sent: false,
        });
      }

      if (notCheckedInRecords.length > 0) {
        // Upsert to avoid duplicates
        const { error: insertError } = await supabase
          .from("attendance_not_checked_in")
          .upsert(notCheckedInRecords, {
            onConflict: "organization_id,employee_id,date",
            ignoreDuplicates: true,
          });

        if (insertError) {
          console.error(`[capture-not-checked-in] Error inserting records for org ${org.id}:`, insertError);
        } else {
          totalCaptured += notCheckedInRecords.length;
          console.log(`[capture-not-checked-in] Captured ${notCheckedInRecords.length} records for org ${org.id}`);
        }
      }
    }

    console.log(`[capture-not-checked-in] Completed. Total records captured: ${totalCaptured}`);

    return new Response(
      JSON.stringify({ success: true, captured: totalCaptured }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[capture-not-checked-in] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
