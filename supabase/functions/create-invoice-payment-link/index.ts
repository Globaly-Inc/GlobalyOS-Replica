import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe secret key not configured");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Unauthorized");

    const { invoiceId } = await req.json();
    if (!invoiceId) throw new Error("invoiceId is required");

    // Fetch invoice with contact
    const { data: invoice, error: invErr } = await supabase
      .from("accounting_invoices")
      .select("*, accounting_contacts(name, email)")
      .eq("id", invoiceId)
      .single();
    if (invErr || !invoice) throw new Error("Invoice not found");

    // Security: verify user belongs to same org
    const { data: emp } = await supabase
      .from("employees")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();
    if (!emp || emp.organization_id !== invoice.organization_id) {
      throw new Error("Forbidden");
    }

    if (!["approved", "sent", "partially_paid", "overdue"].includes(invoice.status)) {
      throw new Error("Invoice must be approved before creating a payment link");
    }

    const amountDue = invoice.amount_due ?? (invoice.total - invoice.amount_paid);
    if (amountDue <= 0) throw new Error("No amount due on this invoice");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://globalyos.lovable.app";

    // Create a Stripe Payment Link via a Price + Product
    const product = await stripe.products.create({
      name: `Invoice ${invoice.invoice_number}`,
      metadata: {
        organization_id: invoice.organization_id,
        ledger_id: invoice.ledger_id,
        office_id: invoice.office_id,
        invoice_id: invoice.id,
      },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(amountDue * 100),
      currency: (invoice.currency || "aud").toLowerCase(),
    });

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: {
        organization_id: invoice.organization_id,
        invoice_id: invoice.id,
        type: "accounting_invoice",
      },
      after_completion: {
        type: "redirect",
        redirect: { url: `${appBaseUrl}/payment-success?invoice=${invoice.invoice_number}` },
      },
    });

    // Store the payment link ID on the invoice
    await supabase
      .from("accounting_invoices")
      .update({ stripe_payment_link_id: paymentLink.id })
      .eq("id", invoiceId);

    return new Response(
      JSON.stringify({ url: paymentLink.url, paymentLinkId: paymentLink.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error creating payment link:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
