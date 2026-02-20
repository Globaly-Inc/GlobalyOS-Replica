import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { campaign_id, organization_id } = await req.json();

    if (!campaign_id || !organization_id) {
      return new Response(
        JSON.stringify({ error: "campaign_id and organization_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify campaign belongs to org and is active
    const { data: campaign, error: campErr } = await supabase
      .from("call_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .eq("organization_id", organization_id)
      .single();

    if (campErr || !campaign) {
      return new Response(
        JSON.stringify({ error: "Campaign not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (campaign.status !== "active") {
      return new Response(
        JSON.stringify({ error: "Campaign is not active" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the phone number for caller ID
    let fromNumber = "";
    if (campaign.phone_number_id) {
      const { data: phone } = await supabase
        .from("org_phone_numbers")
        .select("phone_number")
        .eq("id", campaign.phone_number_id)
        .single();
      if (phone) fromNumber = phone.phone_number;
    }

    if (!fromNumber) {
      // Fallback to first active number
      const { data: fallback } = await supabase
        .from("org_phone_numbers")
        .select("phone_number")
        .eq("organization_id", organization_id)
        .eq("status", "active")
        .limit(1)
        .single();
      if (fallback) fromNumber = fallback.phone_number;
    }

    if (!fromNumber) {
      return new Response(
        JSON.stringify({ error: "No active phone number available for this campaign" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get next pending contact
    const { data: nextContact, error: contactErr } = await supabase
      .from("call_campaign_contacts")
      .select("*")
      .eq("campaign_id", campaign_id)
      .eq("organization_id", organization_id)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (contactErr || !nextContact) {
      // No more contacts — mark campaign complete
      await supabase
        .from("call_campaigns")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", campaign_id);

      return new Response(
        JSON.stringify({ done: true, message: "All contacts have been called. Campaign completed." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark contact as calling
    await supabase
      .from("call_campaign_contacts")
      .update({ status: "calling", called_at: new Date().toISOString() })
      .eq("id", nextContact.id);

    // Status callback URL
    const statusCallbackUrl = `${supabaseUrl}/functions/v1/twilio-webhook?type=campaign_status&campaign_id=${campaign_id}&contact_id=${nextContact.id}`;

    // Initiate outbound call via Twilio REST API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
    const twimlUrl = `${supabaseUrl}/functions/v1/twilio-campaign-dial?action=twiml&contact_id=${nextContact.id}&campaign_id=${campaign_id}`;

    // If voicemail drop is configured, use it as TwiML
    const voicemailDrop = campaign.voicemail_drop_text;

    const callParams = new URLSearchParams({
      To: nextContact.phone_number,
      From: fromNumber,
      Url: twimlUrl,
      StatusCallback: statusCallbackUrl,
      StatusCallbackEvent: "initiated ringing answered completed",
      StatusCallbackMethod: "POST",
      MachineDetection: "Enable",
      MachineDetectionTimeout: "5",
    });

    const twilioRes = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: callParams.toString(),
    });

    if (!twilioRes.ok) {
      const errBody = await twilioRes.text();
      console.error("Twilio call error:", errBody);

      // Mark contact as failed
      await supabase
        .from("call_campaign_contacts")
        .update({ status: "failed", outcome: "dial_error" })
        .eq("id", nextContact.id);

      // Increment failed calls
      await supabase.rpc("increment_campaign_counter", {
        p_campaign_id: campaign_id,
        p_field: "failed_calls",
      }).catch(() => {
        // Fallback: direct update
        supabase
          .from("call_campaigns")
          .update({ failed_calls: (campaign.failed_calls || 0) + 1 })
          .eq("id", campaign_id);
      });

      return new Response(
        JSON.stringify({ error: "Failed to initiate call", details: errBody }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callData = await twilioRes.json();

    // Update contact with call SID
    await supabase
      .from("call_campaign_contacts")
      .update({ call_sid: callData.sid })
      .eq("id", nextContact.id);

    // Log telephony usage
    await supabase.from("telephony_usage_logs").insert({
      organization_id,
      phone_number_id: campaign.phone_number_id,
      event_type: "call_outbound_campaign",
      direction: "outbound",
      from_number: fromNumber,
      to_number: nextContact.phone_number,
      twilio_sid: callData.sid,
      metadata: { campaign_id, contact_id: nextContact.id },
    });

    return new Response(
      JSON.stringify({
        success: true,
        contact: {
          id: nextContact.id,
          phone_number: nextContact.phone_number,
          contact_name: nextContact.contact_name,
        },
        call_sid: callData.sid,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("twilio-campaign-dial error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
