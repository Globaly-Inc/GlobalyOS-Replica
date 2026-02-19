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

  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && challenge) {
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

    const payloadStr = JSON.stringify(rawPayload);
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(payloadStr));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const idempotencyKey = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    const { data: existing } = await supabase
      .from("inbox_webhook_events")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .single();

    if (existing) {
      return new Response(JSON.stringify({ status: "duplicate" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("inbox_webhook_events").insert({
      channel_type: channelType,
      idempotency_key: idempotencyKey,
      raw_payload: rawPayload,
      processed: false,
    });

    let processResult = { success: false, error: "Unknown channel" };

    switch (channelType) {
      case "whatsapp":
        processResult = await handleWhatsAppWebhook(supabase, rawPayload);
        break;
      case "telegram":
        processResult = await handleTelegramWebhook(supabase, rawPayload);
        break;
      case "messenger":
        processResult = await handleMessengerWebhook(supabase, rawPayload);
        break;
      case "instagram":
        processResult = await handleInstagramWebhook(supabase, rawPayload);
        break;
      default:
        processResult = { success: true, error: "" };
    }

    await supabase
      .from("inbox_webhook_events")
      .update({
        processed: processResult.success,
        processed_at: new Date().toISOString(),
        error: processResult.error || null,
      })
      .eq("idempotency_key", idempotencyKey);

    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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

        const { data: channel } = await supabase
          .from("inbox_channels")
          .select("*")
          .eq("channel_type", "whatsapp")
          .filter("credentials->>'phone_number_id'", "eq", phoneNumberId)
          .single();

        if (!channel) continue;
        const orgId = channel.organization_id;

        await supabase
          .from("inbox_channels")
          .update({ last_webhook_at: new Date().toISOString(), webhook_status: "connected" })
          .eq("id", channel.id);

        const messages = value?.messages || [];
        for (const msg of messages) {
          const from = msg.from;
          let { data: contact } = await supabase
            .from("inbox_contacts").select("id")
            .eq("organization_id", orgId).eq("phone", from).single();

          if (!contact) {
            const { data: nc } = await supabase
              .from("inbox_contacts")
              .insert({ organization_id: orgId, phone: from, name: value?.contacts?.[0]?.profile?.name || null, consent: { whatsapp: { status: "opted_in" } } })
              .select().single();
            contact = nc;
          }
          if (!contact) continue;

          let { data: conversation } = await supabase
            .from("inbox_conversations").select("id, unread_count")
            .eq("organization_id", orgId).eq("channel_type", "whatsapp").eq("contact_id", contact.id)
            .neq("status", "closed").order("created_at", { ascending: false }).limit(1).single();

          if (!conversation) {
            const { data: nc } = await supabase
              .from("inbox_conversations")
              .insert({ organization_id: orgId, channel_type: "whatsapp", channel_id: channel.id, contact_id: contact.id, status: "open", last_message_at: new Date().toISOString(), last_inbound_at: new Date().toISOString(), unread_count: 1, metadata: { window_open_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() } })
              .select().single();
            conversation = nc;
          } else {
            await supabase.from("inbox_conversations").update({ last_message_at: new Date().toISOString(), last_inbound_at: new Date().toISOString(), unread_count: (conversation.unread_count || 0) + 1, status: "open", metadata: { window_open_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() } }).eq("id", conversation.id);
          }
          if (!conversation) continue;

          const body = msg.text?.body || msg.caption || "";
          const msgType = msg.type === "text" ? "text" : msg.type || "text";
          await supabase.from("inbox_messages").insert({ organization_id: orgId, conversation_id: conversation.id, direction: "inbound", msg_type: msgType, content: { body, raw: msg }, provider_message_id: msg.id, delivery_status: "delivered", created_by_type: "contact" });
        }

        const statuses = value?.statuses || [];
        for (const status of statuses) {
          if (status.id) {
            await supabase.from("inbox_messages").update({ delivery_status: status.status === "read" ? "read" : status.status === "delivered" ? "delivered" : status.status === "sent" ? "sent" : "failed", delivery_status_updated_at: new Date().toISOString(), error_code: status.errors?.[0]?.code || null, error_message: status.errors?.[0]?.title || null }).eq("provider_message_id", status.id);
          }
        }
      }
    }
    return { success: true, error: "" };
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
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

    const { data: channels } = await supabase.from("inbox_channels").select("*").eq("channel_type", "telegram").eq("is_active", true);
    if (!channels?.length) return { success: true, error: "" };

    const channel = channels[0];
    const orgId = channel.organization_id;

    await supabase.from("inbox_channels").update({ last_webhook_at: new Date().toISOString(), webhook_status: "connected" }).eq("id", channel.id);

    let { data: contact } = await supabase.from("inbox_contacts").select("id").eq("organization_id", orgId).eq("handles->telegram", JSON.stringify(chatId)).single();
    if (!contact && username) {
      const { data: byUsername } = await supabase.from("inbox_contacts").select("id").eq("organization_id", orgId).eq("handles->telegram_username", JSON.stringify(username)).single();
      contact = byUsername;
    }
    if (!contact) {
      const { data: nc } = await supabase.from("inbox_contacts").insert({ organization_id: orgId, name: contactName, handles: { telegram: chatId, telegram_username: username }, consent: { telegram: { status: "opted_in" } } }).select().single();
      contact = nc;
    }
    if (!contact) return { success: false, error: "Failed to upsert contact" };

    let { data: conversation } = await supabase.from("inbox_conversations").select("id, unread_count").eq("organization_id", orgId).eq("channel_type", "telegram").eq("contact_id", contact.id).neq("status", "closed").order("created_at", { ascending: false }).limit(1).single();
    if (!conversation) {
      const { data: nc } = await supabase.from("inbox_conversations").insert({ organization_id: orgId, channel_type: "telegram", channel_id: channel.id, contact_id: contact.id, status: "open", channel_thread_ref: chatId, last_message_at: new Date().toISOString(), last_inbound_at: new Date().toISOString(), unread_count: 1 }).select().single();
      conversation = nc;
    } else {
      await supabase.from("inbox_conversations").update({ last_message_at: new Date().toISOString(), last_inbound_at: new Date().toISOString(), unread_count: (conversation.unread_count || 0) + 1, status: "open" }).eq("id", conversation.id);
    }
    if (!conversation) return { success: false, error: "Failed to upsert conversation" };

    let msgType = "text";
    if (message.photo) msgType = "image";
    else if (message.video) msgType = "video";
    else if (message.document) msgType = "document";
    else if (message.voice || message.audio) msgType = "audio";

    await supabase.from("inbox_messages").insert({ organization_id: orgId, conversation_id: conversation.id, direction: "inbound", msg_type: msgType, content: { body: text, raw: message }, media_urls: [], provider_message_id: String(message.message_id), delivery_status: "delivered", created_by_type: "contact" });
    return { success: true, error: "" };
  } catch (err) {
    console.error("Telegram webhook error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ─── Messenger connector ─────────────────────────────────────
async function handleMessengerWebhook(supabase: any, payload: any) {
  try {
    const entries = payload?.entry || [];
    for (const entry of entries) {
      const pageId = entry.id;
      const messaging = entry?.messaging || [];

      // Find channel by page_id
      const { data: channel } = await supabase
        .from("inbox_channels")
        .select("*")
        .eq("channel_type", "messenger")
        .filter("credentials->>'page_id'", "eq", pageId)
        .single();

      if (!channel) {
        console.log("No messenger channel found for page_id:", pageId);
        continue;
      }

      const orgId = channel.organization_id;
      await supabase.from("inbox_channels").update({ last_webhook_at: new Date().toISOString(), webhook_status: "connected" }).eq("id", channel.id);

      for (const event of messaging) {
        const senderId = event.sender?.id;
        if (!senderId || senderId === pageId) continue; // Skip messages from the page itself

        const message = event.message;
        if (!message) continue; // Skip non-message events (read receipts, deliveries, etc.)

        const text = message.text || "";
        const attachments = message.attachments || [];

        // Upsert contact by messenger PSID
        let { data: contact } = await supabase
          .from("inbox_contacts").select("id")
          .eq("organization_id", orgId)
          .eq("handles->messenger", JSON.stringify(senderId))
          .single();

        if (!contact) {
          // Try to get name from Graph API
          let contactName: string | null = null;
          const creds = channel.credentials as { page_access_token?: string };
          if (creds.page_access_token) {
            try {
              const profileRes = await fetch(`https://graph.facebook.com/${senderId}?fields=first_name,last_name&access_token=${creds.page_access_token}`);
              if (profileRes.ok) {
                const profile = await profileRes.json();
                contactName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || null;
              }
            } catch { /* ignore profile fetch errors */ }
          }

          const { data: nc } = await supabase.from("inbox_contacts")
            .insert({ organization_id: orgId, name: contactName, handles: { messenger: senderId }, consent: { messenger: { status: "opted_in" } } })
            .select().single();
          contact = nc;
        }
        if (!contact) continue;

        // Upsert conversation
        let { data: conversation } = await supabase
          .from("inbox_conversations").select("id, unread_count")
          .eq("organization_id", orgId).eq("channel_type", "messenger").eq("contact_id", contact.id)
          .neq("status", "closed").order("created_at", { ascending: false }).limit(1).single();

        if (!conversation) {
          const { data: nc } = await supabase.from("inbox_conversations")
            .insert({ organization_id: orgId, channel_type: "messenger", channel_id: channel.id, contact_id: contact.id, status: "open", channel_thread_ref: senderId, last_message_at: new Date().toISOString(), last_inbound_at: new Date().toISOString(), unread_count: 1 })
            .select().single();
          conversation = nc;
        } else {
          await supabase.from("inbox_conversations").update({ last_message_at: new Date().toISOString(), last_inbound_at: new Date().toISOString(), unread_count: (conversation.unread_count || 0) + 1, status: "open" }).eq("id", conversation.id);
        }
        if (!conversation) continue;

        // Determine type
        let msgType = "text";
        const mediaUrls: string[] = [];
        if (attachments.length > 0) {
          const att = attachments[0];
          if (att.type === "image") { msgType = "image"; mediaUrls.push(att.payload?.url || ""); }
          else if (att.type === "video") { msgType = "video"; mediaUrls.push(att.payload?.url || ""); }
          else if (att.type === "audio") { msgType = "audio"; mediaUrls.push(att.payload?.url || ""); }
          else if (att.type === "file") { msgType = "document"; mediaUrls.push(att.payload?.url || ""); }
        }

        await supabase.from("inbox_messages").insert({
          organization_id: orgId, conversation_id: conversation.id, direction: "inbound",
          msg_type: msgType, content: { body: text, raw: message },
          media_urls: mediaUrls.filter(Boolean), provider_message_id: message.mid || "",
          delivery_status: "delivered", created_by_type: "contact",
        });
      }
    }
    return { success: true, error: "" };
  } catch (err) {
    console.error("Messenger webhook error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ─── Instagram connector ─────────────────────────────────────
async function handleInstagramWebhook(supabase: any, payload: any) {
  try {
    const entries = payload?.entry || [];
    for (const entry of entries) {
      const messaging = entry?.messaging || [];
      const igAccountId = entry.id;

      // Find channel by ig_account_id
      const { data: channel } = await supabase
        .from("inbox_channels")
        .select("*")
        .eq("channel_type", "instagram")
        .filter("credentials->>'ig_account_id'", "eq", igAccountId)
        .single();

      if (!channel) {
        console.log("No Instagram channel found for account:", igAccountId);
        continue;
      }

      const orgId = channel.organization_id;
      await supabase.from("inbox_channels").update({ last_webhook_at: new Date().toISOString(), webhook_status: "connected" }).eq("id", channel.id);

      for (const event of messaging) {
        const senderId = event.sender?.id;
        if (!senderId || senderId === igAccountId) continue;

        const message = event.message;
        if (!message) continue;

        const text = message.text || "";
        const attachments = message.attachments || [];

        // Upsert contact by Instagram IGSID
        let { data: contact } = await supabase
          .from("inbox_contacts").select("id")
          .eq("organization_id", orgId)
          .eq("handles->instagram", JSON.stringify(senderId))
          .single();

        if (!contact) {
          let contactName: string | null = null;
          const creds = channel.credentials as { page_access_token?: string };
          if (creds.page_access_token) {
            try {
              const profileRes = await fetch(`https://graph.facebook.com/${senderId}?fields=name,username&access_token=${creds.page_access_token}`);
              if (profileRes.ok) {
                const profile = await profileRes.json();
                contactName = profile.name || profile.username || null;
              }
            } catch { /* ignore */ }
          }

          const { data: nc } = await supabase.from("inbox_contacts")
            .insert({ organization_id: orgId, name: contactName, handles: { instagram: senderId }, consent: { instagram: { status: "opted_in" } } })
            .select().single();
          contact = nc;
        }
        if (!contact) continue;

        // Upsert conversation
        let { data: conversation } = await supabase
          .from("inbox_conversations").select("id, unread_count")
          .eq("organization_id", orgId).eq("channel_type", "instagram").eq("contact_id", contact.id)
          .neq("status", "closed").order("created_at", { ascending: false }).limit(1).single();

        if (!conversation) {
          const { data: nc } = await supabase.from("inbox_conversations")
            .insert({ organization_id: orgId, channel_type: "instagram", channel_id: channel.id, contact_id: contact.id, status: "open", channel_thread_ref: senderId, last_message_at: new Date().toISOString(), last_inbound_at: new Date().toISOString(), unread_count: 1 })
            .select().single();
          conversation = nc;
        } else {
          await supabase.from("inbox_conversations").update({ last_message_at: new Date().toISOString(), last_inbound_at: new Date().toISOString(), unread_count: (conversation.unread_count || 0) + 1, status: "open" }).eq("id", conversation.id);
        }
        if (!conversation) continue;

        let msgType = "text";
        const mediaUrls: string[] = [];
        if (attachments.length > 0) {
          const att = attachments[0];
          if (att.type === "image") { msgType = "image"; mediaUrls.push(att.payload?.url || ""); }
          else if (att.type === "video") { msgType = "video"; mediaUrls.push(att.payload?.url || ""); }
          else if (att.type === "audio") { msgType = "audio"; mediaUrls.push(att.payload?.url || ""); }
          else if (att.type === "share") { msgType = "interactive"; }
        }

        await supabase.from("inbox_messages").insert({
          organization_id: orgId, conversation_id: conversation.id, direction: "inbound",
          msg_type: msgType, content: { body: text, raw: message },
          media_urls: mediaUrls.filter(Boolean), provider_message_id: message.mid || "",
          delivery_status: "delivered", created_by_type: "contact",
        });
      }
    }
    return { success: true, error: "" };
  } catch (err) {
    console.error("Instagram webhook error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
