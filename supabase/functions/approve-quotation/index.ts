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
    const { token, option_id, approver_name, approver_email, comment } = await req.json();

    if (!token || !option_id || !approver_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: token, option_id, approver_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch quotation by token
    const { data: quotation, error: fetchErr } = await supabase
      .from('crm_quotations')
      .select('id, status, token_expires_at, organization_id')
      .eq('public_token', token)
      .single();

    if (fetchErr || !quotation) {
      return new Response(
        JSON.stringify({ error: 'Quotation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiry
    if (quotation.token_expires_at && new Date(quotation.token_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'This quotation link has expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check status
    if (!['sent', 'viewed'].includes(quotation.status)) {
      return new Response(
        JSON.stringify({ error: `Quotation cannot be approved in status: ${quotation.status}` }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify option belongs to this quotation
    const { data: option } = await supabase
      .from('crm_quotation_options')
      .select('id')
      .eq('id', option_id)
      .eq('quotation_id', quotation.id)
      .single();

    if (!option) {
      return new Response(
        JSON.stringify({ error: 'Invalid option selected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Approve
    const { error: updateErr } = await supabase
      .from('crm_quotations')
      .update({
        status: 'approved',
        approved_option_id: option_id,
        approved_at: new Date().toISOString(),
        approved_by_name: approver_name,
        approved_by_email: approver_email || null,
      })
      .eq('id', quotation.id);

    if (updateErr) throw updateErr;

    // Mark the option as approved
    await supabase
      .from('crm_quotation_options')
      .update({ is_approved: true })
      .eq('id', option_id);

    // Add comment if provided
    if (comment?.trim()) {
      await supabase.from('crm_quotation_comments').insert({
        quotation_id: quotation.id,
        organization_id: quotation.organization_id,
        author_type: 'client',
        author_name: approver_name,
        content: comment.trim(),
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Quotation approved successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
