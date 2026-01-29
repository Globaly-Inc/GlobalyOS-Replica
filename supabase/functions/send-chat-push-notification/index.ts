import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import * as webpush from "jsr:@negrel/webpush@0.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatPushPayload {
  message_id: string;
  sender_employee_id: string;
  conversation_id?: string;
  space_id?: string;
  content: string;
  content_type: string;
  organization_slug?: string;
  warmup?: boolean;
}

// Base64URL decode
function base64urlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Base64URL encode
function base64urlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Convert raw base64url VAPID keys to JWK format
async function convertVapidKeysToJwk(publicKeyBase64: string, privateKeyBase64: string): Promise<{
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}> {
  const publicKeyBytes = base64urlDecode(publicKeyBase64);
  const privateKeyBytes = base64urlDecode(privateKeyBase64);

  if (publicKeyBytes.length !== 65) {
    throw new Error(`Invalid public key length: ${publicKeyBytes.length}, expected 65`);
  }
  if (privateKeyBytes.length !== 32) {
    throw new Error(`Invalid private key length: ${privateKeyBytes.length}, expected 32`);
  }

  const x = base64urlEncode(publicKeyBytes.slice(1, 33));
  const y = base64urlEncode(publicKeyBytes.slice(33, 65));
  const d = base64urlEncode(privateKeyBytes);

  return {
    publicKey: { kty: "EC", crv: "P-256", x, y, ext: true },
    privateKey: { kty: "EC", crv: "P-256", x, y, d, ext: true },
  };
}

// Module-level cache for VAPID keys (persists across requests in warm container)
let cachedAppServer: webpush.ApplicationServer | null = null;

async function getAppServer(): Promise<webpush.ApplicationServer> {
  if (cachedAppServer) {
    return cachedAppServer;
  }

  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

  if (!vapidPublicKey || !vapidPrivateKey) {
    throw new Error("VAPID keys not configured");
  }

  console.log("Initializing VAPID keys for chat push (first request or cache miss)...");
  const jwkKeys = await convertVapidKeysToJwk(vapidPublicKey, vapidPrivateKey);
  const vapidKeys = await webpush.importVapidKeys(jwkKeys, { extractable: false });
  
  cachedAppServer = await webpush.ApplicationServer.new({
    contactInformation: "mailto:support@globalyhub.com",
    vapidKeys,
  });
  
  console.log("VAPID keys cached successfully for chat push");
  return cachedAppServer;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const payload: ChatPushPayload = await req.json();

    // Handle warmup pings - early return to keep container warm
    if (payload.warmup) {
      console.log("Chat push warmup ping received - keeping container warm");
      return new Response(
        JSON.stringify({ status: "warm", timestamp: new Date().toISOString() }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { 
      message_id, 
      sender_employee_id, 
      conversation_id, 
      space_id, 
      content,
      content_type,
      organization_slug
    } = payload;

    console.log(`Chat push notification request: message=${message_id}, sender=${sender_employee_id}`);

    // Get sender info
    const { data: sender } = await supabase
      .from("employees")
      .select("id, user_id, organization_id, profiles:user_id(full_name, avatar_url)")
      .eq("id", sender_employee_id)
      .single();

    if (!sender) {
      console.error("Sender not found:", sender_employee_id);
      return new Response(
        JSON.stringify({ success: false, error: "Sender not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const senderName = (sender.profiles as any)?.full_name || "Someone";

    // Get organization slug if not provided
    let orgSlug = organization_slug;
    if (!orgSlug && sender.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("slug")
        .eq("id", sender.organization_id)
        .single();
      orgSlug = org?.slug;
    }

    // Determine recipients based on conversation or space
    let recipientUserIds: string[] = [];
    let chatName = "";
    let chatUrl = "";

    if (conversation_id) {
      // Get other participants in the conversation
      const { data: participants } = await supabase
        .from("chat_participants")
        .select("employee_id, is_muted, employees:employee_id(user_id)")
        .eq("conversation_id", conversation_id)
        .neq("employee_id", sender_employee_id);

      // Filter out muted participants
      recipientUserIds = (participants || [])
        .filter(p => !p.is_muted && (p.employees as any)?.user_id)
        .map(p => (p.employees as any).user_id);

      chatName = senderName;
      chatUrl = orgSlug ? `/org/${orgSlug}/chat?conversation=${conversation_id}` : `/chat?conversation=${conversation_id}`;
    } else if (space_id) {
      // Get space info
      const { data: space } = await supabase
        .from("chat_spaces")
        .select("name")
        .eq("id", space_id)
        .single();

      // Get space members (excluding sender and muted members)
      const { data: members } = await supabase
        .from("chat_space_members")
        .select("employee_id, notification_setting, employees:employee_id(user_id)")
        .eq("space_id", space_id)
        .neq("employee_id", sender_employee_id);

      // Filter out muted members
      recipientUserIds = (members || [])
        .filter(m => m.notification_setting !== "mute" && (m.employees as any)?.user_id)
        .map(m => (m.employees as any).user_id);

      chatName = space?.name || "Space";
      chatUrl = orgSlug ? `/org/${orgSlug}/chat?space=${space_id}` : `/chat?space=${space_id}`;
    }

    if (recipientUserIds.length === 0) {
      console.log("No recipients to notify");
      return new Response(
        JSON.stringify({ success: true, message: "No recipients", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending push to ${recipientUserIds.length} recipients`);

    // Prepare notification content
    const title = conversation_id ? senderName : `${senderName} in ${chatName}`;
    let body = content;
    if (content_type === "file") {
      body = "📎 Sent an attachment";
    } else if (content_type === "voice") {
      body = "🎤 Sent a voice message";
    } else if (content_type === "system") {
      body = content;
    } else if (content.length > 100) {
      body = content.substring(0, 97) + "...";
    }

    // Get cached app server (VAPID keys only converted once)
    const appServer = await getAppServer();

    // Fetch ALL subscriptions for ALL recipients in ONE query
    const { data: allSubscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .in("user_id", recipientUserIds);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!allSubscriptions || allSubscriptions.length === 0) {
      console.log("No push subscriptions found for any recipient");
      return new Response(
        JSON.stringify({ success: true, message: "No subscriptions", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${allSubscriptions.length} subscriptions across ${recipientUserIds.length} recipients`);

    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: "/favicon.png",
      badge: "/favicon.png",
      url: chatUrl,
      tag: `chat-${conversation_id || space_id}`,
      data: {
        type: "chat_message",
        message_id,
        conversation_id,
        space_id,
      },
    });

    // Send ALL pushes in parallel - no nested function calls
    let sentCount = 0;
    const errors: string[] = [];

    const results = await Promise.allSettled(
      allSubscriptions.map(async (sub) => {
        try {
          const subscriber = appServer.subscribe({
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          });

          await subscriber.pushTextMessage(notificationPayload, {});
          return { success: true, id: sub.id };
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error(`Failed to send push to subscription ${sub.id}:`, errorMessage);

          // Check if subscription expired
          if (errorMessage.includes("410") || errorMessage.includes("404") || errorMessage.includes("Gone")) {
            console.log(`Removing expired subscription ${sub.id}`);
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("id", sub.id);
          }

          throw err;
        }
      })
    );

    // Count results
    for (const result of results) {
      if (result.status === "fulfilled") {
        sentCount++;
      } else {
        errors.push("failed");
      }
    }

    console.log(`Chat push complete: ${sentCount} sent, ${errors.length} failed`);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, failed: errors.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-chat-push-notification:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
