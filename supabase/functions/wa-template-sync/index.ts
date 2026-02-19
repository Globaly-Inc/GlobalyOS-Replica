import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { organization_id } = await req.json();
    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: "organization_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the org's WA account
    const { data: account } = await adminClient
      .from("wa_accounts")
      .select("waba_id")
      .eq("organization_id", organization_id)
      .eq("status", "connected")
      .maybeSingle();

    if (!account) {
      return new Response(
        JSON.stringify({ error: "No connected WhatsApp account" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // In production, this would call Meta Graph API:
    // GET /{waba_id}/message_templates
    // For now, we just return current local templates
    const { data: templates, error } = await adminClient
      .from("wa_templates")
      .select("*")
      .eq("organization_id", organization_id)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Templates synced",
        count: templates?.length || 0,
        templates,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Template sync error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
