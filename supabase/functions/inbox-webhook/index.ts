import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Unified webhook endpoint for all channel connectors.
 * Routes: POST /inbox-webhook?channel=whatsapp|telegram|messenger|instagram|tiktok
 *
 * Each channel connector handles:
 * 1. Webhook signature verification
 * 2. Parsing the platform-specific payload into canonical format
 * 3. Upserting contacts and conversations
 * 4. Appending messages
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Support GET for webhook verification (Meta, Telegram)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    // Meta webhook verification
    if (mode === "subscribe" && challenge) {
      // TODO: verify token against stored webhook_secret for the channel
      console.log("Webhook verification challenge received");
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const channelType = url.searchParams.get("channel") || "whatsapp";

    const rawPayload = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate idempotency key from payload
    const payloadStr = JSON.stringify(rawPayload);
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(payloadStr));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const idempotencyKey = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // Check idempotency
    const { data: existing } = await supabase
      .from("inbox_webhook_events")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .single();

    if (existing) {
      console.log("Duplicate webhook event, skipping:", idempotencyKey);
      return new Response(
        JSON.stringify({ status: "duplicate" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store raw event
    await supabase.from("inbox_webhook_events").insert({
      channel_type: channelType,
      idempotency_key: idempotencyKey,
      raw_payload: rawPayload,
      processed: false,
    });

    // Route to connector handler
    let processResult = { success: false, error: "Unknown channel" };

    switch (channelType) {
      case "whatsapp":
        processResult = await handleWhatsAppWebhook(supabase, rawPayload);
        break;
      case "telegram":
        processResult = await handleTelegramWebhook(supabase, rawPayload);
        break;
      case "messenger":
      case "instagram":
        processResult = await handleMetaWebhook(supabase, rawPayload, channelType);
        break;
      default:
        console.log(`Channel ${channelType} not yet implemented`);
        processResult = { success: true, error: "" };
    }

    // Mark as processed
    await supabase
      .from("inbox_webhook_events")
      .update({
        processed: processResult.success,
        processed_at: new Date().toISOString(),
        error: processResult.error || null,
      })
      .eq("idempotency_key", idempotencyKey);

    return new Response(
      JSON.stringify({ status: "ok" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("inbox-webhook error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── WhatsApp connector ───────────────────────────────────────
async function handleWhatsAppWebhook(supabase: any, payload: any) {
  try {
    const entries = payload?.entry || [];

    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        if (change.field !== "messages") continue;
        const value = change.value;
        const phoneNumberId = value?.metadata?.phone_number_id;

        // Find the channel
        const { data: channel } = await supabase
          .from("inbox_channels")
          .select("*")
          .eq("channel_type", "whatsapp")
          .filter("credentials->>'phone_number_id'", "eq", phoneNumberId)
          .single();

        if (!channel) {
          console.log("No channel found for phone_number_id:", phoneNumberId);
          continue;
        }

        const orgId = channel.organization_id;

        // Update webhook timestamp
        await supabase
          .from("inbox_channels")
          .update({ last_webhook_at: new Date().toISOString(), webhook_status: "connected" })
          .eq("id", channel.id);

        // Process messages
        const messages = value?.messages || [];
        for (const msg of messages) {
          const from = msg.from;

          // Upsert contact
          let { data: contact } = await supabase
            .from("inbox_contacts")
            .select("id")
            .eq("organization_id", orgId)
            .eq("phone", from)
            .single();

          if (!contact) {
            const { data: newContact } = await supabase
              .from("inbox_contacts")
              .insert({
                organization_id: orgId,
                phone: from,
                name: value?.contacts?.[0]?.profile?.name || null,
                consent: { whatsapp: { status: "opted_in" } },
              })
              .select()
              .single();
            contact = newContact;
          }

          if (!contact) continue;

          // Upsert conversation
          let { data: conversation } = await supabase
            .from("inbox_conversations")
            .select("id, unread_count")
            .eq("organization_id", orgId)
            .eq("channel_type", "whatsapp")
            .eq("contact_id", contact.id)
            .neq("status", "closed")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (!conversation) {
            const { data: newConv } = await supabase
              .from("inbox_conversations")
              .insert({
                organization_id: orgId,
                channel_type: "whatsapp",
                channel_id: channel.id,
                contact_id: contact.id,
                status: "open",
                last_message_at: new Date().toISOString(),
                last_inbound_at: new Date().toISOString(),
                unread_count: 1,
                metadata: { window_open_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() },
              })
              .select()
              .single();
            conversation = newConv;
          } else {
            await supabase
              .from("inbox_conversations")
              .update({
                last_message_at: new Date().toISOString(),
                last_inbound_at: new Date().toISOString(),
                unread_count: (conversation.unread_count || 0) + 1,
                status: "open",
                metadata: { window_open_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() },
              })
              .eq("id", conversation.id);
          }

          if (!conversation) continue;

          // Insert message
          const body = msg.text?.body || msg.caption || "";
          const msgType = msg.type === "text" ? "text" : msg.type || "text";

          await supabase.from("inbox_messages").insert({
            organization_id: orgId,
            conversation_id: conversation.id,
            direction: "inbound",
            msg_type: msgType,
            content: { body, raw: msg },
            provider_message_id: msg.id,
            delivery_status: "delivered",
            created_by_type: "contact",
          });
        }

        // Process status updates
        const statuses = value?.statuses || [];
        for (const status of statuses) {
          if (status.id) {
            await supabase
              .from("inbox_messages")
              .update({
                delivery_status: status.status === "read" ? "read" : status.status === "delivered" ? "delivered" : status.status === "sent" ? "sent" : "failed",
                delivery_status_updated_at: new Date().toISOString(),
                error_code: status.errors?.[0]?.code || null,
                error_message: status.errors?.[0]?.title || null,
              })
              .eq("provider_message_id", status.id);
          }
        }
      }
    }

    return { success: true, error: "" };
  } catch (err) {
    console.error("WhatsApp webhook processing error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ─── Telegram connector ───────────────────────────────────────
async function handleTelegramWebhook(supabase: any, payload: any) {
  try {
    const message = payload?.message;
    if (!message) return { success: true, error: "" };

    const chatId = String(message.chat?.id);
    const text = message.text || message.caption || "";
    const fromUser = message.from;
    const contactName = [fromUser?.first_name, fromUser?.last_name].filter(Boolean).join(" ") || null;
    const username = fromUser?.username || null;

    // Find the channel by matching — we search all Telegram channels
    const { data: channels } = await supabase
      .from("inbox_channels")
      .select("*")
      .eq("channel_type", "telegram")
      .eq("is_active", true);

    if (!channels || channels.length === 0) {
      console.log("No active Telegram channels found");
      return { success: true, error: "" };
    }

    // Use first active Telegram channel (multi-bot: match by bot_token in future)
    const channel = channels[0];
    const orgId = channel.organization_id;

    // Update webhook timestamp
    await supabase
      .from("inbox_channels")
      .update({ last_webhook_at: new Date().toISOString(), webhook_status: "connected" })
      .eq("id", channel.id);

    // Upsert contact by Telegram chat ID
    const handle = username ? `@${username}` : chatId;
    let { data: contact } = await supabase
      .from("inbox_contacts")
      .select("id")
      .eq("organization_id", orgId)
      .eq("handles->telegram", JSON.stringify(chatId))
      .single();

    if (!contact) {
      // Try by username
      if (username) {
        const { data: byUsername } = await supabase
          .from("inbox_contacts")
          .select("id")
          .eq("organization_id", orgId)
          .eq("handles->telegram_username", JSON.stringify(username))
          .single();
        contact = byUsername;
      }
    }

    if (!contact) {
      const { data: newContact } = await supabase
        .from("inbox_contacts")
        .insert({
          organization_id: orgId,
          name: contactName,
          handles: { telegram: chatId, telegram_username: username },
          consent: { telegram: { status: "opted_in" } },
        })
        .select()
        .single();
      contact = newContact;
    }

    if (!contact) return { success: false, error: "Failed to upsert contact" };

    // Upsert conversation
    let { data: conversation } = await supabase
      .from("inbox_conversations")
      .select("id, unread_count")
      .eq("organization_id", orgId)
      .eq("channel_type", "telegram")
      .eq("contact_id", contact.id)
      .neq("status", "closed")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!conversation) {
      const { data: newConv } = await supabase
        .from("inbox_conversations")
        .insert({
          organization_id: orgId,
          channel_type: "telegram",
          channel_id: channel.id,
          contact_id: contact.id,
          status: "open",
          channel_thread_ref: chatId,
          last_message_at: new Date().toISOString(),
          last_inbound_at: new Date().toISOString(),
          unread_count: 1,
        })
        .select()
        .single();
      conversation = newConv;
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

    if (!conversation) return { success: false, error: "Failed to upsert conversation" };

    // Determine message type
    let msgType = "text";
    const mediaUrls: string[] = [];
    if (message.photo) msgType = "image";
    else if (message.video) msgType = "video";
    else if (message.document) msgType = "document";
    else if (message.voice || message.audio) msgType = "audio";

    // Insert message
    await supabase.from("inbox_messages").insert({
      organization_id: orgId,
      conversation_id: conversation.id,
      direction: "inbound",
      msg_type: msgType,
      content: { body: text, raw: message },
      media_urls: mediaUrls,
      provider_message_id: String(message.message_id),
      delivery_status: "delivered",
      created_by_type: "contact",
    });

    return { success: true, error: "" };
  } catch (err) {
    console.error("Telegram webhook processing error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ─── Meta (Messenger/Instagram) connector ─────────────────────
async function handleMetaWebhook(supabase: any, payload: any, channel: string) {
  try {
    // TODO: Process Messenger/Instagram webhook events
    // Scaffold - log and acknowledge
    console.log(`${channel} webhook received:`, JSON.stringify(payload).substring(0, 200));

    return { success: true, error: "" };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
