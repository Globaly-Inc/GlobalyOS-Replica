import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Public endpoint — no auth, uses opaque recipient ID
const TRANSPARENT_GIF = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
  0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
  0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
]);

serve(async (req) => {
  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const rid = url.searchParams.get('rid');
  const redirectUrl = url.searchParams.get('url');

  if (!rid) return new Response('Bad request', { status: 400 });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Log the event
  try {
    const { data: recipient } = await supabase
      .from('campaign_recipients')
      .select('events, status')
      .eq('id', rid)
      .single();

    if (recipient) {
      const events = Array.isArray(recipient.events) ? recipient.events : [];
      const eventType = type === 'click' ? 'clicked' : 'opened';
      const meta: Record<string, string> = {};
      if (redirectUrl) meta.url = decodeURIComponent(redirectUrl);

      events.push({ type: eventType, ts: new Date().toISOString(), meta });

      const statusUpdate = recipient.status === 'sent' || recipient.status === 'delivered'
        ? { status: type === 'click' ? 'clicked' : 'opened', events }
        : { events };

      await supabase.from('campaign_recipients').update(statusUpdate).eq('id', rid);
    }
  } catch {
    // silent — tracking should never break user experience
  }

  if (type === 'click' && redirectUrl) {
    const decoded = decodeURIComponent(redirectUrl);
    return new Response(null, {
      status: 302,
      headers: { Location: decoded, 'Access-Control-Allow-Origin': '*' },
    });
  }

  // Return 1x1 transparent GIF for open tracking
  return new Response(TRANSPARENT_GIF, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*',
    },
  });
});
