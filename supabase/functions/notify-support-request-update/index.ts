import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyInput {
  requestId: string;
  actionType: string;
  oldValue?: string;
  newValue?: string;
}

const ACTION_LABELS: Record<string, string> = {
  status_change: 'Status Changed',
  priority_change: 'Priority Changed',
  comment_added: 'New Comment',
  subscriber_added: 'Subscriber Added',
  subscriber_removed: 'Subscriber Removed',
  notes_updated: 'Notes Updated',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping email notification");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const resend = new Resend(resendApiKey);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { requestId, actionType, oldValue, newValue }: NotifyInput = await req.json();
    console.log("Notify support request update:", { requestId, actionType, oldValue, newValue });

    // Fetch request details
    const { data: request, error: requestError } = await supabase
      .from("support_requests")
      .select("id, title, type, status, priority")
      .eq("id", requestId)
      .single();

    if (requestError || !request) {
      console.error("Request not found:", requestError);
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch subscribers with profiles
    const { data: subscribers } = await supabase
      .from("support_request_subscribers")
      .select("user_id")
      .eq("request_id", requestId);

    if (!subscribers || subscribers.length === 0) {
      console.log("No subscribers to notify");
      return new Response(JSON.stringify({ success: true, notified: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch subscriber emails
    const userIds = subscribers.map(s => s.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds);

    if (!profiles || profiles.length === 0) {
      console.log("No profiles found for subscribers");
      return new Response(JSON.stringify({ success: true, notified: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const actionLabel = ACTION_LABELS[actionType] || actionType;
    const typeEmoji = request.type === 'bug' ? '🐛' : '💡';
    const baseUrl = Deno.env.get("SITE_URL") || "https://globalyos.app";

    // Send emails to all subscribers
    const emailPromises = profiles.map(async (profile) => {
      if (!profile.email) return null;

      const changeDescription = oldValue && newValue 
        ? `from "${oldValue}" to "${newValue}"`
        : newValue 
          ? `"${newValue}"`
          : '';

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="font-size: 24px;">${typeEmoji}</span>
              </div>
              
              <h1 style="font-size: 18px; color: #18181b; margin: 0 0 8px 0; text-align: center;">
                ${actionLabel}
              </h1>
              
              <p style="color: #71717a; font-size: 14px; text-align: center; margin: 0 0 24px 0;">
                ${changeDescription}
              </p>
              
              <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="font-size: 14px; font-weight: 600; color: #18181b; margin: 0 0 4px 0;">
                  ${request.title}
                </p>
                <p style="font-size: 12px; color: #71717a; margin: 0;">
                  ${request.type === 'bug' ? 'Bug Report' : 'Feature Request'} • ${request.status} • ${request.priority}
                </p>
              </div>
              
              <div style="text-align: center;">
                <a href="${baseUrl}/super-admin/customer-success" 
                   style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">
                  View Request
                </a>
              </div>
            </div>
            
            <p style="text-align: center; color: #a1a1aa; font-size: 12px; margin-top: 24px;">
              You're receiving this because you're subscribed to this request.
            </p>
          </div>
        </body>
        </html>
      `;

      try {
        await resend.emails.send({
          from: "GlobalyOS Support <support@globalyos.com>",
          to: [profile.email],
          subject: `${typeEmoji} ${actionLabel}: ${request.title.substring(0, 50)}${request.title.length > 50 ? '...' : ''}`,
          html: emailHtml,
        });
        console.log(`Email sent to ${profile.email}`);
        return profile.email;
      } catch (emailError) {
        console.error(`Failed to send email to ${profile.email}:`, emailError);
        return null;
      }
    });

    const results = await Promise.all(emailPromises);
    const notifiedCount = results.filter(Boolean).length;

    console.log(`Notified ${notifiedCount} subscribers`);

    return new Response(
      JSON.stringify({ success: true, notified: notifiedCount }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error in notify-support-request-update:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
