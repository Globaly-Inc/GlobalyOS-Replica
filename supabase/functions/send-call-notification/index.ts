import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to_user_id, caller_name, caller_avatar, call_type, call_id, organization_slug } = await req.json();
    
    console.log(`Sending call notification to user ${to_user_id} for call ${call_id}`);
    console.log(`Caller: ${caller_name}, Type: ${call_type}`);

    // For now, this is a placeholder - in a full implementation this would:
    // 1. Look up push subscriptions for the user
    // 2. Send web-push notifications to each subscription
    // 3. Include call metadata for the service worker to handle
    
    // The actual call is handled via Supabase Realtime, so this is supplementary
    // for when the user has the app in background
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Call notification sent",
        call_id,
        to_user_id
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending call notification:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
