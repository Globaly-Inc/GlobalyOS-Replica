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
    const { phone_number, friendly_name, organization_id, country_code = "US", monthly_cost = 1.15 } = await req.json();

    if (!phone_number || !organization_id) {
      return new Response(
        JSON.stringify({ error: "phone_number and organization_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Build webhook URLs
    const webhookBase = `${supabaseUrl}/functions/v1/twilio-webhook`;
    const smsUrl = `${webhookBase}?type=sms`;
    const voiceUrl = `${webhookBase}?type=voice`;
    const statusCallback = `${webhookBase}?type=status`;

    // Purchase number via Twilio
    const params = new URLSearchParams();
    params.set("PhoneNumber", phone_number);
    params.set("SmsUrl", smsUrl);
    params.set("SmsMethod", "POST");
    params.set("VoiceUrl", voiceUrl);
    params.set("VoiceMethod", "POST");
    params.set("StatusCallback", statusCallback);
    params.set("StatusCallbackMethod", "POST");
    if (friendly_name) params.set("FriendlyName", friendly_name);

    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    const twilioData = await twilioRes.json();

    if (!twilioRes.ok) {
      return new Response(
        JSON.stringify({ error: twilioData.message || "Failed to provision number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert into org_phone_numbers
    const { data: phoneRecord, error: phoneErr } = await supabase
      .from("org_phone_numbers")
      .insert({
        organization_id,
        phone_number: twilioData.phone_number,
        twilio_sid: twilioData.sid,
        friendly_name: friendly_name || twilioData.friendly_name,
        country_code,
        capabilities: {
          sms: twilioData.capabilities?.sms || false,
          voice: twilioData.capabilities?.voice || false,
          mms: twilioData.capabilities?.mms || false,
        },
        status: "active",
        monthly_cost,
      })
      .select()
      .single();

    if (phoneErr) {
      console.error("Failed to save phone record:", phoneErr);
    }

    // Create an inbox_channels entry for SMS
    const { error: channelErr } = await supabase
      .from("inbox_channels")
      .insert({
        organization_id,
        channel_type: "sms",
        display_name: friendly_name || twilioData.friendly_name || phone_number,
        credentials: { phone_number: twilioData.phone_number, twilio_sid: twilioData.sid },
        webhook_status: "connected",
        is_active: true,
        config: { phone_number_id: phoneRecord?.id },
      });

    if (channelErr) {
      console.error("Failed to create inbox channel:", channelErr);
    }

    return new Response(
      JSON.stringify({ success: true, phone: phoneRecord, twilio: { sid: twilioData.sid, phone_number: twilioData.phone_number } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("twilio-provision-number error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
