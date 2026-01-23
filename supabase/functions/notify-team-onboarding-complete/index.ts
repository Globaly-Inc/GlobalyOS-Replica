import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateTeamMemberCompletedEmailHtml } from "../_shared/onboarding-email-templates.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") || "https://globalyos.lovable.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyTeamRequest {
  employeeId: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { employeeId }: NotifyTeamRequest = await req.json();

    if (!employeeId) {
      return new Response(
        JSON.stringify({ error: "employeeId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch employee with all details
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select(`
        id,
        user_id,
        organization_id,
        position,
        department,
        office_id,
        offices(name),
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

    // Fetch employee's profile for name
    const { data: empProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", employee.user_id)
      .single();

    // deno-lint-ignore no-explicit-any
    const org = (employee.organizations as any) as { id: string; name: string; slug: string };
    // deno-lint-ignore no-explicit-any
    const office = (employee.offices as any) as { name: string } | null;
    const memberName = empProfile?.full_name || "Team Member";
    const completedAt = new Date().toISOString();

    // Fetch owners and HR users for this organization
    const { data: adminUsers, error: adminError } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("organization_id", org.id)
      .in("role", ["owner", "hr"]);

    if (adminError || !adminUsers || adminUsers.length === 0) {
      console.log("No admin users found to notify");
      return new Response(
        JSON.stringify({ success: true, notified: 0, message: "No admins to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch profiles for all admin users
    const userIds = adminUsers.map(u => u.user_id);
    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    if (!adminProfiles || adminProfiles.length === 0) {
      console.log("No admin profiles found");
      return new Response(
        JSON.stringify({ success: true, notified: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const profileUrl = `${APP_URL}/org/${org.slug}/team/${employeeId}`;
    let sentCount = 0;
    let failedCount = 0;

    // Send email to each admin
    for (const admin of adminProfiles) {
      if (!admin.email) continue;

      const emailHtml = generateTeamMemberCompletedEmailHtml({
        memberName,
        position: employee.position || "Not specified",
        department: employee.department || "Not specified",
        officeName: office?.name,
        completedAt,
        profileUrl,
        recipientName: admin.full_name?.split(' ')[0] || "Admin",
        orgName: org.name,
      });

      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "GlobalyOS <notifications@globalyos.com>",
            to: [admin.email],
            subject: `${memberName} has completed their onboarding`,
            html: emailHtml,
          }),
        });

        const emailResult = await emailResponse.json();

        if (emailResponse.ok) {
          sentCount++;
          await supabase.from("email_delivery_log").insert({
            email_type: "team_notification",
            recipient_email: admin.email,
            employee_id: employeeId,
            organization_id: org.id,
            template_name: "team_member_completed",
            status: "sent",
            resend_id: emailResult.id,
            metadata: { notifiedUserId: admin.id, memberName },
          });
        } else {
          failedCount++;
          console.error(`Failed to send to ${admin.email}:`, emailResult);
          await supabase.from("email_delivery_log").insert({
            email_type: "team_notification",
            recipient_email: admin.email,
            employee_id: employeeId,
            organization_id: org.id,
            template_name: "team_member_completed",
            status: "failed",
            error_message: JSON.stringify(emailResult),
          });
        }
      } catch (sendError) {
        failedCount++;
        console.error(`Error sending to ${admin.email}:`, sendError);
      }
    }

    console.log(`Team notifications sent: ${sentCount} success, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, failed: failedCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in notify-team-onboarding-complete:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
