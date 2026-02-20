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
    const {
      conversation_id,
      organization_id,
      content,
      msg_type = "text",
      template_name,
      template_params,
    } = await req.json();

    if (!conversation_id || !organization_id) {
      return new Response(
        JSON.stringify({ error: "conversation_id and organization_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get conversation with channel and contact
    const { data: conversation, error: convError } = await supabase
      .from("inbox_conversations")
      .select("*, inbox_channels(*), inbox_contacts(*)")
      .eq("id", conversation_id)
      .eq("organization_id", organization_id)
      .single();

    if (convError || !conversation) {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the auth user
    const authHeader = req.headers.get("Authorization");
    let createdBy: string | null = null;
    if (authHeader) {
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await anonClient.auth.getUser();
      createdBy = user?.id || null;
    }

    const isNote = msg_type === "note";
    const channelType = conversation.channel_type;

    // ─── WhatsApp compliance checks ───────────────────────────────
    if (channelType === "whatsapp" && !isNote) {
      const metadata = conversation.metadata as { window_open_until?: string } || {};
      const windowEnd = metadata.window_open_until ? new Date(metadata.window_open_until) : null;
      const windowExpired = !windowEnd || windowEnd < new Date();

      if (windowExpired && !template_name) {
        return new Response(
          JSON.stringify({
            error: "WhatsApp 24h window expired. Only template messages can be sent.",
            code: "WHATSAPP_WINDOW_EXPIRED",
          }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check opt-in
      const contact = conversation.inbox_contacts;
      const consent = (contact?.consent as Record<string, { status?: string }>) || {};
      if (!consent.whatsapp || consent.whatsapp.status !== "opted_in") {
        return new Response(
          JSON.stringify({
            error: "Contact has not opted in for WhatsApp messages",
            code: "WHATSAPP_OPT_IN_REQUIRED",
          }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ─── Insert the message ───────────────────────────────────────
    const { data: message, error: msgError } = await supabase
      .from("inbox_messages")
      .insert({
        organization_id,
        conversation_id,
        direction: "outbound",
        msg_type: isNote ? "note" : msg_type,
        content: content,
        template_id: template_name || null,
        delivery_status: isNote ? "delivered" : "pending",
        created_by: createdBy,
        created_by_type: "agent",
      })
      .select()
      .single();

    if (msgError) {
      console.error("Failed to insert message:", msgError);
      return new Response(
        JSON.stringify({ error: "Failed to save message" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update conversation
    const convUpdate: Record<string, unknown> = {
      last_message_at: new Date().toISOString(),
      last_outbound_at: new Date().toISOString(),
    };
    if (!isNote && conversation.status === "open" && !conversation.first_response_at) {
      convUpdate.first_response_at = new Date().toISOString();
    }
    await supabase
      .from("inbox_conversations")
      .update(convUpdate)
      .eq("id", conversation_id);

    // ─── Dispatch to channel connector ────────────────────────────
    if (!isNote) {
      let dispatchResult = { success: false, provider_message_id: "" };

      switch (channelType) {
        case "whatsapp":
          dispatchResult = await dispatchWhatsApp(
            conversation,
            content,
            template_name,
            template_params
          );
          break;
        case "telegram":
          dispatchResult = await dispatchTelegram(conversation, content);
          break;
        case "sms":
          dispatchResult = await dispatchSms(supabase, conversation, content, organization_id);
          break;
        default:
          // For other channels, mark as sent (simulated)
          dispatchResult = { success: true, provider_message_id: "" };
          break;
      }

      // Update delivery status
      await supabase
        .from("inbox_messages")
        .update({
          delivery_status: dispatchResult.success ? "sent" : "failed",
          provider_message_id: dispatchResult.provider_message_id || null,
          error_message: dispatchResult.success ? null : "Dispatch failed",
        })
        .eq("id", message.id);
    }

    return new Response(
      JSON.stringify({ success: true, message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("inbox-send error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── WhatsApp dispatch ────────────────────────────────────────
async function dispatchWhatsApp(
  conversation: any,
  content: Record<string, unknown>,
  templateName?: string,
  templateParams?: Record<string, unknown>
): Promise<{ success: boolean; provider_message_id: string }> {
  const channel = conversation.inbox_channels;
  const contact = conversation.inbox_contacts;

  if (!channel?.credentials) {
    console.error("No WhatsApp channel credentials");
    return { success: false, provider_message_id: "" };
  }

  const creds = channel.credentials as {
    access_token?: string;
    phone_number_id?: string;
  };

  if (!creds.access_token || !creds.phone_number_id) {
    console.error("Missing WhatsApp access_token or phone_number_id");
    return { success: false, provider_message_id: "" };
  }

  const recipientPhone = contact?.phone;
  if (!recipientPhone) {
    console.error("No recipient phone number");
    return { success: false, provider_message_id: "" };
  }

  try {
    let body: Record<string, unknown>;

    if (templateName) {
      // Template message
      body = {
        messaging_product: "whatsapp",
        to: recipientPhone,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en" },
          ...(templateParams || {}),
        },
      };
    } else {
      // Text message
      body = {
        messaging_product: "whatsapp",
        to: recipientPhone,
        type: "text",
        text: { body: (content as { body?: string })?.body || "" },
      };
    }

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${creds.phone_number_id}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API error:", data);
      return { success: false, provider_message_id: "" };
    }

    const providerMsgId = data.messages?.[0]?.id || "";
    return { success: true, provider_message_id: providerMsgId };
  } catch (err) {
    console.error("WhatsApp dispatch error:", err);
    return { success: false, provider_message_id: "" };
  }
}

// ─── Telegram dispatch ────────────────────────────────────────
async function dispatchTelegram(
  conversation: any,
  content: Record<string, unknown>
): Promise<{ success: boolean; provider_message_id: string }> {
  const channel = conversation.inbox_channels;
  if (!channel?.credentials) {
    return { success: false, provider_message_id: "" };
  }

  const creds = channel.credentials as { bot_token?: string };
  const chatId = conversation.channel_thread_ref;

  if (!creds.bot_token || !chatId) {
    console.error("Missing Telegram bot_token or chat_id");
    return { success: false, provider_message_id: "" };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${creds.bot_token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: (content as { body?: string })?.body || "",
        }),
      }
    );

    const data = await response.json();
    if (!response.ok || !data.ok) {
      console.error("Telegram API error:", data);
      return { success: false, provider_message_id: "" };
    }

    return { success: true, provider_message_id: String(data.result?.message_id || "") };
  } catch (err) {
    console.error("Telegram dispatch error:", err);
    return { success: false, provider_message_id: "" };
  }
}

// ─── SMS (Twilio) dispatch ────────────────────────────────────
async function dispatchSms(
  supabase: any,
  conversation: any,
  content: Record<string, unknown>,
  organizationId: string
): Promise<{ success: boolean; provider_message_id: string }> {
  const contact = conversation.inbox_contacts;
  const recipientPhone = contact?.phone;

  if (!recipientPhone) {
    console.error("No recipient phone number for SMS");
    return { success: false, provider_message_id: "" };
  }

  // Find the org's active phone number
  const { data: phoneRecord } = await supabase
    .from("org_phone_numbers")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .limit(1)
    .single();

  if (!phoneRecord) {
    console.error("No active phone number for org:", organizationId);
    return { success: false, provider_message_id: "" };
  }

  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");

  if (!accountSid || !authToken) {
    console.error("Twilio credentials not configured");
    return { success: false, provider_message_id: "" };
  }

  try {
    const params = new URLSearchParams();
    params.set("To", recipientPhone);
    params.set("From", phoneRecord.phone_number);
    params.set("Body", (content as { body?: string })?.body || "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    params.set("StatusCallback", `${supabaseUrl}/functions/v1/twilio-webhook?type=status`);

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Twilio SMS error:", data);
      return { success: false, provider_message_id: "" };
    }

    // Log usage
    await supabase.from("telephony_usage_logs").insert({
      organization_id: organizationId,
      phone_number_id: phoneRecord.id,
      event_type: "sms_outbound",
      direction: "outbound",
      segments: data.num_segments ? parseInt(data.num_segments, 10) : 1,
      from_number: phoneRecord.phone_number,
      to_number: recipientPhone,
      twilio_sid: data.sid,
      cost: data.price ? Math.abs(parseFloat(data.price)) : 0,
    });

    return { success: true, provider_message_id: data.sid || "" };
  } catch (err) {
    console.error("SMS dispatch error:", err);
    return { success: false, provider_message_id: "" };
  }
}
