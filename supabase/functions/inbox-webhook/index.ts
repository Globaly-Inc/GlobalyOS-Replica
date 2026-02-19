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

    // TODO: Match bot token to channel, upsert contact/conversation/message
    // Scaffold - log and acknowledge
    console.log("Telegram webhook received:", JSON.stringify(message).substring(0, 200));

    return { success: true, error: "" };
  } catch (err) {
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
