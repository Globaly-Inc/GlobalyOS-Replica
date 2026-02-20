/**
 * gmail-sync
 * Pulls recent emails from Gmail API using stored OAuth tokens,
 * creates/updates inbox_conversations and inbox_messages.
 * Uses incremental sync via Gmail history ID.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const clientId = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET")!;

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    console.error("Token refresh failed:", await res.text());
    return null;
  }
  return await res.json();
}

async function getValidAccessToken(supabase: any, settings: any): Promise<string | null> {
  const expiresAt = settings.google_token_expires_at ? new Date(settings.google_token_expires_at) : null;
  const isExpired = !expiresAt || expiresAt < new Date(Date.now() + 60_000);

  if (!isExpired && settings.google_access_token) {
    return settings.google_access_token;
  }

  if (!settings.google_refresh_token) return null;

  const refreshed = await refreshAccessToken(settings.google_refresh_token);
  if (!refreshed) return null;

  const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  await supabase
    .from("scheduler_integration_settings")
    .update({
      google_access_token: refreshed.access_token,
      google_token_expires_at: newExpiry,
    })
    .eq("id", settings.id);

  return refreshed.access_token;
}

function decodeBase64Url(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return atob(base64);
  } catch {
    return "";
  }
}

function extractEmailBody(payload: any): string {
  if (!payload) return "";

  // Simple text/plain body
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  // text/html as fallback
  if (payload.mimeType === "text/html" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  // Multipart: recurse
  if (payload.parts) {
    // Prefer text/plain
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    // Fall back to text/html
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    // Recurse into nested multipart
    for (const part of payload.parts) {
      const body = extractEmailBody(part);
      if (body) return body;
    }
  }

  return "";
}

function getHeader(headers: any[], name: string): string {
  return headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

function extractEmailAddress(headerValue: string): string {
  const match = headerValue.match(/<([^>]+)>/);
  return match ? match[1] : headerValue.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organization_id, user_id, max_results = 20 } = await req.json();

    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: "organization_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Google tokens from scheduler_integration_settings
    let settingsQuery = supabase
      .from("scheduler_integration_settings")
      .select("*")
      .eq("organization_id", organization_id)
      .eq("google_calendar_connected", true);

    if (user_id) {
      settingsQuery = settingsQuery.eq("user_id", user_id);
    }

    const { data: allSettings, error: settingsErr } = await settingsQuery;

    if (settingsErr || !allSettings?.length) {
      return new Response(
        JSON.stringify({ error: "No connected Google accounts found", synced: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalSynced = 0;

    for (const settings of allSettings) {
      const accessToken = await getValidAccessToken(supabase, settings);
      if (!accessToken) {
        console.warn(`Failed to get valid token for user ${settings.user_id}`);
        continue;
      }

      // Get or create sync state
      const { data: syncState } = await supabase
        .from("inbox_gmail_sync_state")
        .select("*")
        .eq("organization_id", organization_id)
        .eq("user_id", settings.user_id)
        .maybeSingle();

      let messagesUrl: string;

      if (syncState?.gmail_history_id) {
        // Incremental sync via history
        const historyUrl = `${GMAIL_API}/users/me/history?startHistoryId=${syncState.gmail_history_id}&historyTypes=messageAdded&maxResults=${max_results}`;
        const historyRes = await fetch(historyUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (historyRes.ok) {
          const historyData = await historyRes.json();
          const messageIds: string[] = [];

          if (historyData.history) {
            for (const h of historyData.history) {
              if (h.messagesAdded) {
                for (const m of h.messagesAdded) {
                  messageIds.push(m.message.id);
                }
              }
            }
          }

          if (messageIds.length === 0) {
            // Update last_synced_at even if no new messages
            await supabase
              .from("inbox_gmail_sync_state")
              .update({
                last_synced_at: new Date().toISOString(),
                gmail_history_id: historyData.historyId || syncState.gmail_history_id,
              })
              .eq("id", syncState.id);
            continue;
          }

          // Fetch and process each message
          for (const msgId of messageIds.slice(0, max_results)) {
            await processGmailMessage(supabase, accessToken, msgId, organization_id, settings.user_id);
            totalSynced++;
          }

          await supabase
            .from("inbox_gmail_sync_state")
            .update({
              last_synced_at: new Date().toISOString(),
              gmail_history_id: historyData.historyId || syncState.gmail_history_id,
              sync_errors: 0,
            })
            .eq("id", syncState.id);

          continue;
        }

        // History ID invalid, fall through to full sync
        console.warn("History sync failed, falling back to full sync");
      }

      // Full sync: get recent messages
      messagesUrl = `${GMAIL_API}/users/me/messages?maxResults=${max_results}&q=in:inbox`;
      const listRes = await fetch(messagesUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!listRes.ok) {
        console.error("Gmail list error:", await listRes.text());
        continue;
      }

      const listData = await listRes.json();
      const gmailMessages = listData.messages || [];

      for (const gMsg of gmailMessages) {
        await processGmailMessage(supabase, accessToken, gMsg.id, organization_id, settings.user_id);
        totalSynced++;
      }

      // Get profile for historyId
      const profileRes = await fetch(`${GMAIL_API}/users/me/profile`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profileData = profileRes.ok ? await profileRes.json() : {};

      const syncUpdate = {
        organization_id,
        user_id: settings.user_id,
        gmail_history_id: profileData.historyId || null,
        gmail_email: settings.google_email || profileData.emailAddress || null,
        last_synced_at: new Date().toISOString(),
        sync_errors: 0,
      };

      if (syncState) {
        await supabase.from("inbox_gmail_sync_state").update(syncUpdate).eq("id", syncState.id);
      } else {
        await supabase.from("inbox_gmail_sync_state").insert(syncUpdate);
      }
    }

    return new Response(
      JSON.stringify({ success: true, synced: totalSynced }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("gmail-sync error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function processGmailMessage(
  supabase: any,
  accessToken: string,
  messageId: string,
  organizationId: string,
  userId: string,
) {
  // Fetch full message
  const msgRes = await fetch(`${GMAIL_API}/users/me/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!msgRes.ok) {
    console.error(`Failed to fetch message ${messageId}:`, await msgRes.text());
    return;
  }

  const msgData = await msgRes.json();
  const headers = msgData.payload?.headers || [];
  const threadId = msgData.threadId;
  const from = getHeader(headers, "From");
  const to = getHeader(headers, "To");
  const subject = getHeader(headers, "Subject");
  const date = getHeader(headers, "Date");
  const fromEmail = extractEmailAddress(from);
  const fromName = from.replace(/<[^>]+>/, "").trim() || fromEmail;

  // Check if already processed
  const { data: existing } = await supabase
    .from("inbox_gmail_thread_map")
    .select("id, conversation_id, gmail_message_ids")
    .eq("organization_id", organizationId)
    .eq("gmail_thread_id", threadId)
    .maybeSingle();

  if (existing?.gmail_message_ids?.includes(messageId)) {
    return; // Already processed
  }

  // Get user's own email to determine direction
  const { data: syncState } = await supabase
    .from("inbox_gmail_sync_state")
    .select("gmail_email")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  const userEmail = syncState?.gmail_email || "";
  const isOutbound = fromEmail.toLowerCase() === userEmail.toLowerCase();

  const body = extractEmailBody(msgData.payload);
  const htmlContent = extractHtmlBody(msgData.payload);

  if (existing) {
    // Add message to existing conversation
    await supabase.from("inbox_messages").insert({
      organization_id: organizationId,
      conversation_id: existing.conversation_id,
      direction: isOutbound ? "outbound" : "inbound",
      msg_type: "text",
      content: { body, html: htmlContent, subject, from, to, gmail_message_id: messageId },
      delivery_status: "delivered",
      created_by: isOutbound ? userId : null,
      created_by_type: isOutbound ? "agent" : "contact",
      provider_message_id: messageId,
      created_at: date ? new Date(date).toISOString() : new Date().toISOString(),
    });

    // Update thread map
    const updatedIds = [...(existing.gmail_message_ids || []), messageId];
    await supabase
      .from("inbox_gmail_thread_map")
      .update({ gmail_message_ids: updatedIds, updated_at: new Date().toISOString() })
      .eq("id", existing.id);

    // Update conversation
    await supabase
      .from("inbox_conversations")
      .update({
        last_message_at: new Date().toISOString(),
        ...(isOutbound ? { last_outbound_at: new Date().toISOString() } : { last_inbound_at: new Date().toISOString() }),
      })
      .eq("id", existing.conversation_id);
  } else {
    // Create or find contact
    const contactEmail = isOutbound ? extractEmailAddress(to) : fromEmail;
    const contactName = isOutbound ? to.replace(/<[^>]+>/, "").trim() : fromName;

    let contactId: string;

    const { data: existingContact } = await supabase
      .from("inbox_contacts")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("email", contactEmail)
      .maybeSingle();

    if (existingContact) {
      contactId = existingContact.id;
    } else {
      const { data: newContact } = await supabase
        .from("inbox_contacts")
        .insert({
          organization_id: organizationId,
          email: contactEmail,
          name: contactName || null,
          handles: { gmail: contactEmail },
          tags: [],
          custom_fields: {},
          consent: {},
        })
        .select("id")
        .single();
      contactId = newContact!.id;
    }

    // Find Gmail channel for this org
    const { data: channel } = await supabase
      .from("inbox_channels")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("channel_type", "gmail")
      .eq("is_active", true)
      .maybeSingle();

    // Create conversation
    const { data: conv } = await supabase
      .from("inbox_conversations")
      .insert({
        organization_id: organizationId,
        channel_type: "gmail",
        channel_id: channel?.id || null,
        contact_id: contactId,
        status: "open",
        priority: "normal",
        tags: [],
        subject: subject || "(No subject)",
        channel_thread_ref: threadId,
        last_message_at: new Date().toISOString(),
        ...(isOutbound
          ? { last_outbound_at: new Date().toISOString() }
          : { last_inbound_at: new Date().toISOString() }),
        unread_count: isOutbound ? 0 : 1,
        metadata: { gmail_thread_id: threadId },
      })
      .select("id")
      .single();

    if (!conv) {
      console.error("Failed to create conversation for thread", threadId);
      return;
    }

    // Insert message
    await supabase.from("inbox_messages").insert({
      organization_id: organizationId,
      conversation_id: conv.id,
      direction: isOutbound ? "outbound" : "inbound",
      msg_type: "text",
      content: { body, html: htmlContent, subject, from, to, gmail_message_id: messageId },
      delivery_status: "delivered",
      created_by: isOutbound ? userId : null,
      created_by_type: isOutbound ? "agent" : "contact",
      provider_message_id: messageId,
      created_at: date ? new Date(date).toISOString() : new Date().toISOString(),
    });

    // Create thread map
    await supabase.from("inbox_gmail_thread_map").insert({
      organization_id: organizationId,
      conversation_id: conv.id,
      gmail_thread_id: threadId,
      gmail_message_ids: [messageId],
      subject: subject || null,
    });
  }
}

function extractHtmlBody(payload: any): string {
  if (!payload) return "";
  if (payload.mimeType === "text/html" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    for (const part of payload.parts) {
      const html = extractHtmlBody(part);
      if (html) return html;
    }
  }
  return "";
}
