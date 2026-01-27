import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChargeRequest {
  organizationId: string;
  invoiceId?: string;
  amount?: number;
  currency?: string;
  description?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    
    // Use anon key client for auth validation
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { organizationId, invoiceId, amount, currency = "USD", description }: ChargeRequest = await req.json();

    if (!organizationId) {
      return new Response(JSON.stringify({ error: "Organization ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is owner or has super_admin role
    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .single();

    const { data: superAdmin } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "super_admin")
      .single();

    if (!superAdmin && (!membership || membership.role !== "owner")) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get subscription with Stripe customer ID
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("id, stripe_customer_id")
      .eq("organization_id", organizationId)
      .single();

    if (!subscription?.stripe_customer_id) {
      return new Response(JSON.stringify({ error: "No Stripe customer found for this organization" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Get default payment method
    const customer = await stripe.customers.retrieve(subscription.stripe_customer_id) as Stripe.Customer;
    const defaultPaymentMethod = customer.invoice_settings?.default_payment_method as string;

    if (!defaultPaymentMethod) {
      // Try to get any attached payment method
      const paymentMethods = await stripe.paymentMethods.list({
        customer: subscription.stripe_customer_id,
        type: "card",
        limit: 1,
      });

      if (paymentMethods.data.length === 0) {
        return new Response(JSON.stringify({ error: "No payment method on file" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let chargeAmount = amount;
    let invoiceRecord = null;

    // If invoice ID provided, get the amount from the invoice
    if (invoiceId) {
      const { data: invoice } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .eq("organization_id", organizationId)
        .single();

      if (!invoice) {
        return new Response(JSON.stringify({ error: "Invoice not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (invoice.status === "paid") {
        return new Response(JSON.stringify({ error: "Invoice already paid" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      chargeAmount = invoice.amount;
      invoiceRecord = invoice;
    }

    if (!chargeAmount || chargeAmount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid charge amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(chargeAmount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      customer: subscription.stripe_customer_id,
      payment_method: defaultPaymentMethod || undefined,
      off_session: true,
      confirm: true,
      description: description || `Charge for organization ${organizationId}`,
      metadata: {
        organization_id: organizationId,
        invoice_id: invoiceId || "",
      },
    });

    if (paymentIntent.status === "succeeded") {
      // Record payment
      const { data: payment } = await supabase
        .from("payments")
        .insert({
          organization_id: organizationId,
          invoice_id: invoiceId || null,
          amount: chargeAmount,
          currency: currency,
          payment_method: "stripe",
          status: "completed",
          stripe_payment_id: paymentIntent.id,
        })
        .select()
        .single();

      // Update invoice if applicable
      if (invoiceId) {
        await supabase
          .from("invoices")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
          })
          .eq("id", invoiceId);
      }

      // Clear dunning if subscription was in dunning
      await supabase
        .from("subscriptions")
        .update({
          status: "active",
          dunning_started_at: null,
          dunning_ends_at: null,
          dunning_attempts: 0,
        })
        .eq("id", subscription.id)
        .eq("status", "past_due");

      return new Response(JSON.stringify({ 
        success: true, 
        paymentId: payment?.id,
        stripePaymentId: paymentIntent.id,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ 
        success: false, 
        status: paymentIntent.status,
        error: "Payment requires additional action",
      }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error: unknown) {
    console.error("Charge payment error:", error);
    
    // Handle Stripe-specific errors
    const stripeError = error as { type?: string; message?: string; code?: string; decline_code?: string };
    if (stripeError.type === "StripeCardError") {
      return new Response(JSON.stringify({ 
        error: stripeError.message,
        code: stripeError.code,
        decline_code: stripeError.decline_code,
      }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
