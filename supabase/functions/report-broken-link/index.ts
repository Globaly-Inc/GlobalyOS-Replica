import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BrokenLinkReport {
  path: string;
  referrer?: string;
  userAgent?: string;
  userId?: string;
  organizationId?: string;
  manualReport?: boolean;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: BrokenLinkReport = await req.json();
    const { path, referrer, userAgent, userId, organizationId, manualReport } = body;

    if (!path) {
      return new Response(
        JSON.stringify({ error: "Path is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Broken link reported: ${path}`);

    // Check if this path was reported recently (within last hour) to prevent spam
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentReports } = await supabase
      .from("broken_link_reports")
      .select("id")
      .eq("path", path)
      .gte("reported_at", oneHourAgo)
      .limit(1);

    const isRecentlyReported = recentReports && recentReports.length > 0;

    // Insert the report
    const { error: insertError } = await supabase
      .from("broken_link_reports")
      .insert({
        path,
        referrer: referrer || null,
        user_id: userId || null,
        organization_id: organizationId || null,
        user_agent: userAgent || null,
        email_sent: false,
      });

    if (insertError) {
      console.error("Error inserting broken link report:", insertError);
      // Don't fail the request, just log
    }

    // Send email to super admins (only if not recently reported and we have Resend configured)
    if (!isRecentlyReported && resendApiKey) {
      // Get super admin emails
      const { data: superAdmins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "super_admin");

      if (superAdmins && superAdmins.length > 0) {
        const userIds = superAdmins.map((sa: { user_id: string }) => sa.user_id);
        
        const { data: profiles } = await supabase
          .from("profiles")
          .select("email")
          .in("id", userIds)
          .not("email", "is", null);

        const adminEmails = profiles?.map((p: { email: string }) => p.email).filter(Boolean) || [];

        if (adminEmails.length > 0) {
          // Get user info if available
          let userEmail = "Anonymous";
          if (userId) {
            const { data: userProfile } = await supabase
              .from("profiles")
              .select("email, full_name")
              .eq("id", userId)
              .single();
            
            if (userProfile) {
              userEmail = userProfile.full_name 
                ? `${userProfile.full_name} (${userProfile.email})`
                : userProfile.email;
            }
          }

          // Get org name if available
          let orgName = "N/A";
          if (organizationId) {
            const { data: org } = await supabase
              .from("organizations")
              .select("name")
              .eq("id", organizationId)
              .single();
            
            if (org) {
              orgName = org.name;
            }
          }

          const resend = new Resend(resendApiKey);
          
          try {
            await resend.emails.send({
              from: "GlobalyOS <notifications@globaly.com>",
              to: adminEmails,
              subject: `🔗 Broken Link Detected: ${path}`,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #1f2937; margin-bottom: 20px;">🔗 Broken Link Report</h2>
                  
                  <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; width: 120px;">Path:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-family: monospace; background: #e5e7eb; padding: 4px 8px; border-radius: 4px;">${path}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280;">Referrer:</td>
                        <td style="padding: 8px 0; color: #1f2937;">${referrer || "Direct access"}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280;">User:</td>
                        <td style="padding: 8px 0; color: #1f2937;">${userEmail}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280;">Organization:</td>
                        <td style="padding: 8px 0; color: #1f2937;">${orgName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280;">Reported:</td>
                        <td style="padding: 8px 0; color: #1f2937;">${new Date().toISOString()}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280;">Type:</td>
                        <td style="padding: 8px 0; color: #1f2937;">${manualReport ? "Manual Report" : "Auto-detected"}</td>
                      </tr>
                    </table>
                  </div>
                  
                  <p style="color: #6b7280; font-size: 14px;">
                    This email is sent automatically when users encounter 404 pages. 
                    Please investigate if this is a broken internal link or a user error.
                  </p>
                  
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                  
                  <p style="color: #9ca3af; font-size: 12px;">
                    GlobalyOS System Notification
                  </p>
                </div>
              `,
            });

            // Update the report to mark email as sent
            await supabase
              .from("broken_link_reports")
              .update({ email_sent: true })
              .eq("path", path)
              .order("created_at", { ascending: false })
              .limit(1);

            console.log(`Email sent to ${adminEmails.length} super admin(s)`);
          } catch (emailError) {
            console.error("Error sending email:", emailError);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in report-broken-link:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
