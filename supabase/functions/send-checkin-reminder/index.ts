import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Stable logo URL from Supabase Storage
const GLOBALYOS_LOGO_URL = 'https://rygowmzkvxgnxagqlyxf.supabase.co/storage/v1/object/public/system-assets//GlobalyOS%20Blue%20BG%20Icon.png';
const APP_URL = 'https://www.globalyos.com';

interface ReminderPayload {
  employee_id: string;
  organization_id: string;
  sender_employee_id: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const logoUrl = GLOBALYOS_LOGO_URL;

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { employee_id, organization_id, sender_employee_id }: ReminderPayload = await req.json();

    console.log(`Check-in reminder request for employee ${employee_id} from sender ${sender_employee_id}`);

    // Get employee details
    const { data: employee, error: empError } = await supabaseClient
      .from("employees")
      .select(`
        id,
        user_id,
        position,
        profiles:profiles!inner(full_name, email),
        employee_schedules(work_start_time)
      `)
      .eq("id", employee_id)
      .eq("organization_id", organization_id)
      .single();

    if (empError || !employee) {
      console.error("Error fetching employee:", empError);
      return new Response(
        JSON.stringify({ error: "Employee not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get sender details
    const { data: sender } = await supabaseClient
      .from("employees")
      .select("profiles:profiles!inner(full_name)")
      .eq("id", sender_employee_id)
      .single();

    // Get organization details
    const { data: org } = await supabaseClient
      .from("organizations")
      .select("name")
      .eq("id", organization_id)
      .single();

    // Handle profiles as array or single object
    const employeeProfile = Array.isArray(employee.profiles) ? employee.profiles[0] : employee.profiles;
    const senderProfile = Array.isArray(sender?.profiles) ? sender?.profiles[0] : sender?.profiles;
    
    const employeeName = employeeProfile?.full_name || "Team Member";
    const employeeEmail = employeeProfile?.email;
    const senderName = senderProfile?.full_name || "Your Team";
    const orgName = org?.name || "Your Organization";
    const scheduleData = employee.employee_schedules;
    const schedule = Array.isArray(scheduleData) ? scheduleData[0] : scheduleData;
    const expectedTime = schedule?.work_start_time || "9:00 AM";

    // Check if reminder already sent today
    const today = new Date().toISOString().split("T")[0];
    const { data: existingReminder } = await supabaseClient
      .from("attendance_reminders")
      .select("id")
      .eq("employee_id", employee_id)
      .eq("reminder_date", today)
      .eq("reminder_type", "checkin")
      .single();

    if (existingReminder) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Reminder already sent today",
          already_sent: true 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record the reminder
    const { error: reminderError } = await supabaseClient
      .from("attendance_reminders")
      .insert({
        organization_id,
        employee_id,
        sent_by_employee_id: sender_employee_id,
        reminder_type: "checkin",
      });

    if (reminderError) {
      console.error("Error recording reminder:", reminderError);
    }

    // Create in-app notification
    const { error: notifError } = await supabaseClient
      .from("notifications")
      .insert({
        user_id: employee.user_id,
        organization_id,
        type: "checkin_reminder",
        title: "Check-in Reminder",
        message: `${senderName} sent you a friendly reminder to check in. Your expected start time was ${expectedTime}.`,
        link: "/",
      });

    if (notifError) {
      console.error("Error creating notification:", notifError);
    }

    // Send email if we have the email and Resend API key
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const appBaseUrl = APP_URL;
    
    if (employeeEmail && resendApiKey) {
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 32px; text-align: center;">
      <img src="${logoUrl}" alt="GlobalyOS" style="width: 48px; height: 48px; border-radius: 12px; margin-bottom: 12px;" />
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Check-in Reminder</h1>
    </div>
    <div style="padding: 32px;">
      <p style="font-size: 16px; color: #374151; margin: 0 0 16px;">Hi ${employeeName},</p>
      <p style="font-size: 16px; color: #374151; margin: 0 0 16px;">
        ${senderName} noticed you haven't checked in today and wanted to send you a friendly reminder.
      </p>
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin: 24px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>Expected start time:</strong> ${expectedTime}
        </p>
      </div>
      <p style="font-size: 16px; color: #374151; margin: 24px 0;">
        Please check in at your earliest convenience.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${appBaseUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Check In Now
        </a>
      </div>
      <p style="font-size: 14px; color: #6b7280; margin: 24px 0 0;">
        Best regards,<br>
        ${orgName} Team
      </p>
    </div>
    <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 12px; color: #9ca3af; margin: 0;">
        This is an automated message from ${orgName} via GlobalyOS
      </p>
    </div>
  </div>
</body>
</html>
      `;

      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `${orgName} <notifications@globalyos.com>`,
            to: [employeeEmail],
            subject: `Friendly Reminder: Please Check In - ${orgName}`,
            html: emailHtml,
          }),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error("Error sending email:", errorText);
        } else {
          console.log(`Email sent successfully to ${employeeEmail}`);
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }
    }

    // Trigger push notification
    try {
      const pushResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push-notification`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: employee.user_id,
            title: "Check-in Reminder",
            body: `${senderName} sent you a reminder to check in`,
            url: "/",
            tag: "checkin-reminder",
          }),
        }
      );

      if (!pushResponse.ok) {
        console.error("Error sending push notification:", await pushResponse.text());
      }
    } catch (pushError) {
      console.error("Error sending push notification:", pushError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Reminder sent successfully",
        email_sent: !!employeeEmail && !!resendApiKey
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-checkin-reminder:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
