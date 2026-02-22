import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const today = new Date().toISOString().split('T')[0];

    // Find pending schedules due today or earlier
    const { data: schedules, error: sErr } = await supabase
      .from('accounting_invoice_schedules')
      .select('*, crm_deals(id, title, contact_id, organization_id)')
      .eq('status', 'pending')
      .lte('scheduled_date', today)
      .limit(50);

    if (sErr) throw sErr;
    if (!schedules || schedules.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending schedules', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processed = 0;
    const errors: string[] = [];

    for (const schedule of schedules) {
      try {
        const deal = (schedule as any).crm_deals;
        if (!deal) {
          errors.push(`Schedule ${schedule.id}: missing deal data`);
          continue;
        }

        // Fetch fee separately (no FK relationship)
        const { data: fee } = await supabase
          .from('crm_deal_fees')
          .select('id, fee_name, amount, currency, tax_amount')
          .eq('id', schedule.deal_fee_id)
          .maybeSingle();
        if (!fee) {
          errors.push(`Schedule ${schedule.id}: missing fee data`);
          continue;
        }

        // Get ledger for org
        const { data: setup } = await supabase
          .from('accounting_setups')
          .select('id')
          .eq('organization_id', schedule.organization_id)
          .eq('status', 'active')
          .maybeSingle();
        if (!setup) { errors.push(`Schedule ${schedule.id}: no active accounting setup`); continue; }

        const { data: ledger } = await supabase
          .from('accounting_ledgers')
          .select('id')
          .eq('setup_id', setup.id)
          .eq('is_active', true)
          .maybeSingle();
        if (!ledger) { errors.push(`Schedule ${schedule.id}: no active ledger`); continue; }

        // Get an office
        const { data: offices } = await supabase
          .from('offices')
          .select('id')
          .eq('organization_id', schedule.organization_id)
          .limit(1);
        const officeId = offices?.[0]?.id;
        if (!officeId) { errors.push(`Schedule ${schedule.id}: no office`); continue; }

        // Generate invoice number
        const { data: lastInv } = await supabase
          .from('accounting_invoices')
          .select('invoice_number')
          .eq('ledger_id', ledger.id)
          .order('created_at', { ascending: false })
          .limit(1);
        const lastNum = lastInv?.[0]?.invoice_number;
        const num = lastNum ? (parseInt(lastNum.replace(/\D/g, '')) || 0) + 1 : 1;
        const invoiceNumber = `INV-${String(num).padStart(4, '0')}`;

        // Create invoice
        const feeAmount = fee.amount || 0;
        const feeTax = fee.tax_amount || 0;

        const { data: invoice, error: iErr } = await supabase
          .from('accounting_invoices')
          .insert({
            organization_id: schedule.organization_id,
            ledger_id: ledger.id,
            office_id: officeId,
            invoice_number: invoiceNumber,
            date: today,
            due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
            subtotal: feeAmount,
            tax_total: feeTax,
            total: feeAmount + feeTax,
            currency: fee.currency || 'AUD',
            status: schedule.auto_send ? 'sent' : 'draft',
            created_by: '00000000-0000-0000-0000-000000000000',
            deal_id: deal.id,
            invoice_type: 'general',
          } as any)
          .select()
          .single();
        if (iErr) throw iErr;

        // Update schedule
        await supabase
          .from('accounting_invoice_schedules')
          .update({ status: 'generated', invoice_id: invoice.id } as any)
          .eq('id', schedule.id);

        processed++;
      } catch (e: any) {
        errors.push(`Schedule ${schedule.id}: ${e.message}`);
      }
    }

    return new Response(
      JSON.stringify({ processed, errors, total: schedules.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
