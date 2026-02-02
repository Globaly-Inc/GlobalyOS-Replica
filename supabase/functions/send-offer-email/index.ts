/**
 * Send Offer Email Edge Function
 * Sends offer notification email to a candidate
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendOfferRequest {
  organization_id: string;
  offer_id: string;
  custom_message?: string;
  sender_employee_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ success: false, message: "Email sending not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const body: SendOfferRequest = await req.json();
    const { organization_id, offer_id, custom_message, sender_employee_id } = body;

    if (!organization_id || !offer_id) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user has hiring access
    const { data: employee } = await supabase
      .from("employees")
      .select("id, role, full_name")
      .eq("user_id", user.id)
      .eq("organization_id", organization_id)
      .single();

    if (!employee || !["owner", "admin", "hr"].includes(employee.role || "")) {
      return new Response(
        JSON.stringify({ success: false, message: "Access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get organization
    const { data: org } = await supabase
      .from("organizations")
      .select("name, slug, code")
      .eq("id", organization_id)
      .single();

    // Get offer with application and candidate
    const { data: offer, error: offerError } = await supabase
      .from("hiring_offers")
      .select(`
        id, title, level, base_salary, currency, employment_type, start_date, expires_at, status,
        application:candidate_applications(
          id,
          job:jobs(title),
          candidate:candidates(id, name, email)
        )
      `)
      .eq("id", offer_id)
      .eq("organization_id", organization_id)
      .single();

    if (offerError || !offer) {
      return new Response(
        JSON.stringify({ success: false, message: "Offer not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const application = offer.application as any;
    const candidate = application?.candidate as { id: string; name: string; email: string } | null;
    const job = application?.job as { title: string } | null;

    if (!candidate?.email) {
      return new Response(
        JSON.stringify({ success: false, message: "Candidate email not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format salary
    const formatCurrency = (amount: number, currency: string) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    };

    const salaryDisplay = offer.base_salary
      ? formatCurrency(offer.base_salary, offer.currency || 'USD')
      : 'Competitive';

    const startDateFormatted = offer.start_date
      ? new Date(offer.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : 'To be confirmed';

    const expiresFormatted = offer.expires_at
      ? new Date(offer.expires_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : null;

    // Build email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f8fafc;">
          <div style="background-color: #f8fafc; padding: 24px 16px;">
            <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0 0 8px 0; font-size: 24px; font-weight: 600;">🎉 Congratulations!</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">You've received a job offer from ${org?.name || 'our team'}</p>
              </div>
              
              <div style="padding: 32px;">
                <p style="margin: 0 0 20px 0; font-size: 16px;">Hi <strong>${candidate.name?.split(' ')[0] || 'there'}</strong>,</p>
                
                <p style="margin: 0 0 24px 0; font-size: 15px; color: #475569;">
                  We're thrilled to extend an offer for the <strong>${offer.title || job?.title}</strong> position${offer.level ? ` at the ${offer.level} level` : ''}.
                </p>

                ${custom_message ? `<p style="margin: 0 0 24px 0; font-size: 15px; color: #475569;">${custom_message.replace(/\n/g, '<br>')}</p>` : ''}

                <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                  <h3 style="margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; color: #16a34a; letter-spacing: 0.5px;">Offer Details</h3>
                  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size: 14px;">
                    <tr><td style="color: #64748b; padding: 6px 0; width: 40%;">Position</td><td style="color: #1e293b; font-weight: 500; padding: 6px 0;">${offer.title || job?.title}</td></tr>
                    ${offer.level ? `<tr><td style="color: #64748b; padding: 6px 0;">Level</td><td style="color: #1e293b; font-weight: 500; padding: 6px 0;">${offer.level}</td></tr>` : ''}
                    <tr><td style="color: #64748b; padding: 6px 0;">Compensation</td><td style="color: #1e293b; font-weight: 600; padding: 6px 0;">${salaryDisplay}/year</td></tr>
                    <tr><td style="color: #64748b; padding: 6px 0;">Employment Type</td><td style="color: #1e293b; font-weight: 500; padding: 6px 0;">${offer.employment_type?.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Full Time'}</td></tr>
                    <tr><td style="color: #64748b; padding: 6px 0;">Start Date</td><td style="color: #1e293b; font-weight: 500; padding: 6px 0;">${startDateFormatted}</td></tr>
                  </table>
                </div>

                ${expiresFormatted ? `
                  <p style="margin: 0 0 24px 0; font-size: 14px; color: #dc2626;">
                    ⏰ This offer expires on <strong>${expiresFormatted}</strong>. Please respond before this date.
                  </p>
                ` : ''}

                <p style="margin: 0 0 24px 0; font-size: 15px; color: #475569;">
                  Please reply to this email to accept or if you have any questions. We're excited about the possibility of you joining our team!
                </p>

                <p style="margin: 24px 0 0 0; font-size: 15px; color: #1e293b;">
                  Best regards,<br>
                  <strong>${employee.full_name || 'The Hiring Team'}</strong><br>
                  <span style="color: #64748b;">${org?.name}</span>
                </p>
              </div>

              <div style="background: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0; color: #64748b; font-size: 12px;">Sent via GlobalyOS Hiring</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email
    const resendModule = await import("https://esm.sh/resend@2.0.0");
    const resend = new resendModule.Resend(resendApiKey);

    const emailResponse = await resend.emails.send({
      from: `${org?.name || "Hiring"} <hello@globalyos.com>`,
      to: [candidate.email],
      subject: `🎉 Job Offer: ${offer.title || job?.title} at ${org?.name}`,
      html: emailHtml,
    });

    // Update offer status to 'sent'
    await supabase
      .from("hiring_offers")
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq("id", offer_id);

    // Log activity
    await supabase.from("hiring_activity_logs").insert({
      organization_id,
      entity_type: "offer",
      entity_id: offer_id,
      action: "offer_sent",
      actor_id: sender_employee_id || employee.id,
      details: {
        recipient: candidate.email,
        offer_title: offer.title,
      },
    });

    console.log("Offer email sent successfully to", candidate.email);

    return new Response(
      JSON.stringify({ success: true, email_id: (emailResponse as any)?.id || "sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending offer email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
