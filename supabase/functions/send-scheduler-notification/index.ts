/**
 * send-scheduler-notification
 * Internal edge function — sends confirmation emails to host and invitee
 * Called internally by create-scheduler-booking
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function formatDateTime(isoStr: string, timezone = "UTC"): string {
  try {
    return new Date(isoStr).toLocaleString("en-US", {
      timeZone: timezone,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return new Date(isoStr).toUTCString();
  }
}

function locationText(locationType: string, locationValue: string | null): string {
  if (locationType === "google_meet") return "Google Meet (link to be added)";
  if (locationType === "phone") return locationValue || "Phone call";
  if (locationType === "in_person") return locationValue || "In person";
  return locationValue || locationType;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping email");
      return new Response(
        JSON.stringify({ success: true, message: "Email skipped — API key not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendModule = await import("https://esm.sh/resend@2.0.0");
    const resend = new resendModule.Resend(resendApiKey);

    const body = await req.json();
    const {
      org_name,
      org_slug,
      event_name,
      invitee_name,
      invitee_email,
      host_employee,
      start_at_utc,
      duration_minutes,
      location_type,
      location_value,
      cancel_link,
      reschedule_link,
    } = body;

    const formattedTime = formatDateTime(start_at_utc);
    const location = locationText(location_type, location_value);
    const hostName = host_employee
      ? `${host_employee.first_name} ${host_employee.last_name}`
      : org_name;
    const hostEmail = host_employee?.email;

    // ── Invitee confirmation email ──
    const inviteeHtml = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
          <div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #1a56db 0%, #0e4fc4 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">✅ You're scheduled!</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 15px;">${event_name}</p>
            </div>
            <div style="padding: 32px;">
              <p style="margin: 0 0 24px; color: #555;">Hi ${invitee_name},</p>
              <p style="margin: 0 0 24px; color: #555;">Your meeting with <strong>${hostName}</strong> has been confirmed. Here are the details:</p>
              
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
                <div style="display: flex; margin-bottom: 12px;">
                  <span style="color: #64748b; font-size: 13px; width: 80px; flex-shrink: 0;">📅 When</span>
                  <span style="font-weight: 600; color: #1e293b;">${formattedTime}</span>
                </div>
                <div style="display: flex; margin-bottom: 12px;">
                  <span style="color: #64748b; font-size: 13px; width: 80px; flex-shrink: 0;">⏱ Duration</span>
                  <span style="font-weight: 600; color: #1e293b;">${duration_minutes} minutes</span>
                </div>
                <div style="display: flex; margin-bottom: 12px;">
                  <span style="color: #64748b; font-size: 13px; width: 80px; flex-shrink: 0;">📍 Location</span>
                  <span style="font-weight: 600; color: #1e293b;">${location}</span>
                </div>
                <div style="display: flex;">
                  <span style="color: #64748b; font-size: 13px; width: 80px; flex-shrink: 0;">👤 Host</span>
                  <span style="font-weight: 600; color: #1e293b;">${hostName}</span>
                </div>
              </div>

              <div style="text-align: center; margin: 24px 0;">
                <a href="${reschedule_link}" style="display: inline-block; margin-right: 12px; padding: 10px 20px; background: #1a56db; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">Reschedule</a>
                <a href="${cancel_link}" style="display: inline-block; padding: 10px 20px; background: #f1f5f9; color: #475569; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">Cancel</a>
              </div>
            </div>
            <div style="background: #f8fafc; padding: 16px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">Powered by ${org_name} via GlobalyOS Scheduler</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send to invitee
    await resend.emails.send({
      from: `${org_name} <hello@globalyos.com>`,
      to: [invitee_email],
      subject: `Confirmed: ${event_name} with ${hostName}`,
      html: inviteeHtml,
    });

    // ── Host notification email ──
    if (hostEmail) {
      const hostHtml = `
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
            <div style="background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #1a56db 0%, #0e4fc4 100%); padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">📅 New Booking!</h1>
              </div>
              <div style="padding: 32px;">
                <p><strong>${invitee_name}</strong> (${invitee_email}) has booked a <strong>${event_name}</strong>.</p>
                <p><strong>When:</strong> ${formattedTime}</p>
                <p><strong>Duration:</strong> ${duration_minutes} minutes</p>
                <p><strong>Location:</strong> ${location}</p>
                <p style="margin-top: 24px; color: #64748b; font-size: 13px;">View this booking in your <a href="https://globalyos.lovable.app" style="color: #1a56db;">GlobalyOS CRM Scheduler</a>.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      await resend.emails.send({
        from: `GlobalyOS Scheduler <hello@globalyos.com>`,
        to: [hostEmail],
        subject: `New booking: ${event_name} with ${invitee_name}`,
        html: hostHtml,
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending scheduler notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
