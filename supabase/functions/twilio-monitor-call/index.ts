import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Call monitoring edge function.
 * Supports listen, whisper, and barge modes via Twilio Conference.
 *
 * For monitoring to work, active calls must be placed in Twilio Conferences
 * (done via the twilio-webhook voice handler).
 *
 * Actions:
 * - list_active: Returns currently active calls
 * - monitor: Joins a supervisor to an active call's conference
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, organization_id, call_sid, mode, supervisor_number } = await req.json();

    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: "organization_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === "list_active") {
      // Get recent active calls from usage logs (last 10 minutes with no duration = still active)
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: activeCalls, error } = await supabase
        .from("telephony_usage_logs")
        .select("*")
        .eq("organization_id", organization_id)
        .in("event_type", ["call_inbound", "call_outbound", "call_outbound_campaign"])
        .is("duration_seconds", null)
        .gte("created_at", tenMinAgo)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      return new Response(
        JSON.stringify({ calls: activeCalls || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "monitor") {
      if (!call_sid || !mode) {
        return new Response(
          JSON.stringify({ error: "call_sid and mode required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!["listen", "whisper", "barge"].includes(mode)) {
        return new Response(
          JSON.stringify({ error: "mode must be listen, whisper, or barge" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Conference name is derived from call SID
      const conferenceName = `monitor_${call_sid}`;

      // First, move the existing call into a conference if not already
      // Update the call to redirect into a conference
      const updateCallUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${call_sid}.json`;

      const conferenceTwiml = `<Response><Dial><Conference>${conferenceName}</Conference></Dial></Response>`;
      const twimlUrl = `${supabaseUrl}/functions/v1/twilio-monitor-call?action=twiml&conf=${encodeURIComponent(conferenceName)}&mode=participant`;

      const updateParams = new URLSearchParams({
        Url: twimlUrl,
        Method: "POST",
      });

      const updateRes = await fetch(updateCallUrl, {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: updateParams.toString(),
      });

      if (!updateRes.ok) {
        const errText = await updateRes.text();
        console.error("Failed to update call to conference:", errText);
        return new Response(
          JSON.stringify({ error: "Failed to redirect call to conference" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      await updateRes.text();

      // Now add the supervisor to the conference
      if (!supervisor_number) {
        return new Response(
          JSON.stringify({
            success: true,
            conference: conferenceName,
            message: "Call moved to conference. Provide supervisor_number to join.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Determine supervisor conference options based on mode
      const supervisorTwimlUrl = `${supabaseUrl}/functions/v1/twilio-monitor-call?action=twiml&conf=${encodeURIComponent(conferenceName)}&mode=${mode}`;

      const participantUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Conferences/${conferenceName}/Participants.json`;

      // Get an org phone number for the From field
      const { data: orgPhone } = await supabase
        .from("org_phone_numbers")
        .select("phone_number")
        .eq("organization_id", organization_id)
        .eq("status", "active")
        .limit(1)
        .single();

      const fromNumber = orgPhone?.phone_number || "";

      const participantParams = new URLSearchParams({
        From: fromNumber,
        To: supervisor_number,
        EarlyMedia: "true",
      });

      // For listen mode: muted
      if (mode === "listen") {
        participantParams.append("Muted", "true");
      }
      // For whisper mode: coach the agent's call SID
      if (mode === "whisper") {
        participantParams.append("Coach", call_sid);
      }
      // For barge mode: normal participant (no special params)

      const joinRes = await fetch(participantUrl, {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: participantParams.toString(),
      });

      if (!joinRes.ok) {
        const errText = await joinRes.text();
        console.error("Failed to add supervisor:", errText);
        return new Response(
          JSON.stringify({ error: "Failed to add supervisor to conference" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const joinData = await joinRes.json();

      return new Response(
        JSON.stringify({
          success: true,
          mode,
          conference: conferenceName,
          participant_sid: joinData.call_sid,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TwiML endpoint for conference
    if (action === "twiml") {
      const url = new URL(req.url);
      const conf = url.searchParams.get("conf") || "default";
      const twimlMode = url.searchParams.get("mode") || "participant";

      let conferenceAttrs = "";
      if (twimlMode === "listen") {
        conferenceAttrs = ' muted="true"';
      }

      const twiml = `<Response><Dial><Conference${conferenceAttrs}>${conf}</Conference></Dial></Response>`;
      return new Response(twiml, { headers: { "Content-Type": "text/xml" } });
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use list_active or monitor." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("twilio-monitor-call error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
