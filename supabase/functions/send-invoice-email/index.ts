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

    const { invoiceId, recipientEmail, recipientName, message } = await req.json();
    if (!invoiceId || !recipientEmail) throw new Error('invoiceId and recipientEmail are required');

    // Fetch invoice
    const { data: invoice, error: fetchErr } = await supabase
      .from('accounting_invoices')
      .select('*, accounting_contacts(name, email), crm_contacts(first_name, last_name, email), crm_partners(name, email)')
      .eq('id', invoiceId)
      .single();
    if (fetchErr || !invoice) throw new Error('Invoice not found');

    // Generate public token if not exists
    let publicToken = invoice.public_token;
    if (!publicToken) {
      publicToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
      await supabase.from('accounting_invoices').update({ public_token: publicToken }).eq('id', invoiceId);
    }

    const publicUrl = `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app')}/invoice/${publicToken}`;

    // Format amount
    const formatAmount = (amount: number, currency: string) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

    const amountDue = invoice.amount_due ?? (invoice.total - invoice.amount_paid);

    // Send email via Resend (if RESEND_API_KEY available) or log
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: 'invoices@globalyos.com',
          to: recipientEmail,
          subject: `Invoice ${invoice.invoice_number} - ${formatAmount(amountDue, invoice.currency)} due`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Invoice ${invoice.invoice_number}</h2>
              <p>Dear ${recipientName || 'Client'},</p>
              ${message ? `<p>${message}</p>` : ''}
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Invoice Number</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${invoice.invoice_number}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Date</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${invoice.date}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Due Date</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${invoice.due_date}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">Amount Due</td><td style="padding: 8px; text-align: right; font-weight: bold; font-size: 18px;">${formatAmount(amountDue, invoice.currency)}</td></tr>
              </table>
              <a href="${publicUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Invoice</a>
              <p style="color: #666; font-size: 12px; margin-top: 20px;">This is an automated invoice from GlobalyOS.</p>
            </div>
          `,
        }),
      });
      if (!emailResponse.ok) {
        const err = await emailResponse.text();
        console.error('Resend error:', err);
      }
    }

    // Update invoice status to sent
    if (['approved', 'draft'].includes(invoice.status)) {
      await supabase.from('accounting_invoices').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      }).eq('id', invoiceId);
    }

    // Add system comment
    await supabase.from('accounting_invoice_comments').insert({
      invoice_id: invoiceId,
      organization_id: invoice.organization_id,
      author_type: 'system',
      author_name: 'System',
      content: `Invoice sent to ${recipientEmail}`,
    } as any);

    return new Response(
      JSON.stringify({ success: true, publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
