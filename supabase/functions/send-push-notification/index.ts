import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import * as webpush from "jsr:@negrel/webpush@0.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  user_id: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
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
  // Decode keys
  const publicKeyBytes = base64urlDecode(publicKeyBase64);
  const privateKeyBytes = base64urlDecode(privateKeyBase64);

  // For P-256, public key is 65 bytes (0x04 + 32 bytes X + 32 bytes Y)
  // Private key is 32 bytes (d)
  if (publicKeyBytes.length !== 65) {
    throw new Error(`Invalid public key length: ${publicKeyBytes.length}, expected 65`);
  }
  if (privateKeyBytes.length !== 32) {
    throw new Error(`Invalid private key length: ${privateKeyBytes.length}, expected 32`);
  }

  // Extract X and Y coordinates from public key
  const x = base64urlEncode(publicKeyBytes.slice(1, 33));
  const y = base64urlEncode(publicKeyBytes.slice(33, 65));
  const d = base64urlEncode(privateKeyBytes);

  const publicKeyJwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x,
    y,
    ext: true,
  };

  const privateKeyJwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x,
    y,
    d,
    ext: true,
  };

  return { publicKey: publicKeyJwk, privateKey: privateKeyJwk };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("VAPID keys not configured");
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert raw base64url VAPID keys to JWK format
    console.log("Converting VAPID keys to JWK format...");
    const jwkKeys = await convertVapidKeysToJwk(vapidPublicKey, vapidPrivateKey);
    console.log("JWK keys created successfully");

    // Import VAPID keys using the library
    const vapidKeys = await webpush.importVapidKeys(jwkKeys, { extractable: false });
    console.log("VAPID keys imported successfully");

    // Create an application server object
    const appServer = await webpush.ApplicationServer.new({
      contactInformation: "mailto:support@globalyhub.com",
      vapidKeys,
    });
    console.log("ApplicationServer created successfully");

    const { user_id, title, body, url, tag, data }: PushPayload = await req.json();

    console.log(`Push notification request for user ${user_id}: ${title}`);

    // Get all push subscriptions for this user
    const { data: subscriptions, error: subError } = await supabaseClient
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", user_id);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${user_id}`);
      return new Response(
        JSON.stringify({ success: true, message: "No subscriptions found", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${subscriptions.length} subscriptions for user ${user_id}`);

    const payload = JSON.stringify({
      title,
      body: body,
      icon: "/favicon.png",
      badge: "/favicon.png",
      url: url || "/",
      tag: tag || "notification",
      data,
    });

    console.log("Payload to send:", payload);

    let sentCount = 0;
    const failedEndpoints: string[] = [];

    for (const sub of subscriptions) {
      try {
        console.log(`Sending push to subscription ${sub.id}...`);
        console.log(`  Endpoint: ${sub.endpoint.substring(0, 60)}...`);

        // Create a subscriber from the subscription data
        const subscriber = appServer.subscribe({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        });

        // Send the push message using the library
        await subscriber.pushTextMessage(payload, {});

        sentCount++;
        console.log(`Successfully sent push to subscription ${sub.id}`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`Exception sending to subscription ${sub.id}:`, errorMessage);
        failedEndpoints.push(sub.id);

        // Check if it's a 410 Gone or 404 Not Found error (subscription expired)
        if (errorMessage.includes("410") || errorMessage.includes("404") || errorMessage.includes("Gone")) {
          console.log(`Removing expired subscription ${sub.id}`);
          await supabaseClient
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
        }
      }
    }

    console.log(`Push notification complete: ${sentCount} sent, ${failedEndpoints.length} failed`);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, failed: failedEndpoints.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-push-notification:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
