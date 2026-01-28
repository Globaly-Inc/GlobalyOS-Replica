import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

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

// Create JWT for VAPID
async function createVapidJwt(
  audience: string,
  subject: string,
  privateKeyBase64: string,
  publicKeyBase64: string
): Promise<{ jwt: string; publicKey: string }> {
  const header = { alg: "ES256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: subject,
  };

  const headerB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key (raw 32 bytes for P-256)
  const privateKeyBytes = base64urlDecode(privateKeyBase64);
  
  // Create JWK from raw private key bytes
  const publicKeyBytes = base64urlDecode(publicKeyBase64);
  
  // For P-256, the public key is 65 bytes (uncompressed format: 0x04 + 32 bytes X + 32 bytes Y)
  // Extract X and Y coordinates
  const x = base64urlEncode(publicKeyBytes.slice(1, 33));
  const y = base64urlEncode(publicKeyBytes.slice(33, 65));
  const d = base64urlEncode(privateKeyBytes);

  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x,
    y,
    d,
    ext: true,
  };

  const privateKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  // Sign the token
  const signatureArrayBuffer = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw format (r || s)
  const signature = new Uint8Array(signatureArrayBuffer);
  let r: Uint8Array, s: Uint8Array;
  
  // WebCrypto returns signature in IEEE P1363 format (r || s, each 32 bytes)
  if (signature.length === 64) {
    r = signature.slice(0, 32);
    s = signature.slice(32, 64);
  } else {
    // Fallback - use as-is
    r = signature.slice(0, signature.length / 2);
    s = signature.slice(signature.length / 2);
  }
  
  const rawSignature = new Uint8Array(64);
  rawSignature.set(r.length > 32 ? r.slice(r.length - 32) : r, 32 - Math.min(r.length, 32));
  rawSignature.set(s.length > 32 ? s.slice(s.length - 32) : s, 64 - Math.min(s.length, 32));

  const signatureB64 = base64urlEncode(rawSignature);
  return { jwt: `${unsignedToken}.${signatureB64}`, publicKey: publicKeyBase64 };
}

// HKDF implementation
async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    ikm.buffer as ArrayBuffer,
    "HKDF",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt.buffer as ArrayBuffer,
      info: info.buffer as ArrayBuffer,
    },
    key,
    length * 8
  );

  return new Uint8Array(bits);
}

// Encrypt payload according to RFC 8291
async function encryptPayload(
  payload: string,
  p256dhBase64: string,
  authBase64: string
): Promise<{ body: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  // Import subscriber's public key
  const subscriberPublicKeyBytes = base64urlDecode(p256dhBase64);
  const subscriberPublicKey = await crypto.subtle.importKey(
    "raw",
    subscriberPublicKeyBytes.buffer as ArrayBuffer,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive shared secret
  const sharedSecretBuffer = await crypto.subtle.deriveBits(
    { name: "ECDH", public: subscriberPublicKey },
    localKeyPair.privateKey,
    256
  );
  const sharedSecret = new Uint8Array(sharedSecretBuffer);

  // Export local public key
  const localPublicKeyBuffer = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);
  const localPublicKey = new Uint8Array(localPublicKeyBuffer);

  // Auth secret
  const authSecret = base64urlDecode(authBase64);

  // Generate 16-byte salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Create key info
  const keyInfoHeader = new TextEncoder().encode("WebPush: info\0");
  const keyInfo = new Uint8Array(keyInfoHeader.length + subscriberPublicKeyBytes.length + localPublicKey.length);
  keyInfo.set(keyInfoHeader);
  keyInfo.set(subscriberPublicKeyBytes, keyInfoHeader.length);
  keyInfo.set(localPublicKey, keyInfoHeader.length + subscriberPublicKeyBytes.length);

  // Derive IKM
  const prk = await hkdf(authSecret, sharedSecret, keyInfo, 32);

  // Derive content encryption key
  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const cek = await hkdf(salt, prk, cekInfo, 16);

  // Derive nonce
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");
  const nonce = await hkdf(salt, prk, nonceInfo, 12);

  // Import CEK for encryption
  const cekKey = await crypto.subtle.importKey(
    "raw",
    cek.buffer as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  // Pad the payload (delimiter byte 0x02)
  const payloadBytes = new TextEncoder().encode(payload);
  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2; // Delimiter

  // Encrypt
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce.buffer as ArrayBuffer },
    cekKey,
    paddedPayload.buffer as ArrayBuffer
  );
  const ciphertext = new Uint8Array(cipherBuffer);

  // Build aes128gcm body: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
  const recordSize = 4096;
  const body = new Uint8Array(16 + 4 + 1 + localPublicKey.length + ciphertext.length);
  let offset = 0;

  // Salt
  body.set(salt, offset);
  offset += 16;

  // Record size (big-endian)
  body[offset++] = (recordSize >> 24) & 0xff;
  body[offset++] = (recordSize >> 16) & 0xff;
  body[offset++] = (recordSize >> 8) & 0xff;
  body[offset++] = recordSize & 0xff;

  // Key ID length
  body[offset++] = localPublicKey.length;

  // Key ID (local public key)
  body.set(localPublicKey, offset);
  offset += localPublicKey.length;

  // Ciphertext
  body.set(ciphertext, offset);

  return { body, salt, localPublicKey };
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

    let sentCount = 0;
    const failedEndpoints: string[] = [];

    for (const sub of subscriptions) {
      try {
        // Get audience from endpoint
        const endpointUrl = new URL(sub.endpoint);
        const audience = endpointUrl.origin;

        // Create VAPID JWT
        const { jwt } = await createVapidJwt(
          audience,
          "mailto:support@globalyhub.com",
          vapidPrivateKey,
          vapidPublicKey
        );

        // Encrypt payload
        const encrypted = await encryptPayload(payload, sub.p256dh, sub.auth);

        // Convert Uint8Array to ArrayBuffer for fetch body
        const bodyBuffer = encrypted.body.buffer.slice(
          encrypted.body.byteOffset,
          encrypted.body.byteOffset + encrypted.body.byteLength
        ) as ArrayBuffer;

        // Send push notification
        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "aes128gcm",
            "Content-Length": encrypted.body.length.toString(),
            "TTL": "3600",
            "Urgency": "normal",
            "Authorization": `vapid t=${jwt}, k=${vapidPublicKey}`,
          },
          body: bodyBuffer,
        });

        if (response.ok || response.status === 201) {
          sentCount++;
          console.log(`Successfully sent push to subscription ${sub.id}`);
        } else {
          const responseText = await response.text();
          console.error(`Push failed for ${sub.id}: ${response.status} - ${responseText}`);
          failedEndpoints.push(sub.id);

          // Remove expired/invalid subscriptions
          if (response.status === 410 || response.status === 404) {
            console.log(`Removing expired subscription ${sub.id}`);
            await supabaseClient
              .from("push_subscriptions")
              .delete()
              .eq("id", sub.id);
          }
        }
      } catch (err) {
        console.error(`Exception sending to endpoint ${sub.id}:`, err);
        failedEndpoints.push(sub.id);
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
