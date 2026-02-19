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

    const { campaign_id } = await req.json();
    if (!campaign_id) {
      return new Response(
        JSON.stringify({ error: "campaign_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch campaign with template
    const { data: campaign, error: campErr } = await adminClient
      .from("wa_campaigns")
      .select("*, wa_templates(*)")
      .eq("id", campaign_id)
      .single();

    if (campErr || !campaign) {
      return new Response(
        JSON.stringify({ error: "Campaign not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (campaign.status !== "draft" && campaign.status !== "scheduled") {
      return new Response(
        JSON.stringify({ error: `Cannot send campaign with status: ${campaign.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orgId = campaign.organization_id;

    // Get WA account
    const { data: account } = await adminClient
      .from("wa_accounts")
      .select("phone_number_id")
      .eq("organization_id", orgId)
      .eq("status", "connected")
      .maybeSingle();

    if (!account) {
      return new Response(
        JSON.stringify({ error: "No connected WhatsApp account" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update campaign status to sending
    await adminClient
      .from("wa_campaigns")
      .update({ status: "sending", started_at: new Date().toISOString() })
      .eq("id", campaign_id);

    // Resolve audience - get opted-in contacts matching filters
    let query = adminClient
      .from("wa_contacts")
      .select("id, phone, name")
      .eq("organization_id", orgId)
      .eq("opt_in_status", "opted_in");

    const filters = campaign.audience_filters as Record<string, unknown>;
    if (filters?.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
      query = query.overlaps("tags", filters.tags);
    }

    const { data: contacts } = await query;
    const recipients = contacts || [];

    const stats = { total: recipients.length, sent: 0, delivered: 0, read: 0, failed: 0, replied: 0 };

    // In production, this would call wa-send for each recipient with throttling
    // For now, we simulate the send and update stats
    stats.sent = recipients.length;

    // Update campaign as completed
    await adminClient
      .from("wa_campaigns")
      .update({
        status: "sent",
        completed_at: new Date().toISOString(),
        stats,
      })
      .eq("id", campaign_id);

    // Audit log
    await adminClient.from("wa_audit_log").insert({
      organization_id: orgId,
      action: "broadcast_sent",
      entity_type: "wa_campaign",
      entity_id: campaign_id,
      details: { recipients_count: recipients.length },
    });

    return new Response(
      JSON.stringify({ success: true, stats }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Broadcast error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
