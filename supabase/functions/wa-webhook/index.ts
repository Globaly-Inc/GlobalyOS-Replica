import { createClient } from "npm:@supabase/supabase-js@2";

// Webhook handler for Meta WhatsApp Cloud API
// No CORS needed — server-to-server only
// verify_jwt = false in config.toml

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const verifyToken = Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN");

  // GET = webhook verification (Meta challenge)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === verifyToken) {
      console.log("Webhook verified");
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // POST = incoming events
  if (req.method === "POST") {
    const adminClient = createClient(supabaseUrl, serviceKey);

    try {
      const body = await req.json();

      // Meta sends { object: "whatsapp_business_account", entry: [...] }
      if (body.object !== "whatsapp_business_account") {
        return new Response("OK", { status: 200 });
      }

      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field !== "messages") continue;

          const value = change.value;
          const phoneNumberId = value?.metadata?.phone_number_id;

          if (!phoneNumberId) continue;

          // Find org by phone_number_id
          const { data: account } = await adminClient
            .from("wa_accounts")
            .select("id, organization_id")
            .eq("phone_number_id", phoneNumberId)
            .eq("status", "connected")
            .maybeSingle();

          if (!account) {
            console.warn(`No account for phone_number_id: ${phoneNumberId}`);
            continue;
          }

          const orgId = account.organization_id;

          // Process inbound messages
          for (const message of value.messages || []) {
            await processInboundMessage(adminClient, orgId, message, value.contacts);
          }

          // Process status updates
          for (const status of value.statuses || []) {
            await processStatusUpdate(adminClient, orgId, status);
          }
        }
      }

      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("Webhook processing error:", err);
      // Always return 200 to Meta to prevent retries for parse errors
      return new Response("OK", { status: 200 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});

async function processInboundMessage(
  client: any,
  orgId: string,
  message: any,
  contacts: any[]
) {
  const waMessageId = message.id;

  // Idempotency check
  const { data: existing } = await client
    .from("wa_messages")
    .select("id")
    .eq("wa_message_id", waMessageId)
    .maybeSingle();

  if (existing) return; // Already processed

  const senderPhone = message.from;
  const contactInfo = contacts?.find((c: any) => c.wa_id === senderPhone);
  const contactName = contactInfo?.profile?.name || null;

  // Upsert wa_contact
  const { data: waContact } = await client
    .from("wa_contacts")
    .upsert(
      {
        organization_id: orgId,
        phone: senderPhone,
        name: contactName,
        last_inbound_at: new Date().toISOString(),
        opt_in_status: "opted_in", // They messaged us, implicit opt-in
        opt_in_source: "inbound_message",
        opt_in_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,phone", ignoreDuplicates: false }
    )
    .select("id")
    .single();

  if (!waContact) return;

  // Find or create conversation
  let { data: conversation } = await client
    .from("wa_conversations")
    .select("id, unread_count")
    .eq("organization_id", orgId)
    .eq("wa_contact_id", waContact.id)
    .neq("status", "closed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const windowOpenUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  if (!conversation) {
    const { data: newConv } = await client
      .from("wa_conversations")
      .insert({
        organization_id: orgId,
        wa_contact_id: waContact.id,
        status: "open",
        window_open_until: windowOpenUntil,
        last_message_at: new Date().toISOString(),
        unread_count: 1,
      })
      .select("id, unread_count")
      .single();
    conversation = newConv;
  } else {
    await client
      .from("wa_conversations")
      .update({
        window_open_until: windowOpenUntil,
        last_message_at: new Date().toISOString(),
        unread_count: (conversation.unread_count || 0) + 1,
        status: "open",
      })
      .eq("id", conversation.id);
  }

  if (!conversation) return;

  // Build message content
  const content: Record<string, any> = {};
  const msgType = message.type || "text";

  if (msgType === "text") {
    content.body = message.text?.body || "";
  } else if (["image", "video", "document", "audio"].includes(msgType)) {
    content.media_id = message[msgType]?.id;
    content.mime_type = message[msgType]?.mime_type;
    content.caption = message[msgType]?.caption;
  } else if (msgType === "interactive") {
    content.interactive = message.interactive;
  }

  // Map to valid enum
  const validTypes = ["text", "image", "video", "document", "template", "interactive", "flow"];
  const dbMsgType = validTypes.includes(msgType) ? msgType : "text";

  // Insert message
  await client.from("wa_messages").insert({
    organization_id: orgId,
    conversation_id: conversation.id,
    direction: "inbound",
    msg_type: dbMsgType,
    content,
    wa_message_id: waMessageId,
    status: "delivered",
    status_updated_at: new Date().toISOString(),
  });
}

async function processStatusUpdate(client: any, orgId: string, status: any) {
  const waMessageId = status.id;
  const statusValue = status.status; // sent, delivered, read, failed

  const validStatuses = ["sent", "delivered", "read", "failed"];
  if (!validStatuses.includes(statusValue)) return;

  const updateData: Record<string, any> = {
    status: statusValue,
    status_updated_at: new Date().toISOString(),
  };

  if (statusValue === "failed" && status.errors?.length) {
    updateData.error_code = String(status.errors[0].code);
    updateData.error_message = status.errors[0].title || status.errors[0].message;
  }

  await client
    .from("wa_messages")
    .update(updateData)
    .eq("wa_message_id", waMessageId)
    .eq("organization_id", orgId);
}
