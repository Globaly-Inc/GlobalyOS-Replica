import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APP_URL = 'https://globalyos.lovable.app';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

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

function generateHtml(contentJson: any): string {
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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Uses service role — called by cron
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Find campaigns whose schedule_at is in the past and still in 'scheduled' status
  const now = new Date().toISOString();
  const { data: campaigns, error } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('status', 'scheduled')
    .lte('schedule_at', now);

  if (error) {
    console.error('Error fetching scheduled campaigns:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }

  if (!campaigns || campaigns.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), { headers: corsHeaders });
  }

  let processed = 0;

  for (const campaign of campaigns) {
    try {
      const contentJson = campaign.content_json as any;
      const hasFooter = contentJson?.blocks?.some((b: any) => b.type === 'footer');
      if (!hasFooter || !campaign.subject || !campaign.from_email) continue;

      // Get suppressions
      const { data: suppressions } = await supabase
        .from('email_suppressions')
        .select('email')
        .eq('organization_id', campaign.organization_id);
      const suppressedEmails = new Set((suppressions ?? []).map((s: any) => s.email.toLowerCase()));

      // Get org info
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', campaign.organization_id)
        .single();

      // Get contacts
      const filters = (campaign.audience_filters as any) ?? {};
      let contactQuery = supabase
        .from('crm_contacts')
        .select('id, first_name, last_name, email, company:crm_companies(name)')
        .eq('organization_id', campaign.organization_id)
        .eq('is_archived', false)
        .not('email', 'is', null);

      if (filters.rating) contactQuery = contactQuery.eq('rating', filters.rating);
      if (filters.tags?.length) contactQuery = contactQuery.contains('tags', filters.tags);

      const { data: contacts } = await contactQuery;
      const validContacts = (contacts ?? []).filter(
        (c: any) => c.email && !suppressedEmails.has(c.email.toLowerCase())
      );

      if (validContacts.length === 0) {
        await supabase.from('email_campaigns').update({ status: 'failed' }).eq('id', campaign.id);
        continue;
      }

      // Insert recipients
      const recipientRows = validContacts.map((c: any) => ({
        organization_id: campaign.organization_id,
        campaign_id: campaign.id,
        contact_id: c.id,
        email: c.email,
        full_name: [c.first_name, c.last_name].filter(Boolean).join(' ') || null,
        status: 'queued',
      }));

      await supabase.from('campaign_recipients').insert(recipientRows);
      await supabase.from('email_campaigns').update({
        status: 'sending',
        recipient_count: validContacts.length,
      }).eq('id', campaign.id);

      // Load recipients with tokens
      const { data: recipients } = await supabase
        .from('campaign_recipients')
        .select('id, email, full_name, contact_id, unsubscribe_token')
        .eq('campaign_id', campaign.id)
        .eq('organization_id', campaign.organization_id);

      const baseHtml = generateHtml(contentJson);
      const BATCH_SIZE = 50;
      let sentCount = 0;

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

          let html = substituteTokens(baseHtml, tokens);
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

        if (i + BATCH_SIZE < (recipients ?? []).length) {
          await new Promise(r => setTimeout(r, 200));
        }
      }

      await supabase.from('email_campaigns').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        recipient_count: sentCount,
      }).eq('id', campaign.id);

      // Log CRM activity
      const activityRows = (recipients ?? [])
        .filter((r: any) => r.contact_id)
        .map((r: any) => ({
          organization_id: campaign.organization_id,
          contact_id: r.contact_id,
          employee_id: campaign.created_by ?? null,
          type: 'campaign_sent',
          subject: `Campaign: ${campaign.name}`,
          content: campaign.subject,
          metadata: { campaign_id: campaign.id },
        }));

      if (activityRows.length > 0) {
        await supabase.from('crm_activity_log').insert(activityRows);
      }

      processed++;
    } catch (err) {
      console.error(`Failed to process campaign ${campaign.id}:`, err);
    }
  }

  return new Response(JSON.stringify({ processed }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
