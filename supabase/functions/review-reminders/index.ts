import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    console.log("Running review reminders check...");

    // Find reviews needing self-assessment reminders
    // Status is 'draft' or 'self_assessment_pending' and created > 3 days ago
    const { data: selfAssessmentPending, error: saError } = await supabase
      .from("performance_reviews")
      .select(`
        id,
        review_period_start,
        review_period_end,
        created_at,
        last_reminder_sent_at,
        reminder_count,
        employee:employees!performance_reviews_employee_id_fkey(
          id, user_id,
          profiles(full_name, email)
        ),
        reviewer:employees!performance_reviews_reviewer_id_fkey(
          profiles(full_name)
        )
      `)
      .in("status", ["draft", "self_assessment_pending"])
      .is("self_submitted_at", null)
      .lt("created_at", threeDaysAgo.toISOString());

    if (saError) {
      console.error("Error fetching self-assessment pending reviews:", saError);
    }

    // Find reviews needing acknowledgment reminders
    const { data: acknowledgmentPending, error: ackError } = await supabase
      .from("performance_reviews")
      .select(`
        id,
        review_period_start,
        review_period_end,
        manager_submitted_at,
        last_reminder_sent_at,
        reminder_count,
        employee:employees!performance_reviews_employee_id_fkey(
          id, user_id, organization_id,
          profiles(full_name, email)
        ),
        reviewer:employees!performance_reviews_reviewer_id_fkey(
          profiles(full_name)
        )
      `)
      .eq("status", "pending_acknowledgment")
      .is("acknowledged_at", null)
      .lt("manager_submitted_at", threeDaysAgo.toISOString());

    if (ackError) {
      console.error("Error fetching acknowledgment pending reviews:", ackError);
    }

    let sentCount = 0;

    // Process self-assessment reminders
    for (const review of selfAssessmentPending || []) {
      // Skip if reminder was sent in the last 2 days
      if (review.last_reminder_sent_at && new Date(review.last_reminder_sent_at) > twoDaysAgo) {
        continue;
      }

      const employee = review.employee as any;
      const reviewer = review.reviewer as any;
      const employeeName = employee?.profiles?.full_name || "Team Member";
      const employeeEmail = employee?.profiles?.email;
      const reviewerName = reviewer?.profiles?.full_name || "your manager";
      const period = `${review.review_period_start} to ${review.review_period_end}`;
      const reminderNum = (review.reminder_count || 0) + 1;

      // Create in-app notification
      if (employee?.user_id) {
        await supabase.from("notifications").insert({
          user_id: employee.user_id,
          organization_id: employee?.organization_id,
          type: "system",
          title: "Self-Assessment Reminder",
          message: `Your self-assessment for the ${period} review is still pending. Please complete it soon.`,
          reference_type: "employee",
          reference_id: employee.id,
        });
      }

      // Send email reminder
      if (employeeEmail && Deno.env.get("RESEND_API_KEY")) {
        try {
          await resend.emails.send({
            from: "GlobalyOS <notifications@globalyos.com>",
            to: [employeeEmail],
            subject: `Reminder: Complete Your Self-Assessment (${reminderNum}${reminderNum === 1 ? "st" : reminderNum === 2 ? "nd" : "rd"} reminder)`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(135deg, #f59e0b, #fbbf24); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                  .content { background: #fffbeb; padding: 24px; border: 1px solid #fcd34d; border-top: none; border-radius: 0 0 8px 8px; }
                  .button { display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px; }
                  .footer { text-align: center; margin-top: 24px; color: #6b7280; font-size: 14px; }
                  .reminder-badge { background: #fef3c7; border: 1px solid #f59e0b; padding: 4px 12px; border-radius: 12px; font-size: 12px; color: #92400e; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <span class="reminder-badge">Reminder ${reminderNum}</span>
                    <h1 style="margin: 12px 0 0 0;">Self-Assessment Pending</h1>
                  </div>
                  <div class="content">
                    <h2>Hi ${employeeName},</h2>
                    <p>This is a friendly reminder that your <strong>self-assessment</strong> for the performance review period <strong>${period}</strong> is still pending.</p>
                    <p>${reviewerName} initiated this review and is waiting for your self-assessment before proceeding with the manager review.</p>
                    <p>Completing your self-assessment ensures your perspective and achievements are captured in the review.</p>
                    <a href="${Deno.env.get("PUBLIC_URL") || "https://globalyos.com"}" class="button">
                      Complete Self-Assessment
                    </a>
                  </div>
                  <div class="footer">
                    <p>You received this reminder because your performance review self-assessment is pending.</p>
                  </div>
                </div>
              </body>
              </html>
            `,
          });
          console.log(`Self-assessment reminder sent to: ${employeeEmail}`);
        } catch (emailError) {
          console.error("Email send error:", emailError);
        }
      }

      // Update reminder tracking
      await supabase
        .from("performance_reviews")
        .update({
          last_reminder_sent_at: now.toISOString(),
          reminder_count: reminderNum,
        })
        .eq("id", review.id);

      sentCount++;
    }

    // Process acknowledgment reminders
    for (const review of acknowledgmentPending || []) {
      // Skip if reminder was sent in the last 2 days
      if (review.last_reminder_sent_at && new Date(review.last_reminder_sent_at) > twoDaysAgo) {
        continue;
      }

      const employee = review.employee as any;
      const reviewer = review.reviewer as any;
      const employeeName = employee?.profiles?.full_name || "Team Member";
      const employeeEmail = employee?.profiles?.email;
      const reviewerName = reviewer?.profiles?.full_name || "your manager";
      const period = `${review.review_period_start} to ${review.review_period_end}`;
      const reminderNum = (review.reminder_count || 0) + 1;

      // Create in-app notification
      if (employee?.user_id) {
        await supabase.from("notifications").insert({
          user_id: employee.user_id,
          organization_id: employee?.organization_id,
          type: "system",
          title: "Review Acknowledgment Reminder",
          message: `${reviewerName} completed your performance review. Please review and acknowledge it.`,
          reference_type: "employee",
          reference_id: employee.id,
        });
      }

      // Send email reminder
      if (employeeEmail && Deno.env.get("RESEND_API_KEY")) {
        try {
          await resend.emails.send({
            from: "GlobalyOS <notifications@globalyos.com>",
            to: [employeeEmail],
            subject: `Reminder: Acknowledge Your Performance Review (${reminderNum}${reminderNum === 1 ? "st" : reminderNum === 2 ? "nd" : "rd"} reminder)`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                  .content { background: #f5f3ff; padding: 24px; border: 1px solid #c4b5fd; border-top: none; border-radius: 0 0 8px 8px; }
                  .button { display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px; }
                  .footer { text-align: center; margin-top: 24px; color: #6b7280; font-size: 14px; }
                  .reminder-badge { background: #ede9fe; border: 1px solid #a78bfa; padding: 4px 12px; border-radius: 12px; font-size: 12px; color: #5b21b6; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <span class="reminder-badge">Reminder ${reminderNum}</span>
                    <h1 style="margin: 12px 0 0 0;">Review Awaiting Acknowledgment</h1>
                  </div>
                  <div class="content">
                    <h2>Hi ${employeeName},</h2>
                    <p>This is a reminder that <strong>${reviewerName}</strong> has completed your performance review for <strong>${period}</strong> and is awaiting your acknowledgment.</p>
                    <p>Please log in to GlobalyOS to:</p>
                    <ul>
                      <li>Review the feedback from your manager</li>
                      <li>Add any comments or questions</li>
                      <li>Acknowledge the review to complete the process</li>
                    </ul>
                    <a href="${Deno.env.get("PUBLIC_URL") || "https://globalyos.com"}" class="button">
                      View & Acknowledge Review
                    </a>
                  </div>
                  <div class="footer">
                    <p>You received this reminder because your performance review acknowledgment is pending.</p>
                  </div>
                </div>
              </body>
              </html>
            `,
          });
          console.log(`Acknowledgment reminder sent to: ${employeeEmail}`);
        } catch (emailError) {
          console.error("Email send error:", emailError);
        }
      }

      // Update reminder tracking
      await supabase
        .from("performance_reviews")
        .update({
          last_reminder_sent_at: now.toISOString(),
          reminder_count: reminderNum,
        })
        .eq("id", review.id);

      sentCount++;
    }

    console.log(`Review reminders completed. Sent ${sentCount} reminders.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount,
        selfAssessmentPending: selfAssessmentPending?.length || 0,
        acknowledgmentPending: acknowledgmentPending?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in review-reminders:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
