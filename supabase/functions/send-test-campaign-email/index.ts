import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

  const { data: employee } = await supabase
    .from('employees')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single();
  if (!employee) return new Response(JSON.stringify({ error: 'Employee not found' }), { status: 403, headers: corsHeaders });

  const { campaignId } = await req.json();

  const { data: campaign } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('organization_id', employee.organization_id)
    .single();

  if (!campaign) return new Response(JSON.stringify({ error: 'Campaign not found' }), { status: 404, headers: corsHeaders });

  const { data: org } = await supabase.from('organizations').select('name').eq('id', employee.organization_id).single();
  const contentJson = campaign.content_json as any;
  const blocks = contentJson?.blocks ?? [];

  const blockHtml = blocks.map((block: any) => {
    const p = block.props ?? {};
    switch (block.type) {
      case 'header': return `<div style="background:${p.backgroundColor};padding:${p.paddingTop}px 24px ${p.paddingBottom}px;text-align:center;"><p style="color:${p.textColor};font-size:20px;font-weight:700;margin:0;">${p.orgName}</p></div>`;
      case 'text': return `<div style="padding:${p.paddingTop}px ${p.paddingRight}px ${p.paddingBottom}px ${p.paddingLeft}px;">${p.content}</div>`;
      case 'button': return `<div style="text-align:${p.align};padding:20px;"><a href="${p.href}" style="background:${p.backgroundColor};color:${p.textColor};padding:12px 28px;border-radius:${p.borderRadius}px;text-decoration:none;font-weight:600;">${p.label}</a></div>`;
      case 'footer': return `<div style="text-align:center;padding:16px;font-size:12px;color:${p.textColor};"><p>${p.companyName} — ${p.address}</p><p><a href="{{unsubscribe_url}}">${p.unsubscribeText}</a></p></div>`;
      default: return '';
    }
  }).join('');

  const html = `<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;padding:20px;"><div style="max-width:600px;margin:0 auto;"><div style="background:#f3f4f6;border:2px dashed #d1d5db;padding:12px;text-align:center;margin-bottom:12px;font-size:12px;color:#6b7280;">⚠️ TEST EMAIL — Not sent to real recipients</div>${blockHtml}</div></body></html>`;

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `GlobalyOS Test <hello@globalyos.com>`,
      to: [user.email!],
      subject: `[TEST] ${campaign.subject ?? 'Email Campaign Test'}`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return new Response(JSON.stringify({ error: err }), { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
