import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AttendanceMetrics {
  totalRecords: number;
  missing: number;
  onLeave: number;
  lateArrivals: { count: number; totalMinutes: number; change: number };
  earlyCheckouts: { count: number; totalMinutes: number; change: number };
  onTime: { count: number; percent: number; change: number };
  belowTime: { count: number; totalMinutes: number; change: number };
  overTime: { count: number; totalMinutes: number; change: number };
  netHours: { totalMinutes: number; avgMinutesPerPerson: number; change: number };
  wfh: { count: number; percent: number };
}

interface DailyData {
  date: string;
  total: number;
  onTime: number;
}

// Helper function to format minutes as "Xh Ym"
function formatMinutes(minutes: number): string {
  if (minutes === 0) return "0m";
  const hours = Math.floor(Math.abs(minutes) / 60);
  const mins = Math.round(Math.abs(minutes) % 60);
  const sign = minutes < 0 ? "-" : "";
  if (hours === 0) return `${sign}${mins}m`;
  if (mins === 0) return `${sign}${hours}h`;
  return `${sign}${hours}h ${mins}m`;
}

// Helper to get trend indicator HTML
function getTrendIndicator(change: number): string {
  if (change === 0) return "";
  const isPositive = change > 0;
  const arrow = isPositive ? "▲" : "▼";
  const color = isPositive ? "#22c55e" : "#ef4444";
  return `<span style="font-size: 10px; color: ${color}; margin-left: 4px;">${arrow} ${Math.abs(change).toFixed(0)}%</span>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organizationId, isTest, includeAISummary, includeCharts } = await req.json();
    
    console.log("=== Starting send-attendance-report ===");
    console.log("Organization ID:", organizationId);
    console.log("Is Test:", isTest);
    console.log("Include AI Summary:", includeAISummary);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Fetch organization details
    console.log("Fetching organization details...");
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, logo_url, slug")
      .eq("id", organizationId)
      .single();

    if (orgError || !org) {
      console.error("Organization fetch error:", orgError);
      throw new Error("Organization not found");
    }
    console.log("Organization found:", org.name);

    // Get schedule settings
    const { data: schedule } = await supabase
      .from("attendance_report_schedules")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();

    console.log("Schedule settings:", schedule);

    // Calculate date range
    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(now);
    const periodDays = schedule?.frequency === "monthly" ? 30 : 7;
    startDate.setDate(startDate.getDate() - periodDays);
    startDate.setHours(0, 0, 0, 0);

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];
    console.log("Date range:", startDateStr, "to", endDateStr);

    // Calculate previous period for comparison
    const prevEndDate = new Date(startDate);
    prevEndDate.setDate(prevEndDate.getDate() - 1);
    const prevStartDate = new Date(prevEndDate);
    prevStartDate.setDate(prevStartDate.getDate() - periodDays);
    const prevStartDateStr = prevStartDate.toISOString().split("T")[0];
    const prevEndDateStr = prevEndDate.toISOString().split("T")[0];

    // Fetch attendance records with employee schedules
    console.log("Fetching attendance records...");
    const { data: records, error: recordsError } = await supabase
      .from("attendance_records")
      .select(`
        *,
        employee:employees!attendance_records_employee_id_fkey(
          id,
          profiles:user_id(full_name, avatar_url),
          employee_schedules(work_start_time, work_end_time, late_threshold_minutes, break_start_time, break_end_time)
        )
      `)
      .eq("organization_id", organizationId)
      .gte("date", startDateStr)
      .lte("date", endDateStr);

    if (recordsError) {
      console.error("Records fetch error:", recordsError);
      throw recordsError;
    }
    console.log("Records found:", records?.length || 0);

    // Fetch previous period records for comparison
    const { data: prevRecords } = await supabase
      .from("attendance_records")
      .select(`
        *,
        employee:employees!attendance_records_employee_id_fkey(
          employee_schedules(work_start_time, work_end_time, late_threshold_minutes, break_start_time, break_end_time)
        )
      `)
      .eq("organization_id", organizationId)
      .gte("date", prevStartDateStr)
      .lte("date", prevEndDateStr);

    // Fetch active employees count
    const { count: activeEmployeeCount } = await supabase
      .from("employees")
      .select("id", { count: "exact" })
      .eq("organization_id", organizationId)
      .eq("status", "active");

    // Fetch approved leave requests for the period
    const { data: leaveRequests } = await supabase
      .from("leave_requests")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("status", "approved")
      .gte("start_date", startDateStr)
      .lte("end_date", endDateStr);

    console.log("Active employees:", activeEmployeeCount);

    // Calculate expected schedule minutes per day (default 8h = 480 mins)
    const getExpectedMinutes = (empSchedule: any): number => {
      if (!empSchedule?.work_start_time || !empSchedule?.work_end_time) return 480;
      const [startH, startM] = empSchedule.work_start_time.split(":").map(Number);
      const [endH, endM] = empSchedule.work_end_time.split(":").map(Number);
      let totalMins = (endH * 60 + endM) - (startH * 60 + startM);
      // Subtract break if configured
      if (empSchedule.break_start_time && empSchedule.break_end_time) {
        const [breakStartH, breakStartM] = empSchedule.break_start_time.split(":").map(Number);
        const [breakEndH, breakEndM] = empSchedule.break_end_time.split(":").map(Number);
        totalMins -= (breakEndH * 60 + breakEndM) - (breakStartH * 60 + breakStartM);
      }
      return totalMins > 0 ? totalMins : 480;
    };

    // Calculate metrics for a set of records
    const calculateMetricsFromRecords = (recs: any[]) => {
      let totalRecords = recs?.length || 0;
      let lateCount = 0, lateMinutes = 0;
      let earlyCount = 0, earlyMinutes = 0;
      let onTimeCount = 0;
      let belowCount = 0, belowMinutes = 0;
      let overCount = 0, overMinutes = 0;
      let totalNetMinutes = 0;
      let wfhCount = 0;

      recs?.forEach((record: any) => {
        const empSchedule = record.employee?.employee_schedules?.[0];
        const expectedMinutes = getExpectedMinutes(empSchedule);

        // WFH count
        if (record.status === "remote") {
          wfhCount++;
        }

        // Net hours calculation
        const workMinutes = (record.work_hours || 0) * 60;
        totalNetMinutes += workMinutes;

        // Below/Over time
        if (workMinutes > 0 && expectedMinutes > 0) {
          const diff = workMinutes - expectedMinutes;
          if (diff < -5) { // Below time (more than 5 mins under)
            belowCount++;
            belowMinutes += Math.abs(diff);
          } else if (diff > 5) { // Over time (more than 5 mins over)
            overCount++;
            overMinutes += diff;
          }
        }

        // Late arrivals
        if (record.check_in_time && empSchedule?.work_start_time) {
          const checkInTime = new Date(record.check_in_time);
          const [startH, startM] = empSchedule.work_start_time.split(":").map(Number);
          const threshold = empSchedule.late_threshold_minutes || 0;
          const expectedStart = new Date(checkInTime);
          expectedStart.setHours(startH, startM + threshold, 0, 0);

          if (checkInTime > expectedStart) {
            lateCount++;
            lateMinutes += Math.round((checkInTime.getTime() - expectedStart.getTime()) / 60000);
          } else {
            onTimeCount++;
          }
        }

        // Early departures
        if (record.check_out_time && empSchedule?.work_end_time) {
          const checkOutTime = new Date(record.check_out_time);
          const [endH, endM] = empSchedule.work_end_time.split(":").map(Number);
          const expectedEnd = new Date(checkOutTime);
          expectedEnd.setHours(endH, endM, 0, 0);

          if (checkOutTime < expectedEnd) {
            earlyCount++;
            earlyMinutes += Math.round((expectedEnd.getTime() - checkOutTime.getTime()) / 60000);
          }
        }
      });

      const uniqueEmployees = new Set(recs?.map((r: any) => r.employee_id) || []).size;

      return {
        totalRecords,
        lateArrivals: { count: lateCount, totalMinutes: lateMinutes },
        earlyCheckouts: { count: earlyCount, totalMinutes: earlyMinutes },
        onTime: { count: onTimeCount, percent: totalRecords > 0 ? Math.round((onTimeCount / totalRecords) * 100) : 0 },
        belowTime: { count: belowCount, totalMinutes: belowMinutes },
        overTime: { count: overCount, totalMinutes: overMinutes },
        netHours: { totalMinutes: totalNetMinutes, avgMinutesPerPerson: uniqueEmployees > 0 ? Math.round(totalNetMinutes / uniqueEmployees) : 0 },
        wfh: { count: wfhCount, percent: totalRecords > 0 ? Math.round((wfhCount / totalRecords) * 100) : 0 },
      };
    };

    // Calculate current and previous period metrics
    const currentMetrics = calculateMetricsFromRecords(records || []);
    const prevMetricsRaw = calculateMetricsFromRecords(prevRecords || []);

    // Calculate percentage changes
    const calcChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const expectedTotalRecords = (activeEmployeeCount || 0) * periodDays;
    const missing = Math.max(0, expectedTotalRecords - (records?.length || 0) - (leaveRequests?.length || 0));

    const metrics: AttendanceMetrics = {
      totalRecords: currentMetrics.totalRecords,
      missing,
      onLeave: leaveRequests?.length || 0,
      lateArrivals: { ...currentMetrics.lateArrivals, change: calcChange(currentMetrics.lateArrivals.count, prevMetricsRaw.lateArrivals.count) },
      earlyCheckouts: { ...currentMetrics.earlyCheckouts, change: calcChange(currentMetrics.earlyCheckouts.count, prevMetricsRaw.earlyCheckouts.count) },
      onTime: { ...currentMetrics.onTime, change: calcChange(currentMetrics.onTime.count, prevMetricsRaw.onTime.count) },
      belowTime: { ...currentMetrics.belowTime, change: calcChange(currentMetrics.belowTime.count, prevMetricsRaw.belowTime.count) },
      overTime: { ...currentMetrics.overTime, change: calcChange(currentMetrics.overTime.count, prevMetricsRaw.overTime.count) },
      netHours: { ...currentMetrics.netHours, change: calcChange(currentMetrics.netHours.totalMinutes, prevMetricsRaw.netHours.totalMinutes) },
      wfh: currentMetrics.wfh,
    };

    console.log("Metrics calculated:", metrics);

    // Calculate daily data for trend chart
    const dailyDataMap: Record<string, DailyData> = {};
    records?.forEach((record: any) => {
      const date = record.date;
      if (!dailyDataMap[date]) {
        dailyDataMap[date] = { date, total: 0, onTime: 0 };
      }
      dailyDataMap[date].total++;
      
      const empSchedule = record.employee?.employee_schedules?.[0];
      if (record.check_in_time && empSchedule?.work_start_time) {
        const checkInTime = new Date(record.check_in_time);
        const [startH, startM] = empSchedule.work_start_time.split(":").map(Number);
        const threshold = empSchedule.late_threshold_minutes || 0;
        const expectedStart = new Date(checkInTime);
        expectedStart.setHours(startH, startM + threshold, 0, 0);
        if (checkInTime <= expectedStart) {
          dailyDataMap[date].onTime++;
        }
      }
    });

    const dailyData: DailyData[] = Object.values(dailyDataMap).sort((a, b) => a.date.localeCompare(b.date));
    const avgDaily = dailyData.length > 0 ? Math.round(dailyData.reduce((sum, d) => sum + d.total, 0) / dailyData.length) : 0;
    const peakDay = dailyData.reduce((max, d) => d.total > max.total ? d : max, { date: "", total: 0, onTime: 0 });
    const lowDay = dailyData.filter(d => d.total > 0).reduce((min, d) => d.total < min.total ? d : min, dailyData[0] || { date: "", total: 999, onTime: 0 });

    // Identify employees needing attention and recognition
    const lateEmployees: string[] = [];
    const perfectAttendance: string[] = [];
    const employeeStats: Record<string, { name: string; lateCount: number; onTimeCount: number }> = {};

    records?.forEach((record: any) => {
      const employeeName = record.employee?.profiles?.full_name || "Unknown";
      const employeeId = record.employee_id;
      
      if (!employeeStats[employeeId]) {
        employeeStats[employeeId] = { name: employeeName, lateCount: 0, onTimeCount: 0 };
      }

      const empSchedule = record.employee?.employee_schedules?.[0];
      if (record.check_in_time && empSchedule?.work_start_time) {
        const checkInTime = new Date(record.check_in_time);
        const [startH, startM] = empSchedule.work_start_time.split(":").map(Number);
        const threshold = empSchedule.late_threshold_minutes || 0;
        const expectedStart = new Date(checkInTime);
        expectedStart.setHours(startH, startM + threshold, 0, 0);

        if (checkInTime > expectedStart) {
          employeeStats[employeeId].lateCount++;
        } else {
          employeeStats[employeeId].onTimeCount++;
        }
      }
    });

    Object.values(employeeStats).forEach((stats) => {
      if (stats.lateCount >= 2 && !lateEmployees.includes(stats.name)) {
        lateEmployees.push(stats.name);
      }
      if (stats.lateCount === 0 && stats.onTimeCount >= 3 && !perfectAttendance.includes(stats.name)) {
        perfectAttendance.push(stats.name);
      }
    });

    // Generate AI summary
    let aiSummary = "";
    if (includeAISummary && LOVABLE_API_KEY) {
      console.log("Generating AI summary...");
      try {
        const summaryPrompt = `Generate a brief, friendly attendance summary for ${org.name}. 
Period: ${startDateStr} to ${endDateStr}
Metrics: ${metrics.totalRecords} total records, ${metrics.onTime.count} on-time (${metrics.onTime.percent}%), ${metrics.lateArrivals.count} late arrivals, ${metrics.earlyCheckouts.count} early departures, ${metrics.wfh.count} WFH days, ${formatMinutes(metrics.netHours.totalMinutes)} total hours.
Late employees (2+ incidents): ${lateEmployees.slice(0, 3).join(", ") || "None"}
Perfect attendance: ${perfectAttendance.slice(0, 3).join(", ") || "None"}

Write 2-3 sentences highlighting key insights. Be encouraging but mention areas needing attention. Use employee first names only.`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You are an HR assistant writing attendance report summaries. Be concise and professional." },
              { role: "user", content: summaryPrompt }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiSummary = aiData.choices?.[0]?.message?.content || "";
          console.log("AI summary generated successfully");
        } else {
          console.error("AI response not OK:", aiResponse.status);
        }
      } catch (aiError) {
        console.error("AI summary generation failed:", aiError);
        aiSummary = `Your team logged ${metrics.totalRecords} attendance records this period with ${metrics.onTime.percent}% on-time rate.`;
      }
    }

    // Get recipients
    console.log("Fetching recipients...");
    const recipientRoles = schedule?.recipients || { owner: true, admin: true, hr: true };
    const roles: string[] = [];
    if (recipientRoles.owner) roles.push("owner");
    if (recipientRoles.admin) roles.push("admin");
    if (recipientRoles.hr) roles.push("hr");
    
    console.log("Looking for roles:", roles);

    const { data: orgEmployees, error: empError } = await supabase
      .from("employees")
      .select(`
        id,
        user_id,
        profiles:user_id(full_name, email)
      `)
      .eq("organization_id", organizationId)
      .eq("status", "active");

    if (empError) {
      console.error("Error fetching employees:", empError);
      throw empError;
    }

    console.log("Organization employees found:", orgEmployees?.length || 0);

    const userIds = orgEmployees?.map(e => e.user_id).filter(Boolean) || [];
    
    if (userIds.length === 0) {
      console.log("No active employees found in organization");
      return new Response(JSON.stringify({ success: true, message: "No active employees" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", userIds)
      .in("role", roles);

    if (rolesError) {
      console.error("Error fetching user roles:", rolesError);
      throw rolesError;
    }

    console.log("User roles found:", userRoles?.length || 0);

    const roleUserIds = new Set(userRoles?.map(r => r.user_id) || []);
    const recipients = orgEmployees?.filter(e => roleUserIds.has(e.user_id)) || [];

    console.log("Final recipients count:", recipients.length);

    if (recipients.length === 0) {
      console.log("No recipients found with required roles");
      return new Response(JSON.stringify({ success: true, message: "No recipients with required roles" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate email HTML
    const periodLabel = schedule?.frequency === "monthly" ? "Monthly" : "Weekly";
    const dateRangeText = `${new Date(startDateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(endDateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

    let successCount = 0;
    let failCount = 0;

    for (const recipient of recipients) {
      const profile = recipient.profiles as any;
      if (!profile?.email) {
        console.log("Skipping recipient without email:", recipient.id);
        continue;
      }

      const firstName = profile.full_name?.split(" ")[0] || "Team";
      console.log(`Sending email to: ${profile.email} (${firstName})`);

      const emailHtml = generateEmailHtml({
        recipientName: firstName,
        orgName: org.name,
        orgLogo: org.logo_url,
        periodLabel,
        dateRangeText,
        metrics,
        aiSummary,
        includeCharts,
        lateEmployees: lateEmployees.slice(0, 3),
        perfectAttendance: perfectAttendance.slice(0, 3),
        orgCode: org.slug,
        dailyData,
        avgDaily,
        peakDay,
        lowDay,
      });

      try {
        const emailResult = await resend.emails.send({
          from: `GlobalyOS <onboarding@resend.dev>`,
          to: [profile.email],
          subject: `${periodLabel} Attendance Report - ${dateRangeText}`,
          html: emailHtml,
        });
        console.log(`Email sent successfully to ${profile.email}:`, emailResult);
        successCount++;
      } catch (emailError: any) {
        console.error(`Failed to send email to ${profile.email}:`, emailError?.message || emailError);
        failCount++;
      }
    }

    console.log(`=== Report complete: ${successCount} sent, ${failCount} failed ===`);

    return new Response(JSON.stringify({ 
      success: true, 
      recipientCount: recipients.length,
      successCount,
      failCount
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("=== Error in send-attendance-report ===");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateEmailHtml(params: {
  recipientName: string;
  orgName: string;
  orgLogo: string | null;
  periodLabel: string;
  dateRangeText: string;
  metrics: AttendanceMetrics;
  aiSummary: string;
  includeCharts: boolean;
  lateEmployees: string[];
  perfectAttendance: string[];
  orgCode: string;
  dailyData: DailyData[];
  avgDaily: number;
  peakDay: DailyData;
  lowDay: DailyData;
}) {
  const {
    recipientName,
    orgName,
    orgLogo,
    periodLabel,
    dateRangeText,
    metrics,
    aiSummary,
    includeCharts,
    lateEmployees,
    perfectAttendance,
    orgCode,
    dailyData,
    avgDaily,
    peakDay,
    lowDay,
  } = params;

  const needsAttentionHtml = lateEmployees.length > 0 
    ? `<p style="color: #dc2626; margin: 8px 0 0 0; font-size: 13px;"><strong>⚠️ Needs Attention:</strong> ${lateEmployees.map(n => n.split(" ")[0]).join(", ")} - multiple late arrivals</p>`
    : "";

  const recognitionHtml = perfectAttendance.length > 0
    ? `<p style="color: #16a34a; margin: 8px 0 0 0; font-size: 13px;"><strong>🌟 Recognition:</strong> ${perfectAttendance.map(n => n.split(" ")[0]).join(", ")} - excellent attendance</p>`
    : "";

  // Generate trend chart bars
  const maxTotal = Math.max(...dailyData.map(d => d.total), 1);
  const trendBarsHtml = dailyData.slice(-7).map(d => {
    const totalHeight = Math.round((d.total / maxTotal) * 60);
    const onTimeHeight = Math.round((d.onTime / maxTotal) * 60);
    const dateLabel = new Date(d.date).toLocaleDateString("en-US", { weekday: "short" });
    return `
      <td style="vertical-align: bottom; padding: 0 4px; text-align: center;">
        <div style="position: relative; height: 60px; display: flex; flex-direction: column; justify-content: flex-end;">
          <div style="background: #3b82f6; height: ${totalHeight}px; border-radius: 3px 3px 0 0; position: relative;">
            <div style="background: #22c55e; height: ${onTimeHeight}px; border-radius: 3px 3px 0 0; position: absolute; bottom: 0; left: 0; right: 0;"></div>
          </div>
        </div>
        <div style="font-size: 9px; color: #6b7280; margin-top: 4px;">${dateLabel}</div>
      </td>
    `;
  }).join("");

  const trendChangePercent = metrics.netHours.change;
  const trendArrow = trendChangePercent >= 0 ? "▲" : "▼";
  const trendColor = trendChangePercent >= 0 ? "#22c55e" : "#ef4444";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 20px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                ${orgLogo 
                  ? `<img src="${orgLogo}" alt="${orgName}" style="max-height: 36px; max-width: 140px;" />`
                  : `<span style="color: white; font-size: 18px; font-weight: bold;">${orgName}</span>`
                }
              </td>
              <td style="text-align: right;">
                <img src="https://rygowmzkvxgnxagqlyxf.supabase.co/storage/v1/object/public/organization-logos/globalyos-icon.png" alt="GlobalyOS" style="height: 36px; width: auto;" />
              </td>
            </tr>
          </table>
        </div>

        <!-- Content -->
        <div style="padding: 24px;">
          <p style="color: #333; font-size: 16px; margin: 0 0 8px 0;">Hi ${recipientName},</p>
          <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;">
            Here's your <strong>${periodLabel}</strong> attendance summary for <strong>${dateRangeText}</strong>:
          </p>

          <!-- AI Summary - Clean styling -->
          ${aiSummary ? `
            <div style="margin-bottom: 24px; line-height: 1.6;">
              <p style="color: #374151; font-size: 14px; margin: 0;">${aiSummary}</p>
              ${needsAttentionHtml}
              ${recognitionHtml}
            </div>
          ` : ""}

          <!-- 8 Metric Cards - Row 1 -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
            <tr>
              <!-- Total Records -->
              <td width="25%" style="padding: 4px;">
                <div style="background: #eff6ff; border-radius: 8px; padding: 12px; text-align: center;">
                  <div style="font-size: 14px; margin-bottom: 4px;">📋</div>
                  <div style="font-size: 22px; font-weight: bold; color: #1e40af;">${metrics.totalRecords}</div>
                  <div style="font-size: 11px; color: #374151; font-weight: 500;">Total Records</div>
                  <div style="font-size: 9px; color: #6b7280; margin-top: 2px;">${metrics.missing} missing · ${metrics.onLeave} on leave</div>
                </div>
              </td>
              <!-- Late Arrivals -->
              <td width="25%" style="padding: 4px;">
                <div style="background: #fffbeb; border-radius: 8px; padding: 12px; text-align: center;">
                  <div style="font-size: 14px; margin-bottom: 4px;">🕐</div>
                  <div style="font-size: 22px; font-weight: bold; color: #b45309;">${metrics.lateArrivals.count}${getTrendIndicator(metrics.lateArrivals.change)}</div>
                  <div style="font-size: 11px; color: #374151; font-weight: 500;">Late Arrivals</div>
                  <div style="font-size: 9px; color: #6b7280; margin-top: 2px;">${formatMinutes(metrics.lateArrivals.totalMinutes)} total</div>
                </div>
              </td>
              <!-- Early Checkouts -->
              <td width="25%" style="padding: 4px;">
                <div style="background: #fef2f2; border-radius: 8px; padding: 12px; text-align: center;">
                  <div style="font-size: 14px; margin-bottom: 4px;">↗️</div>
                  <div style="font-size: 22px; font-weight: bold; color: #dc2626;">${metrics.earlyCheckouts.count}${getTrendIndicator(metrics.earlyCheckouts.change)}</div>
                  <div style="font-size: 11px; color: #374151; font-weight: 500;">Early Checkouts</div>
                  <div style="font-size: 9px; color: #6b7280; margin-top: 2px;">${formatMinutes(metrics.earlyCheckouts.totalMinutes)} total</div>
                </div>
              </td>
              <!-- On Time -->
              <td width="25%" style="padding: 4px;">
                <div style="background: #f0fdf4; border-radius: 8px; padding: 12px; text-align: center;">
                  <div style="font-size: 14px; margin-bottom: 4px;">✓</div>
                  <div style="font-size: 22px; font-weight: bold; color: #166534;">${metrics.onTime.count}${getTrendIndicator(metrics.onTime.change)}</div>
                  <div style="font-size: 11px; color: #374151; font-weight: 500;">On Time</div>
                  <div style="font-size: 9px; color: #6b7280; margin-top: 2px;">${metrics.onTime.percent}% of check-ins</div>
                </div>
              </td>
            </tr>
          </table>

          <!-- 8 Metric Cards - Row 2 -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
            <tr>
              <!-- Below Time -->
              <td width="25%" style="padding: 4px;">
                <div style="background: #fff7ed; border-radius: 8px; padding: 12px; text-align: center;">
                  <div style="font-size: 14px; margin-bottom: 4px;">⏱️</div>
                  <div style="font-size: 22px; font-weight: bold; color: #c2410c;">${metrics.belowTime.count}${getTrendIndicator(metrics.belowTime.change)}</div>
                  <div style="font-size: 11px; color: #374151; font-weight: 500;">Below Time</div>
                  <div style="font-size: 9px; color: #6b7280; margin-top: 2px;">${formatMinutes(metrics.belowTime.totalMinutes)} deficit</div>
                </div>
              </td>
              <!-- Over Time -->
              <td width="25%" style="padding: 4px;">
                <div style="background: #eff6ff; border-radius: 8px; padding: 12px; text-align: center;">
                  <div style="font-size: 14px; margin-bottom: 4px;">📈</div>
                  <div style="font-size: 22px; font-weight: bold; color: #1e40af;">${metrics.overTime.count}${getTrendIndicator(metrics.overTime.change)}</div>
                  <div style="font-size: 11px; color: #374151; font-weight: 500;">Over Time</div>
                  <div style="font-size: 9px; color: #6b7280; margin-top: 2px;">${formatMinutes(metrics.overTime.totalMinutes)} extra</div>
                </div>
              </td>
              <!-- Net Hours -->
              <td width="25%" style="padding: 4px;">
                <div style="background: #eef2ff; border-radius: 8px; padding: 12px; text-align: center;">
                  <div style="font-size: 14px; margin-bottom: 4px;">⏱️</div>
                  <div style="font-size: 22px; font-weight: bold; color: #4338ca;">${formatMinutes(metrics.netHours.totalMinutes)}${getTrendIndicator(metrics.netHours.change)}</div>
                  <div style="font-size: 11px; color: #374151; font-weight: 500;">Net Hours</div>
                  <div style="font-size: 9px; color: #6b7280; margin-top: 2px;">avg ${formatMinutes(metrics.netHours.avgMinutesPerPerson)}/person</div>
                </div>
              </td>
              <!-- WFH -->
              <td width="25%" style="padding: 4px;">
                <div style="background: #faf5ff; border-radius: 8px; padding: 12px; text-align: center;">
                  <div style="font-size: 14px; margin-bottom: 4px;">🏠</div>
                  <div style="font-size: 22px; font-weight: bold; color: #7c3aed;">${metrics.wfh.count}</div>
                  <div style="font-size: 11px; color: #374151; font-weight: 500;">WFH</div>
                  <div style="font-size: 9px; color: #6b7280; margin-top: 2px;">${metrics.wfh.percent}% of check-ins</div>
                </div>
              </td>
            </tr>
          </table>

          <!-- Attendance Trends -->
          ${includeCharts && dailyData.length > 0 ? `
            <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="font-weight: 600; color: #374151; font-size: 14px;">📊 Attendance Trends</span>
                <span style="background: #e0e7ff; color: #3730a3; font-size: 10px; padding: 2px 8px; border-radius: 9999px;">${periodLabel}</span>
              </div>
              
              <!-- Summary Stats -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                <tr>
                  <td width="25%" style="padding: 4px;">
                    <div style="background: #ffffff; border-radius: 6px; padding: 8px; text-align: center;">
                      <div style="font-size: 9px; color: #6b7280;">Avg Daily</div>
                      <div style="font-size: 16px; font-weight: bold; color: #374151;">${avgDaily}</div>
                    </div>
                  </td>
                  <td width="25%" style="padding: 4px;">
                    <div style="background: #ffffff; border-radius: 6px; padding: 8px; text-align: center;">
                      <div style="font-size: 9px; color: #6b7280;">Peak</div>
                      <div style="font-size: 16px; font-weight: bold; color: #374151;">${peakDay.total}</div>
                    </div>
                  </td>
                  <td width="25%" style="padding: 4px;">
                    <div style="background: #ffffff; border-radius: 6px; padding: 8px; text-align: center;">
                      <div style="font-size: 9px; color: #6b7280;">Low</div>
                      <div style="font-size: 16px; font-weight: bold; color: #374151;">${lowDay.total || 0}</div>
                    </div>
                  </td>
                  <td width="25%" style="padding: 4px;">
                    <div style="background: #ffffff; border-radius: 6px; padding: 8px; text-align: center;">
                      <div style="font-size: 9px; color: #6b7280;">Trend</div>
                      <div style="font-size: 16px; font-weight: bold; color: ${trendColor};">${trendArrow} ${Math.abs(trendChangePercent)}%</div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Chart -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  ${trendBarsHtml}
                </tr>
              </table>
              
              <!-- Legend -->
              <div style="display: flex; justify-content: center; gap: 16px; margin-top: 12px; font-size: 10px;">
                <span style="color: #6b7280;"><span style="display: inline-block; width: 10px; height: 10px; background: #3b82f6; border-radius: 2px; margin-right: 4px;"></span>Total</span>
                <span style="color: #6b7280;"><span style="display: inline-block; width: 10px; height: 10px; background: #22c55e; border-radius: 2px; margin-right: 4px;"></span>On Time</span>
              </div>
            </div>
          ` : ""}

          <!-- CTA Button -->
          <div style="text-align: center; margin-top: 24px;">
            <a href="https://globalyos.com/org/${orgCode}/attendance-history" 
               style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              View Full Report in GlobalyOS
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            GlobalyOS - Operating System for Ambitious Teams
          </p>
          <p style="color: #cbd5e1; font-size: 11px; margin: 4px 0 0 0;">
            You're receiving this because you're set as a recipient for attendance reports.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
