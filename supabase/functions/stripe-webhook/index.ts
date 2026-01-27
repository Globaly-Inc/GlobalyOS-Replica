import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2023-10-16",
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const body = await req.text();

    let event: Stripe.Event;

    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        console.error("Webhook signature verification failed:", err);
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // For development without signature verification
      event = JSON.parse(body);
      console.warn("⚠️ Webhook signature not verified (dev mode)");
    }

    console.log(`Processing Stripe event: ${event.type}`);

    switch (event.type) {
      case "customer.created": {
        const customer = event.data.object as Stripe.Customer;
        console.log("Customer created:", customer.id);
        // Customer ID will be linked when checkout completes
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const organizationId = session.metadata?.organization_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (organizationId && subscriptionId) {
          // Update subscription with Stripe IDs
          const { error: subError } = await supabase
            .from("subscriptions")
            .update({
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              status: "active",
            })
            .eq("organization_id", organizationId);

          if (subError) {
            console.error("Failed to update subscription:", subError);
          }

          // Log timeline event
          await supabase.from("subscription_timeline").insert({
            subscription_id: subscriptionId,
            event_type: "subscription_activated",
            event_data: { stripe_session_id: session.id },
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find organization by Stripe customer ID
        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("id, organization_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (existingSub) {
          const priceId = subscription.items.data[0]?.price.id;
          
          // Find plan by Stripe price ID
          const { data: plan } = await supabase
            .from("subscription_plans")
            .select("slug")
            .or(`stripe_monthly_price_id.eq.${priceId},stripe_annual_price_id.eq.${priceId}`)
            .single();

          const updateData: Record<string, unknown> = {
            status: subscription.status === "active" ? "active" : 
                   subscription.status === "past_due" ? "past_due" :
                   subscription.status === "canceled" ? "canceled" : 
                   subscription.status === "trialing" ? "trialing" : subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          };

          if (plan) {
            updateData.plan = plan.slug;
          }

          if (subscription.canceled_at) {
            updateData.canceled_at = new Date(subscription.canceled_at * 1000).toISOString();
          }

          await supabase
            .from("subscriptions")
            .update(updateData)
            .eq("id", existingSub.id);

          await supabase.from("subscription_timeline").insert({
            subscription_id: existingSub.id,
            event_type: event.type === "customer.subscription.created" ? "subscription_created" : "subscription_updated",
            event_data: { stripe_subscription_id: subscription.id, status: subscription.status },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (existingSub) {
          await supabase
            .from("subscriptions")
            .update({
              status: "canceled",
              canceled_at: new Date().toISOString(),
            })
            .eq("id", existingSub.id);

          await supabase.from("subscription_timeline").insert({
            subscription_id: existingSub.id,
            event_type: "subscription_canceled",
            event_data: { stripe_subscription_id: subscription.id },
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const subscriptionId = invoice.subscription as string;

        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("id, organization_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (existingSub) {
          // Create or update invoice record
          const { data: existingInvoice } = await supabase
            .from("invoices")
            .select("id")
            .eq("stripe_invoice_id", invoice.id)
            .single();

          if (existingInvoice) {
            await supabase
              .from("invoices")
              .update({
                status: "paid",
                paid_at: new Date().toISOString(),
              })
              .eq("id", existingInvoice.id);
          } else {
            // Create new invoice
            const { data: newInvoice } = await supabase
              .from("invoices")
              .insert({
                organization_id: existingSub.organization_id,
                subscription_id: existingSub.id,
                stripe_invoice_id: invoice.id,
                amount: (invoice.amount_paid || 0) / 100,
                currency: invoice.currency.toUpperCase(),
                status: "paid",
                paid_at: new Date().toISOString(),
                due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
                billing_period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
                billing_period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
              })
              .select()
              .single();

            if (newInvoice) {
              // Record payment
              await supabase.from("payments").insert({
                organization_id: existingSub.organization_id,
                invoice_id: newInvoice.id,
                amount: (invoice.amount_paid || 0) / 100,
                currency: invoice.currency.toUpperCase(),
                payment_method: "stripe",
                status: "completed",
                stripe_payment_id: invoice.payment_intent as string,
              });
            }
          }

          // Clear dunning if in dunning state
          await supabase
            .from("subscriptions")
            .update({
              status: "active",
              dunning_started_at: null,
              dunning_ends_at: null,
              dunning_attempts: 0,
            })
            .eq("id", existingSub.id)
            .eq("status", "past_due");
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("id, organization_id, dunning_attempts")
          .eq("stripe_customer_id", customerId)
          .single();

        if (existingSub) {
          const now = new Date();
          const dunningEnds = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

          // Enter dunning state
          await supabase
            .from("subscriptions")
            .update({
              status: "past_due",
              dunning_started_at: existingSub.dunning_attempts === 0 ? now.toISOString() : undefined,
              dunning_ends_at: dunningEnds.toISOString(),
              dunning_attempts: (existingSub.dunning_attempts || 0) + 1,
            })
            .eq("id", existingSub.id);

          // Log dunning attempt
          await supabase.from("dunning_logs").insert({
            subscription_id: existingSub.id,
            attempt_number: (existingSub.dunning_attempts || 0) + 1,
            action: "payment_failed",
            status: "failed",
            notes: `Stripe invoice ${invoice.id} payment failed`,
          });

          await supabase.from("subscription_timeline").insert({
            subscription_id: existingSub.id,
            event_type: "payment_failed",
            event_data: { stripe_invoice_id: invoice.id, attempt: (existingSub.dunning_attempts || 0) + 1 },
          });
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("Payment succeeded:", paymentIntent.id);
        // Payment is typically linked via invoice.payment_succeeded
        break;
      }

      case "payment_method.attached": {
        const paymentMethod = event.data.object as Stripe.PaymentMethod;
        const customerId = paymentMethod.customer as string;

        if (customerId) {
          const { data: existingSub } = await supabase
            .from("subscriptions")
            .select("organization_id")
            .eq("stripe_customer_id", customerId)
            .single();

          if (existingSub && paymentMethod.card) {
            // Check if this payment method already exists
            const { data: existing } = await supabase
              .from("organization_payment_methods")
              .select("id")
              .eq("stripe_payment_method_id", paymentMethod.id)
              .single();

            if (!existing) {
              await supabase.from("organization_payment_methods").insert({
                organization_id: existingSub.organization_id,
                stripe_payment_method_id: paymentMethod.id,
                card_brand: paymentMethod.card.brand,
                card_last4: paymentMethod.card.last4,
                card_exp_month: paymentMethod.card.exp_month,
                card_exp_year: paymentMethod.card.exp_year,
              });
            }
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
