import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Not authenticated');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify user
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claims, error: claimsErr } = await anonClient.auth.getClaims(
      authHeader.replace('Bearer ', '')
    );
    if (claimsErr || !claims?.claims?.sub) throw new Error('Unauthorized');

    const { quotationId, recipientEmail, recipientName, subject, message } = await req.json();
    if (!quotationId || !recipientEmail) throw new Error('quotationId and recipientEmail are required');

    // Fetch quotation with related data
    const { data: quotation, error: fetchErr } = await supabase
      .from('crm_quotations')
      .select(`
        *,
        contact:crm_contacts!crm_quotations_contact_id_fkey(id, first_name, last_name, email),
        company:crm_companies!crm_quotations_company_id_fkey(id, name),
        options:crm_quotation_options(
          id, name, total, sort_order,
          services:crm_quotation_option_services(
            id, service_name, sort_order,
            fees:crm_quotation_service_fees(id, fee_name, amount, tax_amount, total_amount)
          )
        )
      `)
      .eq('id', quotationId)
      .single();

    if (fetchErr || !quotation) throw new Error('Quotation not found');

    // Fetch organization for branding
    const { data: org } = await supabase
      .from('organizations')
      .select('name, logo_url')
      .eq('id', quotation.organization_id)
      .single();

    const orgName = org?.name || 'Our Company';

    // Generate public token if not exists
    let publicToken = quotation.public_token;
    if (!publicToken) {
      publicToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      await supabase.from('crm_quotations').update({
        public_token: publicToken,
        token_expires_at: expiresAt.toISOString(),
      }).eq('id', quotationId);
    }

    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://globalyos.lovable.app';
    const publicUrl = `${appBaseUrl}/quote/${publicToken}`;

    // Format currency helper
    const fmt = (amount: number) =>
      `${quotation.currency} ${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Build options HTML
    const sortedOptions = (quotation.options || []).sort((a: any, b: any) => a.sort_order - b.sort_order);
    let optionsHtml = '';
    for (const option of sortedOptions) {
      const sortedServices = (option.services || []).sort((a: any, b: any) => a.sort_order - b.sort_order);
      let servicesHtml = '';
      for (const svc of sortedServices) {
        const feesHtml = (svc.fees || []).map((fee: any) =>
          `<tr><td style="padding:6px 12px;color:#555;font-size:13px;">${fee.fee_name}</td><td style="padding:6px 12px;text-align:right;font-size:13px;">${fmt(fee.total_amount)}</td></tr>`
        ).join('');
        servicesHtml += `
          <tr><td colspan="2" style="padding:8px 12px;font-weight:600;font-size:14px;background:#f9fafb;border-top:1px solid #e5e7eb;">${svc.service_name}</td></tr>
          ${feesHtml}
        `;
      }

      optionsHtml += `
        <div style="border:1px solid #e5e7eb;border-radius:8px;margin-bottom:16px;overflow:hidden;">
          <div style="padding:12px 16px;background:#f0f4ff;">
            <strong style="font-size:15px;">${option.name}</strong>
          </div>
          <table style="width:100%;border-collapse:collapse;">
            ${servicesHtml}
          </table>
          <div style="padding:10px 16px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;">
            <span style="font-weight:600;">Option Total</span>
            <span style="font-weight:700;font-size:16px;">${fmt(option.total)}</span>
          </div>
        </div>
      `;
    }

    // Valid until
    const validUntilStr = quotation.valid_until
      ? new Date(quotation.valid_until).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : null;

    const emailSubject = subject || `Quotation ${quotation.quotation_number} from ${orgName}`;
    const personalMessage = message || '';

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;margin-top:24px;margin-bottom:24px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#2563eb,#3b82f6);padding:32px 24px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">${orgName}</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">Quotation ${quotation.quotation_number}</p>
    </div>

    <!-- Body -->
    <div style="padding:24px;">
      <p style="font-size:15px;color:#333;">Dear ${recipientName || 'Client'},</p>
      ${personalMessage ? `<p style="font-size:14px;color:#555;line-height:1.6;">${personalMessage.replace(/\n/g, '<br>')}</p>` : ''}
      <p style="font-size:14px;color:#555;">Please find below the details of your quotation:</p>

      <!-- Summary -->
      <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f9fafb;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:10px 16px;font-size:14px;color:#666;">Quotation Number</td><td style="padding:10px 16px;text-align:right;font-weight:600;">${quotation.quotation_number}</td></tr>
        <tr><td style="padding:10px 16px;font-size:14px;color:#666;">Grand Total</td><td style="padding:10px 16px;text-align:right;font-weight:700;font-size:18px;color:#2563eb;">${fmt(quotation.grand_total)}</td></tr>
        ${validUntilStr ? `<tr><td style="padding:10px 16px;font-size:14px;color:#666;">Valid Until</td><td style="padding:10px 16px;text-align:right;font-weight:500;">${validUntilStr}</td></tr>` : ''}
      </table>

      <!-- Options -->
      ${optionsHtml}

      <!-- CTA -->
      <div style="text-align:center;margin:28px 0;">
        <a href="${publicUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
          View & Approve Quotation
        </a>
      </div>

      ${quotation.cover_letter ? `<p style="font-size:13px;color:#888;border-top:1px solid #eee;padding-top:16px;white-space:pre-wrap;">${quotation.cover_letter}</p>` : ''}
    </div>

    <!-- Footer -->
    <div style="padding:16px 24px;background:#f9fafb;text-align:center;border-top:1px solid #eee;">
      <p style="font-size:12px;color:#999;margin:0;">This quotation was sent by ${orgName} via GlobalyOS.</p>
    </div>
  </div>
</body>
</html>`;

    // Send via Resend
    const resendKey = Deno.env.get('RESEND_API_KEY');
    let resendId: string | null = null;

    if (resendKey) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: `${orgName} <hello@globalyos.com>`,
          to: recipientEmail,
          subject: emailSubject,
          html: emailHtml,
          tags: [
            { name: 'type', value: 'quotation' },
            { name: 'quotation_id', value: quotationId },
          ],
        }),
      });

      if (!emailResponse.ok) {
        const err = await emailResponse.text();
        console.error('Resend error:', err);
        throw new Error(`Email sending failed: ${err}`);
      }

      const result = await emailResponse.json();
      resendId = result.id || null;
    } else {
      console.log('RESEND_API_KEY not configured, email logged but not sent');
    }

    // Update quotation status to sent
    if (['draft'].includes(quotation.status)) {
      await supabase.from('crm_quotations').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      }).eq('id', quotationId);
    }

    // Add system comment
    await supabase.from('crm_quotation_comments').insert({
      quotation_id: quotationId,
      organization_id: quotation.organization_id,
      author_type: 'system',
      author_name: 'System',
      content: `Quotation emailed to ${recipientEmail}${resendId ? ` (ID: ${resendId})` : ''}`,
    });

    return new Response(
      JSON.stringify({ success: true, publicUrl, resend_id: resendId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('send-quotation-email error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
