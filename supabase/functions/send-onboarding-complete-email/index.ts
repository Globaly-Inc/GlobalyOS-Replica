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
        office_id,
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

    // ============================================
    // AUTO-ASSIGN WORK SCHEDULE FROM OFFICE
    // ============================================
    await setupEmployeeSchedule(supabase, employeeId, employee.office_id, employee.organization_id);

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

/**
 * Sets up an employee's work schedule based on their assigned office schedule.
 * Skips if employee already has a schedule or no office is assigned.
 */
// deno-lint-ignore no-explicit-any
async function setupEmployeeSchedule(supabase: any, employeeId: string, officeId: string | null, organizationId: string) {
  try {
    // Check if employee already has a schedule
    const { data: existingSchedule } = await supabase
      .from("employee_schedules")
      .select("id")
      .eq("employee_id", employeeId)
      .maybeSingle();

    if (existingSchedule) {
      console.log(`Employee ${employeeId} already has a schedule, skipping`);
      return;
    }

    if (!officeId) {
      console.log(`Employee ${employeeId} has no office assigned, skipping schedule creation`);
      return;
    }

    // Get office schedule
    const { data: officeSchedule, error: scheduleError } = await supabase
      .from("office_schedules")
      .select("*")
      .eq("office_id", officeId)
      .maybeSingle();

    if (scheduleError) {
      console.error(`Error fetching office schedule for office ${officeId}:`, scheduleError);
      return;
    }

    if (!officeSchedule) {
      console.log(`No office schedule found for office ${officeId}, skipping schedule creation`);
      return;
    }

    // Create employee schedule from office schedule
    const { error: insertError } = await supabase
      .from("employee_schedules")
      .insert({
        employee_id: employeeId,
        organization_id: organizationId,
        work_start_time: officeSchedule.work_start_time || "09:00",
        work_end_time: officeSchedule.work_end_time || "17:00",
        work_days: officeSchedule.work_days || [1, 2, 3, 4, 5],
        day_schedules: officeSchedule.day_schedules,
        timezone: officeSchedule.timezone || "UTC",
        late_threshold_minutes: officeSchedule.late_threshold_minutes || 15,
        break_start_time: officeSchedule.break_start_time,
        break_end_time: officeSchedule.break_end_time,
        work_location: "office",
      });

    if (insertError) {
      console.error(`Failed to create schedule for employee ${employeeId}:`, insertError);
      return;
    }

    console.log(`Successfully created work schedule for employee ${employeeId} from office ${officeId}`);
  } catch (error) {
    console.error(`Error in setupEmployeeSchedule for ${employeeId}:`, error);
    // Don't throw - schedule setup failure shouldn't block onboarding completion
  }
}
