import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeaveNotificationRequest {
  employee_id: string;
  employee_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_count: number;
  reason?: string;
  organization_id: string;
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

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const {
      employee_id,
      employee_name,
      leave_type,
      start_date,
      end_date,
      days_count,
      reason,
      organization_id,
    }: LeaveNotificationRequest = await req.json();

    console.log("Processing leave notification for:", employee_name);

    // Get the employee's manager_id
    const { data: employee, error: empError } = await supabaseClient
      .from("employees")
      .select("manager_id")
      .eq("id", employee_id)
      .single();

    if (empError) {
      console.error("Error fetching employee:", empError);
    }

    // Get HR users in the organization
    const { data: hrUsers, error: hrError } = await supabaseClient
      .from("user_roles")
      .select("user_id")
      .eq("organization_id", organization_id)
      .in("role", ["hr", "admin"]);

    if (hrError) {
      console.error("Error fetching HR users:", hrError);
    }

    const recipients: { email: string; name: string; isManager: boolean }[] = [];

    // Add manager if exists - fetch manager details separately
    if (employee?.manager_id) {
      // Get manager's user_id from employees table
      const { data: manager, error: mgrError } = await supabaseClient
        .from("employees")
        .select("user_id")
        .eq("id", employee.manager_id)
        .single();
      
      if (mgrError) {
        console.error("Error fetching manager:", mgrError);
      }
      
      if (manager?.user_id) {
        const { data: managerProfile } = await supabaseClient
          .from("profiles")
          .select("email, full_name")
          .eq("id", manager.user_id)
          .single();
        
        if (managerProfile) {
          recipients.push({
            email: managerProfile.email,
            name: managerProfile.full_name,
            isManager: true,
          });
          console.log("Adding manager to recipients:", managerProfile.email);
        }
      }
    }

    // Add HR users (avoid duplicates)
    if (hrUsers) {
      for (const hr of hrUsers) {
        const { data: hrProfile } = await supabaseClient
          .from("profiles")
          .select("email, full_name")
          .eq("id", hr.user_id)
          .single();
        
        if (hrProfile && !recipients.find(r => r.email === hrProfile.email)) {
          recipients.push({
            email: hrProfile.email,
            name: hrProfile.full_name,
            isManager: false,
          });
          console.log("Adding HR to recipients:", hrProfile.email);
        }
      }
    }

    if (recipients.length === 0) {
      console.log("No recipients found for notification");
      return new Response(
        JSON.stringify({ success: true, message: "No recipients to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send emails to all recipients
    const emailPromises = recipients.map(async (recipient) => {
      const roleText = recipient.isManager ? "direct report" : "team member";
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .detail { margin: 10px 0; }
            .label { font-weight: 600; color: #6b7280; }
            .value { color: #111827; }
            .highlight { background: #fef3c7; padding: 12px; border-radius: 6px; margin: 16px 0; }
            .footer { margin-top: 20px; font-size: 12px; color: #9ca3af; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">🗓️ New Leave Request</h2>
            </div>
            <div class="content">
              <p>Hi ${recipient.name},</p>
              <p>Your ${roleText} <strong>${employee_name}</strong> has submitted a leave request that requires your attention.</p>
              
              <div class="highlight">
                <div class="detail">
                  <span class="label">Leave Type:</span>
                  <span class="value">${getLeaveTypeLabel(leave_type)}</span>
                </div>
                <div class="detail">
                  <span class="label">Duration:</span>
                  <span class="value">${start_date} to ${end_date} (${days_count} ${days_count === 1 ? 'day' : 'days'})</span>
                </div>
                ${reason ? `
                <div class="detail">
                  <span class="label">Reason:</span>
                  <span class="value">${reason}</span>
                </div>
                ` : ''}
              </div>
              
              <p>Please review and respond to this request at your earliest convenience.</p>
              
              <a href="https://people.globalyhub.com" class="button">Review Request</a>
              
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
          to: [recipient.email],
          subject: `Leave Request: ${employee_name} - ${getLeaveTypeLabel(leave_type)}`,
          html: htmlContent,
        });
        console.log(`Email sent to ${recipient.email}:`, response);
        return { email: recipient.email, success: true };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error(`Failed to send email to ${recipient.email}:`, err);
        return { email: recipient.email, success: false, error: errorMessage };
      }
    });

    const results = await Promise.all(emailPromises);
    console.log("Email results:", results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in notify-leave-request:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
