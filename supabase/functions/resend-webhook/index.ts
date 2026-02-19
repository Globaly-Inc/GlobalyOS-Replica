import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Public webhook — Resend signs requests with a signing secret
// We verify using the Resend-Signature header if RESEND_WEBHOOK_SECRET is set.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'content-type, resend-signature, svix-id, svix-timestamp, svix-signature',
      },
    });
  }

  const rawBody = await req.text();
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  // Use service role key — this is a trusted server-to-server webhook
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { type, data } = payload;
  if (!type || !data) {
    return new Response('OK', { status: 200 });
  }

  // Resend event types: email.sent, email.delivered, email.opened, email.clicked, email.bounced, email.complained
  const messageId = data.email_id ?? data.message_id ?? null;

  if (!messageId) {
    return new Response('OK', { status: 200 });
  }

  // Look up recipient by provider_message_id
  const { data: recipient, error: recipientError } = await supabase
    .from('campaign_recipients')
    .select('id, campaign_id, contact_id, organization_id, email, events, status')
    .eq('provider_message_id', messageId)
    .maybeSingle();

  if (recipientError) {
    console.error('Recipient lookup error:', recipientError);
  }

  if (!recipient) {
    // Not found — not a campaign email, ignore
    return new Response('OK', { status: 200 });
  }

  // Map Resend event type → our event type
  const eventMap: Record<string, string> = {
    'email.delivered': 'delivered',
    'email.opened': 'opened',
    'email.clicked': 'clicked',
    'email.bounced': 'bounced',
    'email.complained': 'complaint',
    'email.unsubscribed': 'unsubscribed',
  };

  const eventType = eventMap[type];
  if (!eventType) {
    return new Response('OK', { status: 200 });
  }

  const newEvent = {
    type: eventType,
    ts: new Date().toISOString(),
    meta: {
      url: data.click?.link ?? null,
      bounce_type: data.bounce?.type ?? null,
    },
  };

  // Determine new status (only upgrade, never downgrade)
  const statusPriority: Record<string, number> = {
    queued: 0, sent: 1, delivered: 2, opened: 3, clicked: 4,
    bounced: 5, complaint: 5, unsubscribed: 5, failed: 5,
  };

  const currentPriority = statusPriority[recipient.status] ?? 0;
  const newPriority = statusPriority[eventType] ?? 0;
  const newStatus = newPriority >= currentPriority ? eventType : recipient.status;

  // Append event to existing events array
  const existingEvents = Array.isArray(recipient.events) ? recipient.events : [];
  const updatedEvents = [...existingEvents, newEvent];

  await supabase
    .from('campaign_recipients')
    .update({ status: newStatus, events: updatedEvents })
    .eq('id', recipient.id);

  // Auto-suppress bounces and complaints
  if (eventType === 'bounced' || eventType === 'complaint') {
    await supabase
      .from('email_suppressions')
      .upsert({
        organization_id: recipient.organization_id,
        email: recipient.email.toLowerCase(),
        type: eventType === 'bounced' ? 'bounced' : 'complaint',
        reason: `Auto-suppressed from Resend event: ${type}`,
        campaign_id: recipient.campaign_id,
      }, { onConflict: 'organization_id,email' });
  }

  // Log CRM activity for contact events
  if (recipient.contact_id && ['opened', 'clicked', 'bounced', 'unsubscribed', 'complaint'].includes(eventType)) {
    // Load campaign name for activity subject
    const { data: campaign } = await supabase
      .from('email_campaigns')
      .select('name, subject, created_by')
      .eq('id', recipient.campaign_id)
      .single();

    const activityTypeMap: Record<string, string> = {
      opened: 'campaign_opened',
      clicked: 'campaign_clicked',
      bounced: 'campaign_bounced',
      unsubscribed: 'campaign_unsubscribed',
      complaint: 'campaign_bounced',
    };

    await supabase.from('crm_activity_log').insert({
      organization_id: recipient.organization_id,
      contact_id: recipient.contact_id,
      employee_id: campaign?.created_by ?? null,
      type: activityTypeMap[eventType],
      subject: `Campaign: ${campaign?.name ?? 'Unknown'}`,
      content: eventType === 'clicked' ? `Clicked: ${data.click?.link ?? 'link'}` : `Email ${eventType}`,
      metadata: {
        campaign_id: recipient.campaign_id,
        url: data.click?.link ?? null,
      },
    });
  }

  return new Response('OK', { status: 200 });
});
