import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateOnboardingCompleteEmailHtml } from "../_shared/onboarding-email-templates.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") || "https://globalyos.lovable.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendOnboardingCompleteRequest {
  employeeId: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { employeeId }: SendOnboardingCompleteRequest = await req.json();

    if (!employeeId) {
      return new Response(
        JSON.stringify({ error: "employeeId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch employee with profile and organization details
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select(`
        id,
        user_id,
        organization_id,
        personal_email,
        position,
        department,
        organizations!inner(id, name, slug)
      `)
      .eq("id", employeeId)
      .single();

    if (empError || !employee) {
      console.error("Failed to fetch employee:", empError);
      return new Response(
        JSON.stringify({ error: "Employee not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user profile for name and email
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", employee.user_id)
      .single();

    // deno-lint-ignore no-explicit-any
    const org = (employee.organizations as any) as { id: string; name: string; slug: string };
    const recipientEmail = employee.personal_email || profile?.email;
    const fullName = profile?.full_name || "Team Member";

    if (!recipientEmail) {
      console.error("No email found for employee");
      return new Response(
        JSON.stringify({ error: "No recipient email available" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build URLs
    const homeUrl = `${APP_URL}/org/${org.slug}`;
    const profileUrl = `${APP_URL}/org/${org.slug}/settings/profile`;

    // Generate email HTML
    const emailHtml = generateOnboardingCompleteEmailHtml({
      fullName,
      orgName: org.name,
      profileUrl,
      homeUrl,
    });

    // Send email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "GlobalyOS <onboarding@globalyos.com>",
        to: [recipientEmail],
        subject: `Welcome aboard, ${fullName.split(' ')[0]}! You're all set on GlobalyOS`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailResult);
      
      // Log failed attempt
      await supabase.from("email_delivery_log").insert({
        email_type: "onboarding_complete",
        recipient_email: recipientEmail,
        employee_id: employeeId,
        organization_id: org.id,
        template_name: "onboarding_complete",
        status: "failed",
        error_message: JSON.stringify(emailResult),
      });

      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailResult }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log successful delivery
    await supabase.from("email_delivery_log").insert({
      email_type: "onboarding_complete",
      recipient_email: recipientEmail,
      employee_id: employeeId,
      organization_id: org.id,
      template_name: "onboarding_complete",
      status: "sent",
      resend_id: emailResult.id,
      metadata: { fullName, orgName: org.name },
    });

    console.log(`Onboarding complete email sent to ${recipientEmail}`);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-onboarding-complete-email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
