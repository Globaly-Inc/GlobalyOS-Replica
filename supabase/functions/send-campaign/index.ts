import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const APP_URL = 'https://globalyos.lovable.app';

function substituteTokens(html: string, tokens: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(tokens)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

function rewriteLinks(html: string, recipientId: string): string {
  return html.replace(/href="(https?:\/\/[^"]+)"/g, (_, url) => {
    if (url.includes('/e/track/')) return `href="${url}"`;
    const encoded = encodeURIComponent(url);
    return `href="${APP_URL}/e/track/click?rid=${recipientId}&url=${encoded}"`;
  });
}

function injectOpenPixel(html: string, recipientId: string): string {
  const pixel = `<img src="${APP_URL}/e/track/open?rid=${recipientId}" width="1" height="1" alt="" style="display:none;" />`;
  return html.replace('<!-- TRACKING_PIXEL_PLACEHOLDER -->', pixel);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

  // Get employee + check role
  const { data: employee } = await supabase
    .from('employees')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single();
  if (!employee) return new Response(JSON.stringify({ error: 'Employee not found' }), { status: 403, headers: corsHeaders });

  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!roleRow || !['owner', 'admin', 'hr'].includes(roleRow.role)) {
    return new Response(JSON.stringify({ error: 'Insufficient permissions' }), { status: 403, headers: corsHeaders });
  }

  const { campaignId } = await req.json();

  // Load campaign
  const { data: campaign, error: campaignError } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('organization_id', employee.organization_id)
    .single();

  if (campaignError || !campaign) {
    return new Response(JSON.stringify({ error: 'Campaign not found' }), { status: 404, headers: corsHeaders });
  }

  // Validate
  if (!campaign.subject) return new Response(JSON.stringify({ error: 'Campaign missing subject' }), { status: 400, headers: corsHeaders });
  if (!campaign.from_email) return new Response(JSON.stringify({ error: 'Campaign missing from email' }), { status: 400, headers: corsHeaders });

  const contentJson = campaign.content_json as any;
  const hasFooter = contentJson?.blocks?.some((b: any) => b.type === 'footer');
  if (!hasFooter) return new Response(JSON.stringify({ error: 'Campaign must include a footer block with unsubscribe link' }), { status: 400, headers: corsHeaders });

  // Get suppressions
  const { data: suppressions } = await supabase
    .from('email_suppressions')
    .select('email')
    .eq('organization_id', employee.organization_id);
  const suppressedEmails = new Set((suppressions ?? []).map((s: any) => s.email.toLowerCase()));

  // Resolve contacts
  const filters = (campaign.audience_filters as any) ?? {};
  let contactQuery = supabase
    .from('crm_contacts')
    .select('id, first_name, last_name, email, company:crm_companies(name)')
    .eq('organization_id', employee.organization_id)
    .eq('is_archived', false)
    .not('email', 'is', null);

  if (filters.rating) contactQuery = contactQuery.eq('rating', filters.rating);
  if (filters.tags?.length) contactQuery = contactQuery.contains('tags', filters.tags);

  const { data: contacts } = await contactQuery;
  const validContacts = (contacts ?? []).filter(
    (c: any) => c.email && !suppressedEmails.has(c.email.toLowerCase())
  );

  if (validContacts.length === 0) {
    return new Response(JSON.stringify({ error: 'No valid recipients found' }), { status: 400, headers: corsHeaders });
  }

  // Get org info
  const { data: org } = await supabase.from('organizations').select('name').eq('id', employee.organization_id).single();

  // Insert recipients
  const recipientRows = validContacts.map((c: any) => ({
    organization_id: employee.organization_id,
    campaign_id: campaignId,
    contact_id: c.id,
    email: c.email,
    full_name: [c.first_name, c.last_name].filter(Boolean).join(' ') || null,
    status: 'queued',
  }));

  await supabase.from('campaign_recipients').insert(recipientRows);

  // Mark sending
  await supabase.from('email_campaigns').update({
    status: 'sending',
    recipient_count: validContacts.length,
  }).eq('id', campaignId);

  // Reload recipients with tokens
  const { data: recipients } = await supabase
    .from('campaign_recipients')
    .select('id, email, full_name, contact_id, unsubscribe_token')
    .eq('campaign_id', campaignId)
    .eq('organization_id', employee.organization_id);

  const BATCH_SIZE = 50;
  let sentCount = 0;

  // Render base HTML from JSON
  const { renderEmailHtmlServer } = await import('./htmlRenderer.ts').catch(() => ({ renderEmailHtmlServer: null }));

  for (let i = 0; i < (recipients ?? []).length; i += BATCH_SIZE) {
    const batch = (recipients ?? []).slice(i, i + BATCH_SIZE);

    await Promise.allSettled(batch.map(async (recipient: any) => {
      const contact = validContacts.find((c: any) => c.id === recipient.contact_id) as any;
      const tokens: Record<string, string> = {
        first_name: contact?.first_name ?? '',
        last_name: contact?.last_name ?? '',
        email: recipient.email,
        company_name: contact?.company?.name ?? '',
        org_name: org?.name ?? '',
        unsubscribe_url: `${APP_URL}/e/unsub/${recipient.unsubscribe_token}`,
      };

      // Simple HTML from content_json blocks
      let html = campaign.content_html_cache ?? generateSimpleHtml(contentJson, campaign);
      html = substituteTokens(html, tokens);
      if (campaign.track_clicks) html = rewriteLinks(html, recipient.id);
      if (campaign.track_opens) html = injectOpenPixel(html, recipient.id);

      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: `${campaign.from_name ?? org?.name ?? 'GlobalyOS'} <hello@globalyos.com>`,
            reply_to: campaign.reply_to || undefined,
            to: [recipient.email],
            subject: substituteTokens(campaign.subject, tokens),
            html,
          }),
        });

        if (res.ok) {
          const resData = await res.json();
          await supabase.from('campaign_recipients').update({
            status: 'sent',
            provider_message_id: resData.id,
            events: [{ type: 'sent', ts: new Date().toISOString() }],
          }).eq('id', recipient.id);
          sentCount++;
        } else {
          await supabase.from('campaign_recipients').update({ status: 'failed' }).eq('id', recipient.id);
        }
      } catch {
        await supabase.from('campaign_recipients').update({ status: 'failed' }).eq('id', recipient.id);
      }
    }));

    // Small delay between batches
    if (i + BATCH_SIZE < (recipients ?? []).length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // Mark sent + log activity
  await supabase.from('email_campaigns').update({
    status: 'sent',
    sent_at: new Date().toISOString(),
    recipient_count: sentCount,
  }).eq('id', campaignId);

  // Write CRM activity log entries
  const activityRows = (recipients ?? [])
    .filter((r: any) => r.contact_id)
    .map((r: any) => ({
      organization_id: employee.organization_id,
      contact_id: r.contact_id,
      employee_id: employee.id,
      type: 'campaign_sent',
      subject: `Campaign: ${campaign.name}`,
      content: campaign.subject,
      metadata: { campaign_id: campaignId },
    }));

  if (activityRows.length > 0) {
    await supabase.from('crm_activity_log').insert(activityRows);
  }

  return new Response(JSON.stringify({ success: true, sent: sentCount }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

function generateSimpleHtml(contentJson: any, campaign: any): string {
  const blocks = contentJson?.blocks ?? [];
  const blockHtml = blocks.map((block: any) => {
    const p = block.props ?? {};
    switch (block.type) {
      case 'header': return `<div style="background:${p.backgroundColor};padding:${p.paddingTop}px 24px ${p.paddingBottom}px;text-align:center;"><p style="color:${p.textColor};font-size:20px;font-weight:700;margin:0;">${p.orgName}</p></div>`;
      case 'text': return `<div style="background:${p.backgroundColor};padding:${p.paddingTop}px ${p.paddingRight}px ${p.paddingBottom}px ${p.paddingLeft}px;font-size:${p.fontSize}px;color:#111827;">${p.content}</div>`;
      case 'button': return `<div style="text-align:${p.align};padding:${p.paddingTop}px 24px ${p.paddingBottom}px;"><a href="${p.href}" style="background:${p.backgroundColor};color:${p.textColor};padding:12px 28px;border-radius:${p.borderRadius}px;text-decoration:none;font-weight:600;">${p.label}</a></div>`;
      case 'image': return `<div style="text-align:${p.align};"><img src="${p.src}" alt="${p.alt}" style="max-width:100%;" /></div>`;
      case 'divider': return `<hr style="border:none;border-top:${p.height}px solid ${p.color};margin:${p.paddingTop}px 0 ${p.paddingBottom}px;" />`;
      case 'spacer': return `<div style="height:${p.height}px;">&nbsp;</div>`;
      case 'footer': return `<div style="background:${p.backgroundColor};padding:${p.paddingTop}px 24px ${p.paddingBottom}px;text-align:center;font-size:12px;color:${p.textColor};"><p>${p.companyName}</p><p>${p.address}</p><p><a href="{{unsubscribe_url}}" style="color:${p.textColor};">${p.unsubscribeText}</a></p></div>`;
      default: return '';
    }
  }).join('');

  return `<!DOCTYPE html><html><body style="margin:0;background:#f3f4f6;font-family:Inter,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;"><tr><td>${blockHtml}</td></tr></table></td></tr></table><!-- TRACKING_PIXEL_PLACEHOLDER --></body></html>`;
}
