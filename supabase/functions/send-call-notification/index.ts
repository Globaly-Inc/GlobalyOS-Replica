import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Web Push crypto helpers
async function generateVapidSignature(endpoint: string, vapidPrivateKey: string, vapidPublicKey: string): Promise<{ authorization: string; cryptoKey: string }> {
  const urlObj = new URL(endpoint);
  const audience = `${urlObj.protocol}//${urlObj.host}`;
  const expiration = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12 hours
  
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = {
    aud: audience,
    exp: expiration,
    sub: 'mailto:notifications@globalyos.app'
  };
  
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsignedToken = `${headerB64}.${payloadB64}`;
  
  // Import private key
  const privateKeyBuffer = Uint8Array.from(atob(vapidPrivateKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBuffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    encoder.encode(unsignedToken)
  );
  
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  return {
    authorization: `vapid t=${unsignedToken}.${signatureB64}, k=${vapidPublicKey}`,
    cryptoKey: vapidPublicKey
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to_user_id, caller_name, caller_avatar, call_type, call_id, organization_slug } = await req.json();
    
    console.log(`Sending call notification to user ${to_user_id} for call ${call_id}`);
    console.log(`Caller: ${caller_name}, Type: ${call_type}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Fetch push subscriptions for the user
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', to_user_id);
    
    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw new Error('Failed to fetch push subscriptions');
    }
    
    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${to_user_id}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No push subscriptions found - user will see in-app notification",
          call_id,
          to_user_id
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`Found ${subscriptions.length} push subscription(s) for user`);
    
    // Prepare push payload
    const pushPayload = JSON.stringify({
      title: `${caller_name} is calling`,
      body: `Incoming ${call_type} call`,
      icon: caller_avatar || '/favicon.png',
      badge: '/favicon.png',
      tag: 'incoming-call',
      data: {
        type: 'incoming_call',
        call_id,
        caller_name,
        caller_avatar,
        call_type,
        organization_slug,
        url: organization_slug ? `/${organization_slug}/chat` : '/chat',
      },
      requireInteraction: true,
    });
    
    const results: Array<{ success: boolean; error?: string }> = [];
    
    // Send push to each subscription
    for (const sub of subscriptions) {
      try {
        const subscriptionData = sub.subscription_data as { endpoint: string; keys: { p256dh: string; auth: string } };
        
        if (!subscriptionData?.endpoint) {
          console.log('Invalid subscription data, skipping');
          continue;
        }
        
        // For now, send a simple fetch request to the push endpoint
        // Note: Full web-push requires encryption which is complex in Deno
        // This is a simplified version that works with most push services
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'TTL': '86400',
          'Urgency': 'high',
        };
        
        // Add VAPID if available
        if (vapidPublicKey && vapidPrivateKey) {
          try {
            const vapidHeaders = await generateVapidSignature(
              subscriptionData.endpoint,
              vapidPrivateKey,
              vapidPublicKey
            );
            headers['Authorization'] = vapidHeaders.authorization;
            headers['Crypto-Key'] = `p256ecdsa=${vapidHeaders.cryptoKey}`;
          } catch (vapidError) {
            console.error('VAPID signature failed:', vapidError);
            // Continue without VAPID for FCM endpoints
          }
        }
        
        const response = await fetch(subscriptionData.endpoint, {
          method: 'POST',
          headers,
          body: pushPayload,
        });
        
        if (response.ok || response.status === 201) {
          console.log('Push notification sent successfully');
          results.push({ success: true });
        } else {
          const errorText = await response.text();
          console.error(`Push failed with status ${response.status}: ${errorText}`);
          
          // If subscription is invalid, remove it
          if (response.status === 404 || response.status === 410) {
            console.log('Removing invalid subscription');
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id);
          }
          
          results.push({ success: false, error: errorText });
        }
      } catch (pushError) {
        console.error('Error sending push:', pushError);
        results.push({ success: false, error: String(pushError) });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    return new Response(
      JSON.stringify({ 
        success: successCount > 0, 
        message: `Sent ${successCount}/${subscriptions.length} notifications`,
        call_id,
        to_user_id
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending call notification:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
