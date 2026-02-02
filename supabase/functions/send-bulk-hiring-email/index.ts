/**
 * Send Bulk Hiring Email Edge Function
 * Sends emails to multiple candidates at once
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BulkEmailRequest {
  organization_id: string;
  application_ids: string[];
  subject: string;
  body: string;
  sender_employee_id?: string;
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
        JSON.stringify({ success: false, message: "Email sending not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify authorization
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user has access
    const userSupabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: BulkEmailRequest = await req.json();
    const { organization_id, application_ids, subject, body: emailBody, sender_employee_id } = body;

    if (!organization_id || !application_ids?.length || !subject || !emailBody) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing bulk email:", { organization_id, count: application_ids.length });

    // Verify user has hiring access in this organization
    const { data: employee } = await supabase
      .from("employees")
      .select("id, role")
      .eq("user_id", user.id)
      .eq("organization_id", organization_id)
      .single();

    if (!employee || !["owner", "admin", "hr"].includes(employee.role || "")) {
      return new Response(
        JSON.stringify({ success: false, message: "Access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get organization details
    const { data: org } = await supabase
      .from("organizations")
      .select("name, slug")
      .eq("id", organization_id)
      .single();

    // Get applications with candidate details
    const { data: applications, error: appError } = await supabase
      .from("candidate_applications")
      .select(`
        id,
        job:jobs(title),
        candidate:candidates(id, name, email)
      `)
      .in("id", application_ids)
      .eq("organization_id", organization_id);

    if (appError) {
      console.error("Error fetching applications:", appError);
      throw appError;
    }

    if (!applications?.length) {
      return new Response(
        JSON.stringify({ success: false, message: "No valid applications found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Dynamic import resend
    const resendModule = await import("https://esm.sh/resend@2.0.0");
    const resend = new resendModule.Resend(resendApiKey);

    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const app of applications) {
      const candidate = app.candidate as unknown as { id: string; name: string; email: string } | null;
      const job = app.job as unknown as { title: string } | null;

      if (!candidate?.email) {
        results.push({ email: "unknown", success: false, error: "No email" });
        continue;
      }

      // Replace template variables
      const replacements: Record<string, string> = {
        "{{candidate_name}}": candidate.name || "Candidate",
        "{{candidate_first_name}}": candidate.name?.split(" ")[0] || "there",
        "{{job_title}}": job?.title || "the position",
        "{{company_name}}": org?.name || "our company",
      };

      let processedSubject = subject;
      let processedBody = emailBody;

      for (const [key, value] of Object.entries(replacements)) {
        processedSubject = processedSubject.replace(new RegExp(key, "g"), value);
        processedBody = processedBody.replace(new RegExp(key, "g"), value);
      }

      // Build email HTML
      const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%); padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px;">${org?.name || "GlobalyOS"}</h1>
            </div>
            <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">
              ${processedBody.replace(/\n/g, "<br>")}
            </div>
            <div style="text-align: center; padding: 16px; color: #888; font-size: 12px;">
              <p>Sent via GlobalyOS Hiring</p>
            </div>
          </body>
        </html>
      `;

      try {
        const emailResponse = await resend.emails.send({
          from: `${org?.name || "Hiring"} <hello@globalyos.com>`,
          to: [candidate.email],
          subject: processedSubject,
          html: emailHtml,
        });

        results.push({ email: candidate.email, success: true });

        // Log activity
        await supabase.from("hiring_activity_logs").insert({
          organization_id,
          entity_type: "email",
          entity_id: app.id,
          action: "email_sent",
          actor_id: sender_employee_id || employee.id,
          details: {
            type: "bulk_email",
            recipient: candidate.email,
            subject: processedSubject,
          },
        });
      } catch (emailError: any) {
        console.error("Error sending email to", candidate.email, emailError);
        results.push({ email: candidate.email, success: false, error: emailError.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Bulk email complete: ${successCount} sent, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failCount,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in bulk email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
