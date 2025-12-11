import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Rate limiting constants
const MAX_DECISIONS_PER_IP_PER_HOUR = 30;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeaveDecisionRequest {
  request_id: string;
  decision: "approved" | "rejected";
  reviewer_name: string;
}

const getLeaveTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    vacation: "Vacation",
    sick: "Sick Leave",
    pto: "PTO",
    unpaid: "Unpaid Leave",
  };
  return labels[type] || type;
};

// Get client IP from request headers
function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         req.headers.get('x-real-ip') ||
         req.headers.get('cf-connecting-ip') ||
         'unknown';
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = getClientIP(req);
  console.log('Leave decision notification request from IP:', clientIP);

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // IP-based rate limiting using login_attempts table
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: ipRequestCount } = await supabaseClient
      .from('login_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', clientIP)
      .eq('attempt_type', 'leave_decision')
      .gte('created_at', oneHourAgo);

    if (ipRequestCount !== null && ipRequestCount >= MAX_DECISIONS_PER_IP_PER_HOUR) {
      console.log(`Rate limit exceeded for IP ${clientIP}: ${ipRequestCount} requests`);
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { request_id, decision, reviewer_name }: LeaveDecisionRequest = await req.json();

    console.log(`Processing leave decision notification - Request: ${request_id}, Decision: ${decision}`);

    // Log the decision notification attempt
    await supabaseClient.from('login_attempts').insert({
      email: request_id,
      ip_address: clientIP,
      attempt_type: 'leave_decision',
      success: true,
    });

    // Get the leave request details with employee info
    const { data: leaveRequest, error: reqError } = await supabaseClient
      .from("leave_requests")
      .select(`
        leave_type,
        start_date,
        end_date,
        days_count,
        reason,
        employee:employees!leave_requests_employee_id_fkey(
          user_id,
          profiles:profiles!employees_user_id_fkey(
            email,
            full_name
          )
        )
      `)
      .eq("id", request_id)
      .single();

    if (reqError || !leaveRequest) {
      console.error("Error fetching leave request:", reqError);
      return new Response(
        JSON.stringify({ error: "Leave request not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const employee = leaveRequest.employee as any;
    const profile = employee?.profiles;

    if (!profile?.email) {
      console.log("No email found for employee");
      return new Response(
        JSON.stringify({ success: true, message: "No email to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const isApproved = decision === "approved";
    const statusEmoji = isApproved ? "✅" : "❌";
    const statusText = isApproved ? "Approved" : "Rejected";
    const statusColor = isApproved ? "#10b981" : "#ef4444";
    const headerGradient = isApproved 
      ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
      : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${headerGradient}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .status-badge { display: inline-block; background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600; }
          .detail { margin: 10px 0; }
          .label { font-weight: 600; color: #6b7280; }
          .value { color: #111827; }
          .highlight { background: ${isApproved ? '#d1fae5' : '#fee2e2'}; padding: 12px; border-radius: 6px; margin: 16px 0; border-left: 4px solid ${statusColor}; }
          .footer { margin-top: 20px; font-size: 12px; color: #9ca3af; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">${statusEmoji} Leave Request ${statusText}</h2>
          </div>
          <div class="content">
            <p>Hi ${profile.full_name},</p>
            <p>Your leave request has been <span class="status-badge">${statusText}</span> by <strong>${reviewer_name}</strong>.</p>
            
            <div class="highlight">
              <div class="detail">
                <span class="label">Leave Type:</span>
                <span class="value">${getLeaveTypeLabel(leaveRequest.leave_type)}</span>
              </div>
              <div class="detail">
                <span class="label">Duration:</span>
                <span class="value">${leaveRequest.start_date} to ${leaveRequest.end_date} (${leaveRequest.days_count} ${leaveRequest.days_count === 1 ? 'day' : 'days'})</span>
              </div>
              ${leaveRequest.reason ? `
              <div class="detail">
                <span class="label">Reason:</span>
                <span class="value">${leaveRequest.reason}</span>
              </div>
              ` : ''}
            </div>
            
            ${isApproved 
              ? '<p>Your time off has been confirmed. Enjoy your leave!</p>'
              : '<p>If you have questions about this decision, please reach out to your manager or HR.</p>'
            }
            
            <a href="https://people.globalyhub.com" class="button">View Details</a>
            
            <div class="footer">
              <p>This is an automated notification from GlobalyHub People.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const response = await resend.emails.send({
        from: "GlobalyHub People <hello@globalyhub.com>",
        to: [profile.email],
        subject: `Leave Request ${statusText}: ${getLeaveTypeLabel(leaveRequest.leave_type)} (${leaveRequest.start_date} - ${leaveRequest.end_date})`,
        html: htmlContent,
      });
      console.log(`Email sent to ${profile.email}:`, response);
      
      return new Response(
        JSON.stringify({ success: true, email: profile.email }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error(`Failed to send email to ${profile.email}:`, err);
      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  } catch (error: any) {
    console.error("Error in notify-leave-decision:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
