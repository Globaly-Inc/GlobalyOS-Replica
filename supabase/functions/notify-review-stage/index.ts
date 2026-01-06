import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getAppBaseUrl(req?: Request): string {
  const origin = req?.headers.get('origin');
  const envBase =
    Deno.env.get('APP_URL') ||
    Deno.env.get('PUBLIC_URL') ||
    Deno.env.get('APP_BASE_URL') ||
    '';
  const base = origin || envBase || 'https://people.globalyhub.com';
  return base.replace(/\/$/, '');
}

function getLogoUrl(req?: Request): string {
  return `${getAppBaseUrl(req)}/images/globalyos-icon.png`;
}

interface NotifyRequest {
  review_id: string;
  stage: "review_initiated" | "self_assessment_submitted" | "manager_review_ready" | "review_acknowledged";
}

const STAGE_CONFIG = {
  review_initiated: {
    recipientType: "employee",
    title: "Performance Review Initiated",
    getEmailSubject: (period: string) => `Performance Review Initiated for ${period}`,
    getMessage: (actorName: string) =>
      `${actorName} has initiated a performance review. Please complete your self-assessment.`,
    emailBody: (employeeName: string, period: string, reviewerName: string) => `
      <h2>Hi ${employeeName},</h2>
      <p>${reviewerName} has initiated a performance review for the period <strong>${period}</strong>.</p>
      <p>Please log in to GlobalyOS to complete your self-assessment as the first step of the review process.</p>
      <p>Your self-assessment helps provide context for the review and ensures your perspective is captured.</p>
    `,
  },
  self_assessment_submitted: {
    recipientType: "reviewer",
    title: "Self-Assessment Submitted",
    getEmailSubject: (employeeName: string) => `Self-Assessment Submitted by ${employeeName}`,
    getMessage: (actorName: string) =>
      `${actorName} has submitted their self-assessment and is ready for your review.`,
    emailBody: (employeeName: string, period: string) => `
      <h2>Self-Assessment Ready for Review</h2>
      <p><strong>${employeeName}</strong> has submitted their self-assessment for the <strong>${period}</strong> review period.</p>
      <p>Please log in to GlobalyOS to review their self-assessment and complete the manager review.</p>
    `,
  },
  manager_review_ready: {
    recipientType: "employee",
    title: "Your Performance Review is Ready",
    getEmailSubject: (period: string) => `Your Performance Review for ${period} is Ready`,
    getMessage: (actorName: string) =>
      `${actorName} has completed your performance review. Please review and acknowledge.`,
    emailBody: (employeeName: string, period: string, reviewerName: string) => `
      <h2>Hi ${employeeName},</h2>
      <p>Great news! <strong>${reviewerName}</strong> has completed your performance review for <strong>${period}</strong>.</p>
      <p>Please log in to GlobalyOS to:</p>
      <ul>
        <li>Review the feedback from your manager</li>
        <li>Add any comments or questions</li>
        <li>Acknowledge the review</li>
      </ul>
      <p>Your acknowledgment completes the review process.</p>
    `,
  },
  review_acknowledged: {
    recipientType: "reviewer",
    title: "Performance Review Acknowledged",
    getEmailSubject: (employeeName: string) => `${employeeName} Acknowledged Their Performance Review`,
    getMessage: (actorName: string) =>
      `${actorName} has acknowledged their performance review. The review is now complete.`,
    emailBody: (employeeName: string, period: string) => `
      <h2>Review Complete</h2>
      <p><strong>${employeeName}</strong> has acknowledged their performance review for <strong>${period}</strong>.</p>
      <p>The review process is now complete. You can view the finalized review in GlobalyOS.</p>
    `,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const logoUrl = getLogoUrl(req);

  try {
    const { review_id, stage } = (await req.json()) as NotifyRequest;

    if (!review_id || !stage) {
      return new Response(
        JSON.stringify({ error: "Missing review_id or stage" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const config = STAGE_CONFIG[stage];
    if (!config) {
      return new Response(
        JSON.stringify({ error: "Invalid stage" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Fetch review with related data
    const { data: review, error: reviewError } = await supabase
      .from("performance_reviews")
      .select(`
        *,
        employee:employees!performance_reviews_employee_id_fkey(
          id, user_id, organization_id,
          profiles(full_name, email)
        ),
        reviewer:employees!performance_reviews_reviewer_id_fkey(
          id, user_id,
          profiles(full_name, email)
        )
      `)
      .eq("id", review_id)
      .single();

    if (reviewError || !review) {
      console.error("Review fetch error:", reviewError);
      return new Response(
        JSON.stringify({ error: "Review not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const employee = review.employee as any;
    const reviewer = review.reviewer as any;
    const period = `${review.review_period_start} to ${review.review_period_end}`;
    const employeeName = employee?.profiles?.full_name || "Team Member";
    const employeeEmail = employee?.profiles?.email;
    const reviewerName = reviewer?.profiles?.full_name || "Manager";
    const reviewerEmail = reviewer?.profiles?.email;

    // Determine recipient
    const isRecipientEmployee = config.recipientType === "employee";
    const recipientUserId = isRecipientEmployee ? employee?.user_id : reviewer?.user_id;
    const recipientEmail = isRecipientEmployee ? employeeEmail : reviewerEmail;
    const recipientName = isRecipientEmployee ? employeeName : reviewerName;
    const actorId = isRecipientEmployee ? reviewer?.id : employee?.id;
    const actorName = isRecipientEmployee ? reviewerName : employeeName;

    if (!recipientUserId) {
      console.error("No recipient user ID found");
      return new Response(
        JSON.stringify({ error: "Recipient not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create in-app notification
    const { error: notifError } = await supabase.from("notifications").insert({
      user_id: recipientUserId,
      organization_id: employee?.organization_id,
      type: "system",
      title: config.title,
      message: config.getMessage(actorName),
      reference_type: "employee",
      reference_id: employee?.id,
      actor_id: actorId,
    });

    if (notifError) {
      console.error("Notification insert error:", notifError);
    }

    // Send email notification
    if (recipientEmail && Deno.env.get("RESEND_API_KEY")) {
      try {
        const emailSubject =
          stage === "review_initiated" || stage === "manager_review_ready"
            ? config.getEmailSubject(period)
            : config.getEmailSubject(employeeName);

        const emailBody =
          stage === "review_initiated" || stage === "manager_review_ready"
            ? (config.emailBody as (e: string, p: string, r: string) => string)(employeeName, period, reviewerName)
            : (config.emailBody as (e: string, p: string) => string)(employeeName, period);

        const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
        await resend.emails.send({
          from: "GlobalyOS <notifications@globalyos.com>",
          to: [recipientEmail],
          subject: emailSubject,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
                .button { display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px; }
                .footer { text-align: center; margin-top: 24px; color: #6b7280; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <img src="${logoUrl}" alt="GlobalyOS" style="width: 48px; height: 48px; border-radius: 12px; margin-bottom: 8px;" />
                  <p style="margin: 4px 0 0 0; opacity: 0.9;">Performance Review Update</p>
                </div>
                <div class="content">
                  ${emailBody}
                  <a href="${Deno.env.get("PUBLIC_URL") || "https://globalyos.com"}" class="button">
                    Open GlobalyOS
                  </a>
                </div>
                <div class="footer">
                  <p>You received this email because you have an active performance review on GlobalyOS.</p>
                </div>
              </div>
            </body>
            </html>
          `,
        });
        console.log("Email sent to:", recipientEmail);
      } catch (emailError) {
        console.error("Email send error:", emailError);
      }
    }

    // Trigger push notification
    try {
      await supabase.functions.invoke("send-push-notification", {
        body: {
          user_id: recipientUserId,
          title: config.title,
          body: config.getMessage(actorName),
          url: "/notifications",
          tag: "performance_review",
        },
      });
    } catch (pushError) {
      console.error("Push notification error:", pushError);
    }

    console.log(`Review notification sent: ${stage} for review ${review_id}`);

    return new Response(
      JSON.stringify({ success: true, stage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in notify-review-stage:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
