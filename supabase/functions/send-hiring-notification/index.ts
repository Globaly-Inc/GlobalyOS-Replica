/**
 * Send Hiring Notification Edge Function
 * Sends automated emails for hiring events
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
// import { Resend } from "npm:resend@2.0.0"; // Will be imported dynamically

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface HiringNotificationRequest {
  organization_id: string;
  trigger_type: string;
  candidate_id?: string;
  application_id?: string;
  job_id?: string;
  interview_id?: string;
  assignment_id?: string;
  offer_id?: string;
  custom_data?: Record<string, any>;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping email");
      return new Response(
        JSON.stringify({ success: true, message: "Email sending skipped - API key not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Dynamic import resend
    const resendModule = await import("https://esm.sh/resend@2.0.0");
    const resend = new resendModule.Resend(resendApiKey);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: HiringNotificationRequest = await req.json();
    const { organization_id, trigger_type, candidate_id, application_id, job_id } = body;

    console.log("Processing hiring notification:", { trigger_type, organization_id });

    // Get organization details
    const { data: org } = await supabase
      .from("organizations")
      .select("name, slug")
      .eq("id", organization_id)
      .single();

    // Get email template for this trigger
    const { data: template } = await supabase
      .from("hiring_email_templates")
      .select("*")
      .eq("organization_id", organization_id)
      .eq("trigger_type", trigger_type)
      .eq("is_active", true)
      .single();

    if (!template) {
      console.log("No active template found for trigger:", trigger_type);
      return new Response(
        JSON.stringify({ success: true, message: "No template configured for this trigger" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get candidate details
    let candidate = null;
    if (candidate_id) {
      const { data } = await supabase
        .from("candidates")
        .select("*")
        .eq("id", candidate_id)
        .single();
      candidate = data;
    } else if (application_id) {
      const { data } = await supabase
        .from("candidate_applications")
        .select("*, candidate:candidates(*)")
        .eq("id", application_id)
        .single();
      candidate = data?.candidate;
    }

    if (!candidate?.email) {
      console.log("No candidate email found");
      return new Response(
        JSON.stringify({ success: false, message: "No candidate email found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get job details if applicable
    let job = null;
    if (job_id) {
      const { data } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", job_id)
        .single();
      job = data;
    } else if (application_id) {
      const { data } = await supabase
        .from("candidate_applications")
        .select("job:jobs(*)")
        .eq("id", application_id)
        .single();
      job = data?.job;
    }

    // Replace template variables
    const replacements: Record<string, string> = {
      "{{candidate_name}}": candidate.name || "Candidate",
      "{{candidate_first_name}}": candidate.name?.split(" ")[0] || "there",
      "{{candidate_email}}": candidate.email,
      "{{job_title}}": job?.title || "the position",
      "{{company_name}}": org?.name || "our company",
      "{{application_link}}": `${Deno.env.get("SITE_URL") || "https://globalyos.lovable.app"}/careers/${org?.slug || organization_id}`,
    };

    let subject = template.subject;
    let body_html = template.body_template;

    for (const [key, value] of Object.entries(replacements)) {
      subject = subject.replace(new RegExp(key, "g"), value);
      body_html = body_html.replace(new RegExp(key, "g"), value);
    }

    // Build email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${org?.name || "GlobalyOS"}</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">
            ${body_html.replace(/\n/g, "<br>")}
          </div>
          <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
            <p>Sent via GlobalyOS Hiring</p>
          </div>
        </body>
      </html>
    `;

    // Send email
    const emailResponse = await resend.emails.send({
      from: `${org?.name || "Hiring"} <hello@globalyos.com>`,
      to: [candidate.email],
      subject,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log the activity
    await supabase.from("hiring_activity_logs").insert({
      organization_id,
      entity_type: "email",
      entity_id: application_id || candidate_id || job_id || organization_id,
      action: "email_sent",
      actor_id: null,
      details: {
        trigger_type,
        template_id: template.id,
        recipient: candidate.email,
        subject,
      },
    });

    return new Response(
      JSON.stringify({ success: true, email_id: (emailResponse as any)?.id || "sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending hiring notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
