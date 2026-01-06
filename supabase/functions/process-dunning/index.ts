import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Processing dunning subscriptions...");

    // Find subscriptions in dunning
    const { data: dunningSubscriptions, error: fetchError } = await supabase
      .from("subscriptions")
      .select("id, organization_id, dunning_started_at, dunning_ends_at, dunning_attempts, plan")
      .eq("status", "past_due")
      .not("dunning_started_at", "is", null);

    if (fetchError) {
      console.error("Error fetching dunning subscriptions:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${dunningSubscriptions?.length || 0} subscriptions in dunning`);

    for (const subscription of dunningSubscriptions || []) {
      try {
        const dunningEnds = new Date(subscription.dunning_ends_at);
        const now = new Date();

        // Check if dunning period expired (7 days)
        if (now >= dunningEnds) {
          console.log(`Canceling subscription ${subscription.id} - dunning expired`);

          await supabase
            .from("subscriptions")
            .update({
              status: "canceled",
              canceled_at: now.toISOString(),
              dunning_started_at: null,
              dunning_ends_at: null,
            })
            .eq("id", subscription.id);

          // Log dunning cancellation
          await supabase.from("dunning_logs").insert({
            organization_id: subscription.organization_id,
            subscription_id: subscription.id,
            attempt_number: subscription.dunning_attempts || 0,
            action: "canceled",
            result: "dunning_expired",
          });

          // Log activity
          await supabase.from("super_admin_activity_logs").insert({
            organization_id: subscription.organization_id,
            action_type: "dunning_canceled",
            entity_type: "subscription",
            entity_id: subscription.id,
            changes: { status: { from: "past_due", to: "canceled" } },
            metadata: { reason: "dunning_period_expired" }
          });

          console.log(`Subscription ${subscription.id} canceled`);
          continue;
        }

        // Calculate days since dunning started
        const dunningStarted = new Date(subscription.dunning_started_at);
        const daysSinceDunning = Math.floor((now.getTime() - dunningStarted.getTime()) / (1000 * 60 * 60 * 24));

        // Retry on days 2 and 5
        if ([2, 5].includes(daysSinceDunning) && subscription.dunning_attempts < 3) {
          console.log(`Day ${daysSinceDunning} - would retry payment for ${subscription.id}`);
          
          // TODO: Attempt Stripe charge when Stripe is enabled
          
          await supabase
            .from("subscriptions")
            .update({
              dunning_attempts: (subscription.dunning_attempts || 0) + 1,
              last_dunning_attempt_at: now.toISOString(),
            })
            .eq("id", subscription.id);

          await supabase.from("dunning_logs").insert({
            organization_id: subscription.organization_id,
            subscription_id: subscription.id,
            attempt_number: (subscription.dunning_attempts || 0) + 1,
            action: "payment_attempt",
            result: "pending_stripe_integration",
          });
        }

      } catch (subError) {
        console.error(`Error processing dunning for ${subscription.id}:`, subError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: dunningSubscriptions?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in process-dunning:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
