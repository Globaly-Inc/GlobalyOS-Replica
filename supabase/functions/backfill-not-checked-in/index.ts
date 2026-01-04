import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Get request body for date range
    let startDate = "2026-01-01";
    let endDate: string;
    
    try {
      const body = await req.json();
      startDate = body.startDate || "2026-01-01";
      endDate = body.endDate || new Date().toISOString().split("T")[0];
    } catch {
      endDate = new Date().toISOString().split("T")[0];
    }

    console.log(`[backfill-not-checked-in] Starting backfill from ${startDate} to ${endDate}`);

    // Get all organizations
    const { data: organizations, error: orgsError } = await supabase
      .from("organizations")
      .select("id, timezone");

    if (orgsError) {
      console.error("[backfill-not-checked-in] Error fetching organizations:", orgsError);
      throw orgsError;
    }

    let totalCaptured = 0;
    let processedDays = 0;

    // Generate date range
    const dates: string[] = [];
    const currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    while (currentDate <= endDateObj) {
      dates.push(currentDate.toISOString().split("T")[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`[backfill-not-checked-in] Processing ${dates.length} days for ${organizations?.length || 0} organizations`);

    for (const org of organizations || []) {
      const orgTimezone = org.timezone || "Asia/Kathmandu";

      // Get all employee schedules for this org
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
            hire_date
          )
        `)
        .eq("employees.organization_id", org.id);

      if (schedError) {
        console.error(`[backfill-not-checked-in] Error fetching schedules for org ${org.id}:`, schedError);
        continue;
      }

      // Get all attendance records for this org in the date range
      const { data: allAttendance, error: attendError } = await supabase
        .from("attendance_records")
        .select("employee_id, date, check_in_time")
        .eq("organization_id", org.id)
        .gte("date", startDate)
        .lte("date", endDate);

      if (attendError) {
        console.error(`[backfill-not-checked-in] Error fetching attendance for org ${org.id}:`, attendError);
        continue;
      }

      // Create a map of attendance by employee and date
      const attendanceMap = new Map<string, boolean>();
      for (const record of allAttendance || []) {
        if (record.check_in_time) {
          attendanceMap.set(`${record.employee_id}:${record.date}`, true);
        }
      }

      // Get all leave requests for this org in the date range
      const { data: allLeave, error: leaveError } = await supabase
        .from("leave_requests")
        .select("employee_id, start_date, end_date, half_day_type, status")
        .eq("status", "approved")
        .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);

      if (leaveError) {
        console.error(`[backfill-not-checked-in] Error fetching leave for org ${org.id}:`, leaveError);
        continue;
      }

      // Get already processed records to avoid duplicates
      const { data: existingRecords, error: existingError } = await supabase
        .from("attendance_not_checked_in")
        .select("employee_id, date")
        .eq("organization_id", org.id)
        .gte("date", startDate)
        .lte("date", endDate);

      if (existingError) {
        console.error(`[backfill-not-checked-in] Error fetching existing records:`, existingError);
        continue;
      }

      const existingSet = new Set(
        (existingRecords || []).map(r => `${r.employee_id}:${r.date}`)
      );

      const notCheckedInBatch: any[] = [];

      for (const date of dates) {
        const dateObj = new Date(date + "T12:00:00Z");
        const dayOfWeek = dateObj.getDay();

        for (const schedule of schedules || []) {
          const emp = (schedule as any).employees;
          const empId = schedule.employee_id;

          // Skip if employee wasn't hired yet
          if (emp.hire_date && new Date(emp.hire_date) > dateObj) {
            continue;
          }

          // Skip if not scheduled this day
          const workDays = schedule.work_days || [];
          if (!workDays.includes(dayOfWeek)) {
            continue;
          }

          // Skip if already processed
          if (existingSet.has(`${empId}:${date}`)) {
            continue;
          }

          // Check if checked in
          if (attendanceMap.get(`${empId}:${date}`)) {
            continue;
          }

          // Check leave status
          let isOnFullDayLeave = false;
          let isOnFirstHalfLeave = false;

          for (const leave of allLeave || []) {
            if (leave.employee_id !== empId) continue;
            if (leave.start_date > date || leave.end_date < date) continue;

            if (!leave.half_day_type || leave.half_day_type === "full_day") {
              isOnFullDayLeave = true;
              break;
            } else if (leave.half_day_type === "first_half") {
              isOnFirstHalfLeave = true;
            }
          }

          if (isOnFullDayLeave) {
            continue;
          }

          let expectedStartTime = schedule.start_time;
          if (isOnFirstHalfLeave && schedule.break_end_time) {
            expectedStartTime = schedule.break_end_time;
          }

          notCheckedInBatch.push({
            organization_id: org.id,
            employee_id: empId,
            date: date,
            expected_start_time: expectedStartTime,
            work_location: schedule.work_location || null,
            reminder_sent: false,
          });
        }

        processedDays++;
      }

      if (notCheckedInBatch.length > 0) {
        // Insert in batches of 500
        for (let i = 0; i < notCheckedInBatch.length; i += 500) {
          const batch = notCheckedInBatch.slice(i, i + 500);
          const { error: insertError } = await supabase
            .from("attendance_not_checked_in")
            .upsert(batch, {
              onConflict: "organization_id,employee_id,date",
              ignoreDuplicates: true,
            });

          if (insertError) {
            console.error(`[backfill-not-checked-in] Error inserting batch:`, insertError);
          } else {
            totalCaptured += batch.length;
          }
        }

        console.log(`[backfill-not-checked-in] Org ${org.id}: captured ${notCheckedInBatch.length} records`);
      }
    }

    console.log(`[backfill-not-checked-in] Completed. Total records: ${totalCaptured}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        captured: totalCaptured,
        daysProcessed: processedDays,
        startDate,
        endDate
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[backfill-not-checked-in] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
