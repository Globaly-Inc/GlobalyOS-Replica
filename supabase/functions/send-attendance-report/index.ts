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
  onTime: number;
  lateArrivals: number;
  earlyDepartures: number;
  avgNetHours: number;
  wfhCount: number;
  attendanceRate: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organizationId, isTest, includeAISummary, includeCharts } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Fetch organization details
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, logo_url, org_code")
      .eq("id", organizationId)
      .single();

    if (orgError || !org) {
      throw new Error("Organization not found");
    }

    // Get schedule settings
    const { data: schedule } = await supabase
      .from("attendance_report_schedules")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();

    // Calculate date range (last 7 days for weekly, last 30 for monthly)
    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - (schedule?.frequency === "monthly" ? 30 : 7));
    startDate.setHours(0, 0, 0, 0);

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    // Fetch attendance records
    const { data: records, error: recordsError } = await supabase
      .from("attendance_records")
      .select(`
        *,
        employee:employees!attendance_records_employee_id_fkey(
          id,
          profiles!inner(full_name, avatar_url),
          employee_schedules(work_start_time, work_end_time, late_threshold_minutes)
        )
      `)
      .eq("organization_id", organizationId)
      .gte("date", startDateStr)
      .lte("date", endDateStr);

    if (recordsError) throw recordsError;

    // Fetch active employees count
    const { count: activeEmployeeCount } = await supabase
      .from("employees")
      .select("id", { count: "exact" })
      .eq("organization_id", organizationId)
      .eq("status", "active");

    // Calculate metrics
    const metrics: AttendanceMetrics = {
      totalRecords: records?.length || 0,
      onTime: 0,
      lateArrivals: 0,
      earlyDepartures: 0,
      avgNetHours: 0,
      wfhCount: 0,
      attendanceRate: 0,
    };

    let totalHours = 0;
    const lateEmployees: string[] = [];
    const earlyDepartureEmployees: string[] = [];
    const perfectAttendance: string[] = [];
    const employeeRecordCount: Record<string, number> = {};

    records?.forEach((record: any) => {
      const schedule = record.employee?.employee_schedules?.[0];
      const employeeName = record.employee?.profiles?.full_name || "Unknown";

      // Track employee record counts
      employeeRecordCount[employeeName] = (employeeRecordCount[employeeName] || 0) + 1;

      // WFH count
      if (record.status === "remote") {
        metrics.wfhCount++;
      }

      // Work hours
      if (record.work_hours) {
        totalHours += record.work_hours;
      }

      // Late arrivals
      if (record.check_in_time && schedule?.work_start_time) {
        const checkInTime = new Date(record.check_in_time);
        const [startH, startM] = schedule.work_start_time.split(":").map(Number);
        const threshold = schedule.late_threshold_minutes || 0;
        const expectedStart = new Date(checkInTime);
        expectedStart.setHours(startH, startM + threshold, 0, 0);

        if (checkInTime > expectedStart) {
          metrics.lateArrivals++;
          if (!lateEmployees.includes(employeeName)) {
            lateEmployees.push(employeeName);
          }
        } else {
          metrics.onTime++;
        }
      }

      // Early departures
      if (record.check_out_time && schedule?.work_end_time) {
        const checkOutTime = new Date(record.check_out_time);
        const [endH, endM] = schedule.work_end_time.split(":").map(Number);
        const expectedEnd = new Date(checkOutTime);
        expectedEnd.setHours(endH, endM, 0, 0);

        if (checkOutTime < expectedEnd) {
          metrics.earlyDepartures++;
          if (!earlyDepartureEmployees.includes(employeeName)) {
            earlyDepartureEmployees.push(employeeName);
          }
        }
      }
    });

    metrics.avgNetHours = metrics.totalRecords > 0 ? totalHours / metrics.totalRecords : 0;
    
    const expectedDays = (schedule?.frequency === "monthly" ? 30 : 7);
    metrics.attendanceRate = activeEmployeeCount && activeEmployeeCount > 0 
      ? Math.round((metrics.totalRecords / (activeEmployeeCount * expectedDays)) * 100)
      : 0;

    // Find perfect attendance employees
    Object.entries(employeeRecordCount).forEach(([name, count]) => {
      if (count >= expectedDays - 2 && !lateEmployees.includes(name)) {
        perfectAttendance.push(name);
      }
    });

    // Generate AI summary
    let aiSummary = "";
    if (includeAISummary && LOVABLE_API_KEY) {
      try {
        const summaryPrompt = `Generate a brief, friendly attendance summary for ${org.name}. 
Period: ${startDateStr} to ${endDateStr}
Metrics: ${metrics.totalRecords} total records, ${metrics.onTime} on-time, ${metrics.lateArrivals} late arrivals, ${metrics.earlyDepartures} early departures, ${metrics.wfhCount} WFH days, ${metrics.avgNetHours.toFixed(1)}h average.
Late employees: ${lateEmployees.slice(0, 3).join(", ") || "None"}
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
        }
      } catch (aiError) {
        console.error("AI summary generation failed:", aiError);
        aiSummary = `Your team had ${metrics.totalRecords} attendance records this period with ${metrics.attendanceRate}% attendance rate.`;
      }
    }

    // Get recipients
    const recipientRoles = schedule?.recipients || { owner: true, admin: true, hr: true };
    const roles = [];
    if (recipientRoles.owner) roles.push("owner");
    if (recipientRoles.admin) roles.push("admin");
    if (recipientRoles.hr) roles.push("hr");

    const { data: recipients } = await supabase
      .from("user_roles")
      .select(`
        user_id,
        role,
        profiles:user_id(full_name, email)
      `)
      .in("role", roles)
      .eq("organization_id", organizationId);

    if (!recipients || recipients.length === 0) {
      console.log("No recipients found for report");
      return new Response(JSON.stringify({ success: true, message: "No recipients" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate email HTML
    const periodLabel = schedule?.frequency === "monthly" ? "Monthly" : "Weekly";
    const dateRangeText = `${new Date(startDateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(endDateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

    for (const recipient of recipients) {
      const profile = recipient.profiles as any;
      if (!profile?.email) continue;

      const firstName = profile.full_name?.split(" ")[0] || "Team";

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
        orgCode: org.org_code,
      });

      try {
        await resend.emails.send({
          from: `${org.name} <reports@globalyos.com>`,
          to: [profile.email],
          subject: `${periodLabel} Attendance Report - ${dateRangeText}`,
          html: emailHtml,
        });
        console.log(`Report sent to ${profile.email}`);
      } catch (emailError) {
        console.error(`Failed to send to ${profile.email}:`, emailError);
      }
    }

    return new Response(JSON.stringify({ success: true, recipientCount: recipients.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-attendance-report:", error);
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
}) {
  const {
    recipientName,
    orgName,
    orgLogo,
    periodLabel,
    dateRangeText,
    metrics,
    aiSummary,
    lateEmployees,
    perfectAttendance,
    orgCode,
  } = params;

  const needsAttentionHtml = lateEmployees.length > 0 
    ? `<div style="margin-top: 12px;">
        <p style="color: #dc2626; font-weight: 600; margin: 0 0 4px 0;">⚠️ Needs Attention:</p>
        <p style="color: #666; margin: 0;">${lateEmployees.map(n => `• ${n} - multiple late arrivals`).join('<br>')}</p>
      </div>`
    : "";

  const recognitionHtml = perfectAttendance.length > 0
    ? `<div style="margin-top: 12px;">
        <p style="color: #16a34a; font-weight: 600; margin: 0 0 4px 0;">🌟 Recognition:</p>
        <p style="color: #666; margin: 0;">${perfectAttendance.map(n => `• ${n} - excellent attendance`).join('<br>')}</p>
      </div>`
    : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 24px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            ${orgLogo 
              ? `<img src="${orgLogo}" alt="${orgName}" style="max-height: 40px; max-width: 150px;" />`
              : `<span style="color: white; font-size: 20px; font-weight: bold;">${orgName}</span>`
            }
          </div>
          <div style="text-align: right;">
            <span style="color: rgba(255,255,255,0.8); font-size: 12px;">Powered by</span>
            <div style="color: white; font-weight: 600;">GlobalyOS</div>
          </div>
        </div>

        <!-- Content -->
        <div style="padding: 24px;">
          <p style="color: #333; font-size: 16px; margin: 0 0 8px 0;">Hi ${recipientName},</p>
          <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;">
            Here's your <strong>${periodLabel}</strong> attendance summary for <strong>${dateRangeText}</strong>:
          </p>

          <!-- AI Summary -->
          ${aiSummary ? `
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="font-size: 16px;">🤖</span>
                <span style="font-weight: 600; color: #92400e;">AI Summary</span>
              </div>
              <p style="color: #78350f; margin: 0; font-size: 14px; line-height: 1.5;">${aiSummary}</p>
              ${needsAttentionHtml}
              ${recognitionHtml}
            </div>
          ` : ""}

          <!-- Metrics Cards -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
            <tr>
              <td width="25%" style="padding: 6px;">
                <div style="background: #eff6ff; border-radius: 8px; padding: 12px; text-align: center; border-left: 4px solid #3b82f6;">
                  <div style="font-size: 24px; font-weight: bold; color: #1e40af;">${metrics.totalRecords}</div>
                  <div style="font-size: 11px; color: #6b7280;">Total</div>
                </div>
              </td>
              <td width="25%" style="padding: 6px;">
                <div style="background: #f0fdf4; border-radius: 8px; padding: 12px; text-align: center; border-left: 4px solid #22c55e;">
                  <div style="font-size: 24px; font-weight: bold; color: #166534;">${metrics.onTime}</div>
                  <div style="font-size: 11px; color: #6b7280;">On Time</div>
                </div>
              </td>
              <td width="25%" style="padding: 6px;">
                <div style="background: #fffbeb; border-radius: 8px; padding: 12px; text-align: center; border-left: 4px solid #f59e0b;">
                  <div style="font-size: 24px; font-weight: bold; color: #b45309;">${metrics.lateArrivals}</div>
                  <div style="font-size: 11px; color: #6b7280;">Late</div>
                </div>
              </td>
              <td width="25%" style="padding: 6px;">
                <div style="background: #fef2f2; border-radius: 8px; padding: 12px; text-align: center; border-left: 4px solid #ef4444;">
                  <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${metrics.earlyDepartures}</div>
                  <div style="font-size: 11px; color: #6b7280;">Early</div>
                </div>
              </td>
            </tr>
            <tr>
              <td width="25%" style="padding: 6px;">
                <div style="background: #f5f3ff; border-radius: 8px; padding: 12px; text-align: center; border-left: 4px solid #8b5cf6;">
                  <div style="font-size: 24px; font-weight: bold; color: #6d28d9;">${metrics.wfhCount}</div>
                  <div style="font-size: 11px; color: #6b7280;">WFH</div>
                </div>
              </td>
              <td width="25%" style="padding: 6px;">
                <div style="background: #f8fafc; border-radius: 8px; padding: 12px; text-align: center; border-left: 4px solid #64748b;">
                  <div style="font-size: 24px; font-weight: bold; color: #334155;">${metrics.avgNetHours.toFixed(1)}h</div>
                  <div style="font-size: 11px; color: #6b7280;">Avg Hours</div>
                </div>
              </td>
              <td width="50%" colspan="2" style="padding: 6px;">
                <div style="background: #ecfdf5; border-radius: 8px; padding: 12px; text-align: center; border-left: 4px solid #10b981;">
                  <div style="font-size: 24px; font-weight: bold; color: #059669;">${metrics.attendanceRate}%</div>
                  <div style="font-size: 11px; color: #6b7280;">Attendance Rate</div>
                </div>
              </td>
            </tr>
          </table>

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
            GlobalyOS - HRMS & Social Intranet
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
