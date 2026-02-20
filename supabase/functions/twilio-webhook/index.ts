import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "sms";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Twilio sends form-encoded data
    const formData = await req.formData();
    const payload: Record<string, string> = {};
    formData.forEach((value, key) => {
      payload[key] = String(value);
    });

    if (type === "status") {
      return await handleStatusCallback(supabase, payload);
    }

    if (type === "campaign_status") {
      return await handleCampaignStatusCallback(supabase, payload, url);
    }

    if (type === "voice") {
      return await handleVoiceInbound(supabase, payload);
    }

    // Default: SMS inbound
    return await handleSmsInbound(supabase, payload);
  } catch (err) {
    console.error("twilio-webhook error:", err);
    // Return 200 so Twilio doesn't retry
    return new Response("<Response></Response>", {
      headers: { "Content-Type": "text/xml" },
    });
  }
});

// --- SMS Inbound ---
async function handleSmsInbound(supabase: any, payload: Record<string, string>) {
  const to = payload.To;
  const from = payload.From;
  const body = payload.Body || "";
  const messageSid = payload.MessageSid || payload.SmsSid || "";
  const numSegments = parseInt(payload.NumSegments || "1", 10);

  const { data: phoneRecord } = await supabase
    .from("org_phone_numbers")
    .select("*")
    .eq("phone_number", to)
    .eq("status", "active")
    .single();

  if (!phoneRecord) {
    console.error("No org_phone_number found for:", to);
    return new Response("<Response></Response>", { headers: { "Content-Type": "text/xml" } });
  }

  const orgId = phoneRecord.organization_id;

  let { data: contact } = await supabase
    .from("inbox_contacts")
    .select("id")
    .eq("organization_id", orgId)
    .eq("phone", from)
    .single();

  if (!contact) {
    const { data: nc } = await supabase
      .from("inbox_contacts")
      .insert({
        organization_id: orgId,
        phone: from,
        name: null,
        consent: { sms: { status: "opted_in" } },
      })
      .select()
      .single();
    contact = nc;
  }

  if (!contact) {
    return new Response("<Response></Response>", { headers: { "Content-Type": "text/xml" } });
  }

  let { data: conversation } = await supabase
    .from("inbox_conversations")
    .select("id, unread_count")
    .eq("organization_id", orgId)
    .eq("channel_type", "sms")
    .eq("contact_id", contact.id)
    .neq("status", "closed")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const { data: smsChannel } = await supabase
    .from("inbox_channels")
    .select("id")
    .eq("organization_id", orgId)
    .eq("channel_type", "sms")
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!conversation) {
    const { data: nc } = await supabase
      .from("inbox_conversations")
      .insert({
        organization_id: orgId,
        channel_type: "sms",
        channel_id: smsChannel?.id || null,
        contact_id: contact.id,
        status: "open",
        last_message_at: new Date().toISOString(),
        last_inbound_at: new Date().toISOString(),
        unread_count: 1,
      })
      .select()
      .single();
    conversation = nc;
  } else {
    await supabase
      .from("inbox_conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_inbound_at: new Date().toISOString(),
        unread_count: (conversation.unread_count || 0) + 1,
        status: "open",
      })
      .eq("id", conversation.id);
  }

  if (!conversation) {
    return new Response("<Response></Response>", { headers: { "Content-Type": "text/xml" } });
  }

  await supabase.from("inbox_messages").insert({
    organization_id: orgId,
    conversation_id: conversation.id,
    direction: "inbound",
    msg_type: "text",
    content: { body },
    provider_message_id: messageSid,
    delivery_status: "delivered",
    created_by_type: "contact",
  });

  await supabase.from("telephony_usage_logs").insert({
    organization_id: orgId,
    phone_number_id: phoneRecord.id,
    event_type: "sms_inbound",
    direction: "inbound",
    segments: numSegments,
    from_number: from,
    to_number: to,
    twilio_sid: messageSid,
  });

  return new Response("<Response></Response>", {
    headers: { "Content-Type": "text/xml" },
  });
}

// --- Voice Inbound ---
async function handleVoiceInbound(supabase: any, payload: Record<string, string>) {
  const to = payload.To;
  const from = payload.From;
  const callSid = payload.CallSid || "";

  const { data: phoneRecord } = await supabase
    .from("org_phone_numbers")
    .select("*")
    .eq("phone_number", to)
    .eq("status", "active")
    .single();

  if (!phoneRecord) {
    return new Response(
      `<Response><Say>This number is not currently in service.</Say><Hangup/></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  }

  const orgId = phoneRecord.organization_id;
  const ivrConfig = phoneRecord.ivr_config || {};
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  // Log usage
  await supabase.from("telephony_usage_logs").insert({
    organization_id: orgId,
    phone_number_id: phoneRecord.id,
    event_type: "call_inbound",
    direction: "inbound",
    from_number: from,
    to_number: to,
    twilio_sid: callSid,
  });

  // Check recording settings — returns Dial attributes for recording
  const recordDialAttr = await getRecordingDialAttr(supabase, orgId, "inbound", supabaseUrl);

  // --- Tree-based IVR ---
  if (Array.isArray(ivrConfig?.nodes)) {
    const nodes = ivrConfig.nodes as any[];
    const rootNode = nodes.find((n: any) => n.id === "root") || nodes[0];

    if (!rootNode) {
      return new Response(
        `<Response><Say>Thank you for calling. Goodbye.</Say><Hangup/></Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    const twiml = generateNodeTwiML(rootNode, nodes, supabaseUrl, phoneRecord.id, recordDialAttr);
    return new Response(`<Response>${twiml}</Response>`, {
      headers: { "Content-Type": "text/xml" },
    });
  }

  // --- Legacy flat IVR ---
  const legacyConfig = ivrConfig as {
    greeting?: string;
    menu_options?: { digit: string; label: string; action: string }[];
    voicemail_enabled?: boolean;
  };

  const ivrActionUrl = `${supabaseUrl}/functions/v1/twilio-ivr-action?phone_id=${phoneRecord.id}`;
  const greeting = legacyConfig.greeting || "Thank you for calling. Please leave a message after the beep.";

  if (legacyConfig.menu_options && legacyConfig.menu_options.length > 0) {
    const menuPrompt = legacyConfig.menu_options
      .map((opt) => `Press ${opt.digit} for ${opt.label}.`)
      .join(" ");

    return new Response(
      `<Response>
        <Gather input="dtmf" numDigits="1" action="${ivrActionUrl}" method="POST" timeout="10">
          <Say>${greeting} ${menuPrompt}</Say>
        </Gather>
        <Say>We didn't receive any input. Goodbye.</Say>
        <Hangup/>
      </Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  }

  if (legacyConfig.voicemail_enabled !== false) {
    return new Response(
      `<Response>
        <Say>${greeting}</Say>
        <Record maxLength="120" transcribe="true" playBeep="true" />
        <Say>Goodbye.</Say>
        <Hangup/>
      </Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  }

  return new Response(
    `<Response><Say>${greeting}</Say><Hangup/></Response>`,
    { headers: { "Content-Type": "text/xml" } }
  );
}

// --- Recording Settings Helper ---
// Returns a string to insert into <Dial> as attributes for call recording,
// or an empty string if recording is not enabled.
async function getRecordingDialAttr(supabase: any, orgId: string, direction: string, supabaseUrl: string): Promise<string> {
  try {
    const { data: settings } = await supabase
      .from("call_recording_settings")
      .select("auto_record_all, auto_record_inbound, auto_record_outbound")
      .eq("organization_id", orgId)
      .maybeSingle();

    if (!settings) return "";

    const shouldRecord =
      settings.auto_record_all ||
      (direction === "inbound" && settings.auto_record_inbound) ||
      (direction === "outbound" && settings.auto_record_outbound);

    if (shouldRecord) {
      const recordingCallbackUrl = `${supabaseUrl}/functions/v1/twilio-recording-webhook`;
      return ` record="record-from-answer-dual" recordingStatusCallback="${recordingCallbackUrl}" recordingStatusCallbackMethod="POST" recordingStatusCallbackEvent="completed"`;
    }
  } catch (e) {
    console.error("Error checking recording settings:", e);
  }
  return "";
}

// --- Generate TwiML for tree nodes ---
function generateNodeTwiML(node: any, nodes: any[], supabaseUrl: string, phoneId: string, recordDialAttr: string = ""): string {
  switch (node.type) {
    case "greeting":
    case "message": {
      const sayText = node.greeting_text || "Thank you for calling.";
      const childId = node.children?.[0];
      if (childId) {
        const child = nodes.find((n: any) => n.id === childId);
        if (child) {
          if (child.type === "menu") {
            const actionUrl = `${supabaseUrl}/functions/v1/twilio-ivr-action?phone_id=${phoneId}&node_id=${child.id}`;
            const menuPrompt = (child.menu_options || [])
              .map((opt: any) => `Press ${opt.digit} for ${opt.label}.`)
              .join(" ");
            const timeout = child.timeout || 10;
            return `<Gather input="dtmf" numDigits="1" action="${actionUrl}" method="POST" timeout="${timeout}">
  <Say>${sayText} ${menuPrompt}</Say>
</Gather>
<Say>We didn't receive any input. Goodbye.</Say>
<Hangup/>`;
          }
          return `<Say>${sayText}</Say>\n${generateNodeTwiML(child, nodes, supabaseUrl, phoneId, recordDialAttr)}`;
        }
      }
      return `<Say>${sayText}</Say><Hangup/>`;
    }

    case "menu": {
      const actionUrl = `${supabaseUrl}/functions/v1/twilio-ivr-action?phone_id=${phoneId}&node_id=${node.id}`;
      const menuPrompt = (node.menu_options || [])
        .map((opt: any) => `Press ${opt.digit} for ${opt.label}.`)
        .join(" ");
      const timeout = node.timeout || 10;
      return `<Gather input="dtmf" numDigits="1" action="${actionUrl}" method="POST" timeout="${timeout}">
  <Say>${menuPrompt}</Say>
</Gather>
<Say>We didn't receive any input. Goodbye.</Say>
<Hangup/>`;
    }

    case "forward": {
      const number = node.forward_number || "";
      if (!number) return `<Say>No forwarding number configured. Goodbye.</Say><Hangup/>`;
      return `<Say>Connecting you now. Please hold.</Say><Dial${recordDialAttr}>${number}</Dial><Say>The call could not be completed. Goodbye.</Say><Hangup/>`;
    }

    case "queue": {
      const queueName = node.queue_name || "";
      if (!queueName) return `<Say>No queue configured. Goodbye.</Say><Hangup/>`;
      const holdMusic = node.hold_music_url || "";
      const waitUrl = holdMusic ? ` waitUrl="${holdMusic}"` : "";
      return `<Say>Please hold while we connect you to the next available agent.</Say><Enqueue${waitUrl}>${queueName}</Enqueue>`;
    }

    case "voicemail": {
      const prompt = node.voicemail_prompt || "Please leave a message after the beep.";
      const maxLength = node.voicemail_max_length || 120;
      return `<Say>${prompt}</Say><Record maxLength="${maxLength}" transcribe="true" playBeep="true" action="${supabaseUrl}/functions/v1/twilio-recording-webhook" method="POST" /><Say>Thank you. Goodbye.</Say><Hangup/>`;
    }

    case "hangup":
      return `<Hangup/>`;

    default:
      return `<Say>Thank you for calling.</Say><Hangup/>`;
  }
}

// --- Status Callback ---
async function handleStatusCallback(supabase: any, payload: Record<string, string>) {
  const messageSid = payload.MessageSid || payload.SmsSid;
  const callSid = payload.CallSid;
  const messageStatus = payload.MessageStatus || payload.SmsStatus;
  const callStatus = payload.CallStatus;
  const callDuration = payload.CallDuration;

  if (messageSid && messageStatus) {
    const statusMap: Record<string, string> = {
      queued: "pending",
      sent: "sent",
      delivered: "delivered",
      read: "read",
      failed: "failed",
      undelivered: "failed",
    };

    await supabase
      .from("inbox_messages")
      .update({
        delivery_status: statusMap[messageStatus] || messageStatus,
        delivery_status_updated_at: new Date().toISOString(),
        error_code: payload.ErrorCode || null,
        error_message: payload.ErrorMessage || null,
      })
      .eq("provider_message_id", messageSid);
  }

  if (callSid && callDuration) {
    await supabase
      .from("telephony_usage_logs")
      .update({
        duration_seconds: parseInt(callDuration, 10),
        metadata: { call_status: callStatus },
      })
      .eq("twilio_sid", callSid);
  }

  return new Response("<Response></Response>", {
    headers: { "Content-Type": "text/xml" },
  });
}

// --- Campaign Status Callback ---
async function handleCampaignStatusCallback(supabase: any, payload: Record<string, string>, reqUrl: URL) {
  const campaignId = reqUrl.searchParams.get("campaign_id");
  const contactId = reqUrl.searchParams.get("contact_id");
  const callStatus = payload.CallStatus;
  const callDuration = payload.CallDuration;
  const answeredBy = payload.AnsweredBy; // human, machine, unknown

  if (!campaignId || !contactId) {
    return new Response("<Response></Response>", { headers: { "Content-Type": "text/xml" } });
  }

  // Update contact status based on call outcome
  if (callStatus === "completed") {
    const durationSec = parseInt(callDuration || "0", 10);
    const outcome = answeredBy === "machine" ? "voicemail" : "connected";
    const status = "completed";

    await supabase
      .from("call_campaign_contacts")
      .update({
        status,
        outcome,
        duration_seconds: durationSec,
      })
      .eq("id", contactId);

    // Update campaign counters
    const counterUpdates: any = {
      completed_calls: supabase.rpc ? undefined : 0,
    };

    const { data: campaign } = await supabase
      .from("call_campaigns")
      .select("completed_calls, connected_calls, failed_calls")
      .eq("id", campaignId)
      .single();

    if (campaign) {
      const updates: any = {
        completed_calls: (campaign.completed_calls || 0) + 1,
      };
      if (outcome === "connected") {
        updates.connected_calls = (campaign.connected_calls || 0) + 1;
      }
      await supabase.from("call_campaigns").update(updates).eq("id", campaignId);
    }
  } else if (["busy", "no-answer", "failed", "canceled"].includes(callStatus)) {
    await supabase
      .from("call_campaign_contacts")
      .update({ status: "failed", outcome: callStatus })
      .eq("id", contactId);

    const { data: campaign } = await supabase
      .from("call_campaigns")
      .select("failed_calls")
      .eq("id", campaignId)
      .single();

    if (campaign) {
      await supabase
        .from("call_campaigns")
        .update({ failed_calls: (campaign.failed_calls || 0) + 1 })
        .eq("id", campaignId);
    }
  }

  // Update usage log with duration
  if (callDuration && payload.CallSid) {
    await supabase
      .from("telephony_usage_logs")
      .update({
        duration_seconds: parseInt(callDuration, 10),
        metadata: { call_status: callStatus, answered_by: answeredBy },
      })
      .eq("twilio_sid", payload.CallSid);
  }

  return new Response("<Response></Response>", { headers: { "Content-Type": "text/xml" } });
}
