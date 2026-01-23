import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateOnboardingReminderEmailHtml } from "../_shared/onboarding-email-templates.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") || "https://globalyos.lovable.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Calculate cutoff time (3 days ago)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const cutoffTime = threeDaysAgo.toISOString();

    // Find employees who need reminders:
    // - is_new_hire = true
    // - employee_onboarding_completed = false
    // - Have an OTP code that was sent more than 3 days ago
    const { data: pendingEmployees, error: empError } = await supabase
      .from("employees")
      .select(`
        id,
        personal_email,
        position,
        department,
        organization_id,
        created_by,
        organizations!inner(id, name, slug)
      `)
      .eq("is_new_hire", true)
      .eq("employee_onboarding_completed", false)
      .not("personal_email", "is", null);

    if (empError) {
      console.error("Failed to fetch pending employees:", empError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch employees" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pendingEmployees || pendingEmployees.length === 0) {
      console.log("No pending employees found");
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No pending employees" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const employee of pendingEmployees) {
      const email = employee.personal_email!;
      // Extract org from join (Supabase returns object for !inner join)
      const org = (employee.organizations as unknown as { id: string; name: string; slug: string });

      // Check last OTP sent time for this email
      const { data: lastOtp } = await supabase
        .from("otp_codes")
        .select("created_at")
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      // Skip if OTP was sent less than 3 days ago
      if (lastOtp && new Date(lastOtp.created_at) > threeDaysAgo) {
        skippedCount++;
        continue;
      }

      // Fetch inviter info
      let inviterName = "Your Team";
      let inviterEmail = "support@globalyos.com";

      if (employee.created_by) {
        const { data: inviterProfile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", employee.created_by)
          .single();

        if (inviterProfile) {
          inviterName = inviterProfile.full_name || "Your Team";
          inviterEmail = inviterProfile.email || "support@globalyos.com";
        }
      }

      // Fetch employee's profile name (from profiles via email lookup)
      const { data: empProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("email", email)
        .single();

      const fullName = empProfile?.full_name || email.split("@")[0];

      // Delete old OTP codes for this email
      await supabase
        .from("otp_codes")
        .delete()
        .eq("email", email);

      // Generate new OTP
      const newOtp = generateOtpCode();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Insert new OTP
      const { error: otpError } = await supabase.from("otp_codes").insert({
        email,
        code: newOtp,
        expires_at: expiresAt.toISOString(),
        verified: false,
      });

      if (otpError) {
        console.error(`Failed to create OTP for ${email}:`, otpError);
        failedCount++;
        continue;
      }

      // Build join URL
      const joinUrl = `${APP_URL}/join?code=${newOtp}&email=${encodeURIComponent(email)}`;

      // Generate email HTML
      const emailHtml = generateOnboardingReminderEmailHtml({
        fullName,
        orgName: org.name,
        inviterName,
        inviterEmail,
        position: employee.position || "Team Member",
        department: employee.department || "General",
        inviteCode: newOtp,
        joinUrl,
      });

      // Send email
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "GlobalyOS <onboarding@globalyos.com>",
            to: [email],
            subject: `Complete your GlobalyOS setup - ${org.name}`,
            html: emailHtml,
          }),
        });

        const emailResult = await emailResponse.json();

        if (emailResponse.ok) {
          sentCount++;
          await supabase.from("email_delivery_log").insert({
            email_type: "reminder",
            recipient_email: email,
            employee_id: employee.id,
            organization_id: org.id,
            template_name: "onboarding_reminder",
            status: "sent",
            resend_id: emailResult.id,
            metadata: { fullName, orgName: org.name },
          });
          console.log(`Reminder sent to ${email}`);
        } else {
          failedCount++;
          console.error(`Failed to send reminder to ${email}:`, emailResult);
          await supabase.from("email_delivery_log").insert({
            email_type: "reminder",
            recipient_email: email,
            employee_id: employee.id,
            organization_id: org.id,
            template_name: "onboarding_reminder",
            status: "failed",
            error_message: JSON.stringify(emailResult),
          });
        }
      } catch (sendError) {
        failedCount++;
        console.error(`Error sending to ${email}:`, sendError);
      }
    }

    console.log(`Reminders: ${sentCount} sent, ${skippedCount} skipped (too recent), ${failedCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount, 
        skipped: skippedCount, 
        failed: failedCount,
        total: pendingEmployees.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-onboarding-reminders:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
