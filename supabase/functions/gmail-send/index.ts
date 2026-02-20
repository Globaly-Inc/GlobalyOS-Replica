/**
 * gmail-send
 * Sends emails via Gmail API (compose new or reply to thread)
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

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
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

  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token || null;
}

function encodeBase64Url(str: string): string {
  return btoa(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildRawEmail(params: {
  from: string;
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
  threadId?: string;
}): string {
  const lines: string[] = [];
  lines.push(`From: ${params.from}`);
  lines.push(`To: ${params.to}`);
  lines.push(`Subject: ${params.subject}`);
  lines.push("MIME-Version: 1.0");
  lines.push("Content-Type: text/plain; charset=UTF-8");

  if (params.inReplyTo) {
    lines.push(`In-Reply-To: ${params.inReplyTo}`);
  }
  if (params.references) {
    lines.push(`References: ${params.references}`);
  }

  lines.push("");
  lines.push(params.body);

  return encodeBase64Url(lines.join("\r\n"));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      organization_id,
      conversation_id,
      to_email,
      subject,
      body,
      user_id,
    } = await req.json();

    if (!organization_id || !body) {
      return new Response(
        JSON.stringify({ error: "organization_id and body required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Determine the sending user
    let sendingUserId = user_id;
    if (!sendingUserId) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await anonClient.auth.getUser();
        sendingUserId = user?.id;
      }
    }

    if (!sendingUserId) {
      return new Response(
        JSON.stringify({ error: "Could not determine sending user" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Google tokens
    const { data: settings } = await supabase
      .from("scheduler_integration_settings")
      .select("*")
      .eq("organization_id", organization_id)
      .eq("user_id", sendingUserId)
      .eq("google_calendar_connected", true)
      .maybeSingle();

    if (!settings) {
      return new Response(
        JSON.stringify({ error: "Google account not connected" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let accessToken = settings.google_access_token;
    const expiresAt = settings.google_token_expires_at ? new Date(settings.google_token_expires_at) : null;
    if (!expiresAt || expiresAt < new Date(Date.now() + 60_000)) {
      if (settings.google_refresh_token) {
        accessToken = await refreshAccessToken(settings.google_refresh_token);
        if (accessToken) {
          await supabase
            .from("scheduler_integration_settings")
            .update({
              google_access_token: accessToken,
              google_token_expires_at: new Date(Date.now() + 3600_000).toISOString(),
            })
            .eq("id", settings.id);
        }
      }
    }

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Failed to get valid access token" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fromEmail = settings.google_email || "";

    // Determine recipient and thread context
    let recipientEmail = to_email;
    let emailSubject = subject || "(No subject)";
    let threadId: string | undefined;
    let inReplyTo: string | undefined;

    if (conversation_id) {
      // Get thread map for reply context
      const { data: threadMap } = await supabase
        .from("inbox_gmail_thread_map")
        .select("*")
        .eq("conversation_id", conversation_id)
        .maybeSingle();

      if (threadMap) {
        threadId = threadMap.gmail_thread_id;
        emailSubject = threadMap.subject ? `Re: ${threadMap.subject.replace(/^Re:\s*/i, "")}` : emailSubject;

        // Get the last message's Message-ID for In-Reply-To
        if (threadMap.gmail_message_ids?.length) {
          const lastMsgId = threadMap.gmail_message_ids[threadMap.gmail_message_ids.length - 1];
          try {
            const msgRes = await fetch(
              `${GMAIL_API}/users/me/messages/${lastMsgId}?format=metadata&metadataHeaders=Message-ID`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            if (msgRes.ok) {
              const msgData = await msgRes.json();
              const messageIdHeader = msgData.payload?.headers?.find(
                (h: any) => h.name.toLowerCase() === "message-id"
              );
              if (messageIdHeader) {
                inReplyTo = messageIdHeader.value;
              }
            }
          } catch {
            // Best effort
          }
        }
      }

      // Get recipient from conversation contact
      if (!recipientEmail) {
        const { data: conv } = await supabase
          .from("inbox_conversations")
          .select("*, inbox_contacts(*)")
          .eq("id", conversation_id)
          .single();

        if (conv?.inbox_contacts?.email) {
          recipientEmail = conv.inbox_contacts.email;
        }
      }
    }

    if (!recipientEmail) {
      return new Response(
        JSON.stringify({ error: "No recipient email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build and send email
    const raw = buildRawEmail({
      from: fromEmail,
      to: recipientEmail,
      subject: emailSubject,
      body,
      inReplyTo,
      references: inReplyTo,
      threadId,
    });

    const sendBody: Record<string, unknown> = { raw };
    if (threadId) sendBody.threadId = threadId;

    const sendRes = await fetch(`${GMAIL_API}/users/me/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sendBody),
    });

    if (!sendRes.ok) {
      const errText = await sendRes.text();
      console.error("Gmail send error:", errText);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sentData = await sendRes.json();

    // Update thread map if replying
    if (conversation_id && threadId) {
      const { data: threadMap } = await supabase
        .from("inbox_gmail_thread_map")
        .select("id, gmail_message_ids")
        .eq("conversation_id", conversation_id)
        .maybeSingle();

      if (threadMap) {
        const updatedIds = [...(threadMap.gmail_message_ids || []), sentData.id];
        await supabase
          .from("inbox_gmail_thread_map")
          .update({ gmail_message_ids: updatedIds, updated_at: new Date().toISOString() })
          .eq("id", threadMap.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        provider_message_id: sentData.id,
        thread_id: sentData.threadId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("gmail-send error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
