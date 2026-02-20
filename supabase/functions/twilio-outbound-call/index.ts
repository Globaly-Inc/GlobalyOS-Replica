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
    const { to_number, organization_id, phone_number_id, conversation_id } = await req.json();

    if (!to_number || !organization_id) {
      return new Response(
        JSON.stringify({ error: "to_number and organization_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find the org's active phone number to use as caller ID
    let fromNumber: string;
    if (phone_number_id) {
      const { data: phoneRecord } = await supabase
        .from("org_phone_numbers")
        .select("phone_number")
        .eq("id", phone_number_id)
        .eq("organization_id", organization_id)
        .eq("status", "active")
        .single();
      if (!phoneRecord) {
        return new Response(
          JSON.stringify({ error: "Phone number not found or inactive" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      fromNumber = phoneRecord.phone_number;
    } else {
      const { data: phoneRecord } = await supabase
        .from("org_phone_numbers")
        .select("*")
        .eq("organization_id", organization_id)
        .eq("status", "active")
        .limit(1)
        .single();
      if (!phoneRecord) {
        return new Response(
          JSON.stringify({ error: "No active phone number for this organization" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      fromNumber = phoneRecord.phone_number;
    }

    const statusCallback = `${supabaseUrl}/functions/v1/twilio-webhook?type=status`;

    // Create the outbound call via Twilio
    const params = new URLSearchParams();
    params.set("To", to_number);
    params.set("From", fromNumber);
    params.set("Url", `${supabaseUrl}/functions/v1/twilio-outbound-call?action=twiml`);
    params.set("StatusCallback", statusCallback);
    params.set("StatusCallbackEvent", "initiated ringing answered completed");
    params.set("StatusCallbackMethod", "POST");

    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
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
        JSON.stringify({ error: twilioData.message || "Failed to initiate call" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get phone_number_id for usage log
    const { data: phoneForLog } = await supabase
      .from("org_phone_numbers")
      .select("id")
      .eq("organization_id", organization_id)
      .eq("phone_number", fromNumber)
      .single();

    // Log usage
    await supabase.from("telephony_usage_logs").insert({
      organization_id,
      phone_number_id: phoneForLog?.id || null,
      event_type: "call_outbound",
      direction: "outbound",
      from_number: fromNumber,
      to_number,
      twilio_sid: twilioData.sid,
    });

    // Insert a system message in the conversation if provided
    if (conversation_id) {
      await supabase.from("inbox_messages").insert({
        organization_id,
        conversation_id,
        direction: "outbound",
        msg_type: "system",
        content: {
          body: `📞 Outbound call initiated to ${to_number}`,
          call_sid: twilioData.sid,
          call_status: "initiated",
        },
        delivery_status: "sent",
        created_by_type: "agent",
        provider_message_id: twilioData.sid,
      });
    }

    return new Response(
      JSON.stringify({ success: true, call_sid: twilioData.sid }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    // Handle TwiML request for connecting agent
    const url = new URL((err as any)?.url || "http://localhost");
    if (url.searchParams.get("action") === "twiml") {
      return new Response(
        `<Response><Say>Connecting your call now.</Say><Dial><Number>${url.searchParams.get("to") || ""}</Number></Dial></Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    console.error("twilio-outbound-call error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
