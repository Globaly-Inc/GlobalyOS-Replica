import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  // Resolve org from employee
  const { data: employee } = await supabase
    .from('employees')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!employee) {
    return new Response(JSON.stringify({ error: 'Employee not found' }), { status: 403, headers: corsHeaders });
  }

  const body = await req.json();
  const { source = 'crm_contacts', filters = {} } = body;
  const orgId = employee.organization_id;

  try {
    if (source === 'crm_contacts') {
      // Build query for CRM contacts
      let query = supabase
        .from('crm_contacts')
        .select('id, email', { count: 'exact' })
        .eq('organization_id', orgId)
        .eq('is_archived', false)
        .not('email', 'is', null);

      if (filters.tags?.length) {
        query = query.overlaps('tags', filters.tags);
      }
      if (filters.rating) {
        query = query.eq('rating', filters.rating);
      }
      if (filters.source) {
        query = query.eq('source', filters.source);
      }

      const { count: totalCount, error: contactsError } = await query;
      if (contactsError) throw contactsError;

      // Count suppressions that overlap
      const { data: contacts } = await query.select('email');
      const emails = (contacts ?? []).map((c: any) => c.email).filter(Boolean);

      let suppressedCount = 0;
      if (emails.length > 0) {
        const { count } = await supabase
          .from('email_suppressions')
          .select('id', { count: 'exact' })
          .eq('organization_id', orgId)
          .in('email', emails);
        suppressedCount = count ?? 0;
      }

      const noEmailCount = 0; // already filtered with .not('email', 'is', null)
      const eligibleCount = Math.max(0, (totalCount ?? 0) - suppressedCount);

      return new Response(JSON.stringify({
        total: totalCount ?? 0,
        eligible: eligibleCount,
        suppressed: suppressedCount,
        missing_email: noEmailCount,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } else if (source === 'crm_companies') {
      const { count: totalCount } = await supabase
        .from('crm_companies')
        .select('id', { count: 'exact' })
        .eq('organization_id', orgId)
        .not('email', 'is', null);

      return new Response(JSON.stringify({
        total: totalCount ?? 0,
        eligible: totalCount ?? 0,
        suppressed: 0,
        missing_email: 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ total: 0, eligible: 0, suppressed: 0, missing_email: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
