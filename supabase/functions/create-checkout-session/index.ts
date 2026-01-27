import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutRequest {
  priceId: string;
  organizationId: string;
  billingCycle: "monthly" | "annual";
  couponCode?: string;
  successUrl?: string;
  cancelUrl?: string;
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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const userEmail = user.email as string;

    const { priceId, organizationId, billingCycle, couponCode, successUrl, cancelUrl }: CheckoutRequest = await req.json();

    if (!priceId || !organizationId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is owner of the organization
    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .single();

    if (!membership || membership.role !== "owner") {
      return new Response(JSON.stringify({ error: "Only organization owners can manage billing" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get organization details
    const { data: org } = await supabase
      .from("organizations")
      .select("name, slug")
      .eq("id", organizationId)
      .single();

    // Get existing subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("organization_id", organizationId)
      .single();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Create or retrieve Stripe customer
    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      // Check if customer exists by email
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        // Create new customer
        const customer = await stripe.customers.create({
          email: userEmail,
          name: org?.name || undefined,
          metadata: {
            organization_id: organizationId,
            organization_slug: org?.slug || "",
          },
        });
        customerId = customer.id;
      }
    }

    // Build checkout session params
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${req.headers.get("origin")}/settings?tab=billing&success=true`,
      cancel_url: cancelUrl || `${req.headers.get("origin")}/settings?tab=billing&canceled=true`,
      metadata: {
        organization_id: organizationId,
        billing_cycle: billingCycle,
      },
      subscription_data: {
        metadata: {
          organization_id: organizationId,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      customer_update: {
        address: "auto",
        name: "auto",
      },
    };

    // Apply coupon if provided
    if (couponCode) {
      try {
        // Validate coupon exists in our system
        const { data: coupon } = await supabase
          .from("coupons")
          .select("stripe_coupon_id, code")
          .eq("code", couponCode.toUpperCase())
          .eq("is_active", true)
          .single();

        if (coupon?.stripe_coupon_id) {
          sessionParams.discounts = [{ coupon: coupon.stripe_coupon_id }];
        }
      } catch {
        console.log("Coupon not found or invalid:", couponCode);
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Checkout session error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
