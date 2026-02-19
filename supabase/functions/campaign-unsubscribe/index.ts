import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Public endpoint — no auth required, uses opaque unsubscribe token
serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') ?? url.pathname.split('/').pop();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  if (!token) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 400 });
  }

  const { data: recipient, error } = await supabase
    .from('campaign_recipients')
    .select('id, organization_id, contact_id, email, campaign_id, events')
    .eq('unsubscribe_token', token)
    .single();

  if (error || !recipient) {
    return new Response(JSON.stringify({ error: 'Invalid unsubscribe token' }), { status: 404 });
  }

  // Update recipient status
  const events = Array.isArray(recipient.events) ? recipient.events : [];
  await supabase.from('campaign_recipients').update({
    status: 'unsubscribed',
    events: [...events, { type: 'unsubscribed', ts: new Date().toISOString() }],
  }).eq('id', recipient.id);

  // Add to suppressions
  await supabase.from('email_suppressions').upsert({
    organization_id: recipient.organization_id,
    email: recipient.email.toLowerCase(),
    type: 'unsubscribed',
    campaign_id: recipient.campaign_id,
  }, { onConflict: 'organization_id,email' });

  // Log CRM activity
  if (recipient.contact_id) {
    await supabase.from('crm_activity_log').insert({
      organization_id: recipient.organization_id,
      contact_id: recipient.contact_id,
      employee_id: recipient.contact_id, // no employee context in public endpoint
      type: 'campaign_unsubscribed',
      subject: 'Unsubscribed from campaign',
      metadata: { campaign_id: recipient.campaign_id },
    });
  }

  return new Response(JSON.stringify({ success: true, email: recipient.email }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
});
