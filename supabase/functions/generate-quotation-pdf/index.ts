import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { quotation_id } = await req.json();
    if (!quotation_id) {
      return new Response(JSON.stringify({ error: 'quotation_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role to fetch full quotation data
    const serviceClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Fetch quotation
    const { data: quotation, error: qErr } = await serviceClient
      .from('crm_quotations')
      .select('*')
      .eq('id', quotation_id)
      .single();

    if (qErr || !quotation) {
      return new Response(JSON.stringify({ error: 'Quotation not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch contact
    let contactName = 'N/A';
    let contactEmail = '';
    if (quotation.contact_id) {
      const { data: contact } = await serviceClient
        .from('crm_contacts')
        .select('first_name, last_name, email')
        .eq('id', quotation.contact_id)
        .maybeSingle();
      if (contact) {
        contactName = `${contact.first_name} ${contact.last_name || ''}`.trim();
        contactEmail = contact.email || '';
      }
    }

    // Fetch company
    let companyName = '';
    if (quotation.company_id) {
      const { data: company } = await serviceClient
        .from('crm_companies')
        .select('name')
        .eq('id', quotation.company_id)
        .maybeSingle();
      if (company) companyName = company.name;
    }

    // Fetch organization
    const { data: org } = await serviceClient
      .from('organizations')
      .select('name')
      .eq('id', quotation.organization_id)
      .maybeSingle();

    // Fetch options -> services -> fees
    const { data: options } = await serviceClient
      .from('crm_quotation_options')
      .select('*')
      .eq('quotation_id', quotation_id)
      .order('sort_order');

    const optionIds = (options || []).map((o: any) => o.id);
    let services: any[] = [];
    if (optionIds.length > 0) {
      const { data: svcData } = await serviceClient
        .from('crm_quotation_option_services')
        .select('*')
        .in('option_id', optionIds)
        .order('sort_order');
      services = svcData || [];
    }

    const serviceIds = services.map((s: any) => s.id);
    let fees: any[] = [];
    if (serviceIds.length > 0) {
      const { data: feeData } = await serviceClient
        .from('crm_quotation_service_fees')
        .select('*')
        .in('option_service_id', serviceIds);
      fees = feeData || [];
    }

    // Build HTML for the quotation
    const optionsHtml = (options || []).map((opt: any) => {
      const optServices = services.filter((s: any) => s.option_id === opt.id);
      const servicesHtml = optServices.map((svc: any) => {
        const svcFees = fees.filter((f: any) => f.option_service_id === svc.id);
        const feesHtml = svcFees.map((f: any) => `
          <tr>
            <td style="padding:4px 8px;font-size:12px;color:#666;">${f.fee_name}</td>
            <td style="padding:4px 8px;font-size:12px;text-align:right;">${quotation.currency} ${Number(f.amount).toFixed(2)}</td>
            <td style="padding:4px 8px;font-size:12px;text-align:right;">${quotation.currency} ${Number(f.tax_amount).toFixed(2)}</td>
            <td style="padding:4px 8px;font-size:12px;text-align:right;font-weight:600;">${quotation.currency} ${Number(f.total_amount).toFixed(2)}</td>
          </tr>
        `).join('');

        return `
          <div style="margin-bottom:12px;">
            <div style="font-weight:600;font-size:13px;margin-bottom:4px;">${svc.service_name}</div>
            ${svcFees.length > 0 ? `
              <table style="width:100%;border-collapse:collapse;">
                <thead>
                  <tr style="border-bottom:1px solid #e5e7eb;">
                    <th style="text-align:left;padding:4px 8px;font-size:11px;color:#999;font-weight:500;">Fee</th>
                    <th style="text-align:right;padding:4px 8px;font-size:11px;color:#999;font-weight:500;">Amount</th>
                    <th style="text-align:right;padding:4px 8px;font-size:11px;color:#999;font-weight:500;">Tax</th>
                    <th style="text-align:right;padding:4px 8px;font-size:11px;color:#999;font-weight:500;">Total</th>
                  </tr>
                </thead>
                <tbody>${feesHtml}</tbody>
              </table>
            ` : '<p style="font-size:12px;color:#999;">No fees configured</p>'}
          </div>
        `;
      }).join('');

      return `
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px;${opt.is_approved ? 'border-color:#22c55e;background:#f0fdf4;' : ''}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <h3 style="font-size:16px;font-weight:600;margin:0;">${opt.name}</h3>
            <span style="font-size:16px;font-weight:700;">${quotation.currency} ${Number(opt.total).toFixed(2)}</span>
          </div>
          ${opt.description ? `<p style="font-size:13px;color:#666;margin-bottom:12px;">${opt.description}</p>` : ''}
          ${servicesHtml}
        </div>
      `;
    }).join('');

    const validUntilStr = quotation.valid_until
      ? new Date(quotation.valid_until).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'N/A';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin:0; padding:40px; color:#1a1a1a; }
          .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; border-bottom:2px solid #1a1a1a; padding-bottom:24px; }
          .meta { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:32px; }
          .meta-item { font-size:13px; }
          .meta-label { color:#999; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px; }
          .totals { border-top:2px solid #e5e7eb; padding-top:16px; margin-top:24px; }
          .total-row { display:flex; justify-content:space-between; font-size:14px; margin-bottom:6px; }
          .total-row.grand { font-size:18px; font-weight:700; border-top:1px solid #e5e7eb; padding-top:8px; margin-top:8px; }
          .cover-letter { background:#f9fafb; border-radius:8px; padding:16px; margin-bottom:24px; font-size:13px; line-height:1.6; }
          .footer { margin-top:40px; text-align:center; font-size:11px; color:#999; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 style="font-size:28px;margin:0 0 4px;">Quotation</h1>
            <p style="font-size:14px;color:#666;margin:0;">${quotation.quotation_number}</p>
          </div>
          <div style="text-align:right;">
            <p style="font-size:16px;font-weight:600;margin:0;">${org?.name || ''}</p>
          </div>
        </div>

        <div class="meta">
          <div class="meta-item">
            <div class="meta-label">Prepared For</div>
            <div style="font-weight:600;">${contactName}</div>
            ${contactEmail ? `<div style="color:#666;">${contactEmail}</div>` : ''}
            ${companyName ? `<div style="color:#666;">${companyName}</div>` : ''}
          </div>
          <div class="meta-item" style="text-align:right;">
            <div class="meta-label">Date</div>
            <div>${new Date(quotation.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <div class="meta-label" style="margin-top:8px;">Valid Until</div>
            <div>${validUntilStr}</div>
          </div>
        </div>

        ${quotation.cover_letter ? `<div class="cover-letter">${quotation.cover_letter}</div>` : ''}

        <h2 style="font-size:18px;margin-bottom:16px;">Options</h2>
        ${optionsHtml}

        <div class="totals">
          <div class="total-row">
            <span>Subtotal</span>
            <span>${quotation.currency} ${Number(quotation.subtotal).toFixed(2)}</span>
          </div>
          ${quotation.discount_amount > 0 ? `
            <div class="total-row" style="color:#22c55e;">
              <span>Discount</span>
              <span>-${quotation.currency} ${Number(quotation.discount_amount).toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="total-row">
            <span>Tax</span>
            <span>${quotation.currency} ${Number(quotation.tax_total).toFixed(2)}</span>
          </div>
          <div class="total-row grand">
            <span>Grand Total</span>
            <span>${quotation.currency} ${Number(quotation.grand_total).toFixed(2)}</span>
          </div>
        </div>

        ${quotation.notes ? `
          <div style="margin-top:32px;">
            <h3 style="font-size:14px;margin-bottom:8px;">Notes</h3>
            <p style="font-size:13px;color:#666;white-space:pre-line;">${quotation.notes}</p>
          </div>
        ` : ''}

        <div class="footer">
          <p>Generated by GlobalyOS • ${new Date().toLocaleDateString('en-AU')}</p>
        </div>
      </body>
      </html>
    `;

    return new Response(
      JSON.stringify({ html, quotation_number: quotation.quotation_number }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
