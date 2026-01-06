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

    console.log("Processing expired trials...");

    // Find expired trials
    const { data: expiredTrials, error: fetchError } = await supabase
      .from("subscriptions")
      .select(`
        id, organization_id, plan, billing_cycle, trial_ends_at,
        subscription_plans:plan (monthly_price, annual_price, currency)
      `)
      .eq("status", "trialing")
      .lt("trial_ends_at", new Date().toISOString());

    if (fetchError) {
      console.error("Error fetching expired trials:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiredTrials?.length || 0} expired trials`);

    for (const subscription of expiredTrials || []) {
      try {
        console.log(`Processing subscription ${subscription.id}`);

        const planData = subscription.subscription_plans as { monthly_price?: number; annual_price?: number; currency?: string } | null;
        const amount = subscription.billing_cycle === "annual" 
          ? planData?.annual_price || 0
          : planData?.monthly_price || 0;
        const currency = planData?.currency || "USD";

        // Generate invoice number
        const year = new Date().getFullYear();
        const { count } = await supabase
          .from("invoices")
          .select("*", { count: "exact", head: true })
          .gte("created_at", `${year}-01-01`);
        const invoiceNumber = `INV-${year}-${String((count || 0) + 1).padStart(5, "0")}`;

        // Create invoice
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + (subscription.billing_cycle === "annual" ? 12 : 1));

        const { data: invoice, error: invoiceError } = await supabase
          .from("invoices")
          .insert({
            organization_id: subscription.organization_id,
            invoice_number: invoiceNumber,
            amount,
            currency,
            status: "pending",
            due_date: new Date().toISOString(),
            billing_period_start: new Date().toISOString(),
            billing_period_end: periodEnd.toISOString(),
            line_items: [{
              description: `Subscription - ${subscription.plan} (${subscription.billing_cycle})`,
              quantity: 1,
              unit_price: amount,
              amount
            }]
          })
          .select()
          .single();

        if (invoiceError) {
          console.error("Error creating invoice:", invoiceError);
          continue;
        }

        console.log(`Created invoice ${invoice.id}`);

        // Check for payment method
        const { data: paymentMethod } = await supabase
          .from("organization_payment_methods")
          .select("*")
          .eq("organization_id", subscription.organization_id)
          .eq("is_default", true)
          .maybeSingle();

        if (paymentMethod) {
          // TODO: Attempt Stripe charge when Stripe is enabled
          console.log("Payment method found, would attempt charge");
        }

        // Enter dunning period (7 days)
        const dunningEnd = new Date();
        dunningEnd.setDate(dunningEnd.getDate() + 7);

        await supabase
          .from("subscriptions")
          .update({
            status: "past_due",
            dunning_started_at: new Date().toISOString(),
            dunning_ends_at: dunningEnd.toISOString(),
            dunning_attempts: 1,
            last_dunning_attempt_at: new Date().toISOString(),
          })
          .eq("id", subscription.id);

        // Log activity
        await supabase.from("super_admin_activity_logs").insert({
          organization_id: subscription.organization_id,
          action_type: "dunning_started",
          entity_type: "subscription",
          entity_id: subscription.id,
          metadata: { invoice_id: invoice.id, amount, currency }
        });

        console.log(`Subscription ${subscription.id} entered dunning`);

      } catch (subError) {
        console.error(`Error processing subscription ${subscription.id}:`, subError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: expiredTrials?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in process-trial-expirations:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
