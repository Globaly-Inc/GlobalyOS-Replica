import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  user_id: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

// Send push notification using fetch
async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string; tag?: string }
): Promise<{ success: boolean; statusCode?: number }> {
  try {
    console.log(`Attempting to send push to: ${subscription.endpoint.substring(0, 60)}...`);
    
    const payloadString = JSON.stringify(payload);
    
    // Send push notification - FCM handles the encryption on their end
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
      },
      body: payloadString,
    });
    
    console.log(`Push response status: ${response.status}`);
    
    if (response.ok || response.status === 201) {
      console.log(`Push sent successfully`);
      return { success: true, statusCode: response.status };
    }
    
    const responseText = await response.text();
    console.error(`Push failed with status ${response.status}: ${responseText}`);
    
    return { success: false, statusCode: response.status };
  } catch (error: unknown) {
    console.error("Error sending push notification:", error);
    return { success: false };
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { user_id, title, body, url, tag }: PushPayload = await req.json();

    console.log(`Sending push notification to user ${user_id}: ${title}`);

    // Get all push subscriptions for this user
    const { data: subscriptions, error: subError } = await supabaseClient
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", user_id);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${user_id}`);
      return new Response(
        JSON.stringify({ success: true, message: "No subscriptions found", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${subscriptions.length} subscriptions for user ${user_id}`);

    const payload = { title, body, url: url || "/notifications", tag: tag || "notification" };
    let sentCount = 0;
    const failedSubscriptionIds: string[] = [];

    for (const sub of subscriptions) {
      const result = await sendPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload
      );
      
      if (result.success) {
        sentCount++;
      } else if (result.statusCode === 410 || result.statusCode === 404) {
        // Subscription is invalid, mark for removal
        failedSubscriptionIds.push(sub.id);
      }
    }

    // Remove failed/expired subscriptions
    if (failedSubscriptionIds.length > 0) {
      await supabaseClient
        .from("push_subscriptions")
        .delete()
        .in("id", failedSubscriptionIds);
      console.log(`Removed ${failedSubscriptionIds.length} invalid subscriptions`);
    }

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, total: subscriptions.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-push-notification:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});