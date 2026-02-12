import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const todayUTC = new Date().toISOString().split('T')[0];

    // Find all open jobs with auto_close_on_deadline where close date has passed
    const { data: expiredJobs, error: fetchError } = await supabase
      .from('jobs')
      .select('id, organization_id, title')
      .eq('status', 'open')
      .eq('auto_close_on_deadline', true)
      .lt('application_close_date', todayUTC);

    if (fetchError) {
      console.error('Error fetching expired jobs:', fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!expiredJobs || expiredJobs.length === 0) {
      return new Response(JSON.stringify({ closed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let closedCount = 0;

    for (const job of expiredJobs) {
      const { error: updateError } = await supabase
        .from('jobs')
        .update({ status: 'closed' })
        .eq('id', job.id);

      if (updateError) {
        console.error(`Failed to close job ${job.id}:`, updateError);
        continue;
      }

      // Log activity
      await supabase.from('hiring_activities').insert({
        job_id: job.id,
        organization_id: job.organization_id,
        action: 'job_closed',
        metadata: { reason: 'auto_close_on_deadline', closed_by: 'system' },
      });

      closedCount++;
    }

    console.log(`Auto-closed ${closedCount} expired job(s)`);

    return new Response(JSON.stringify({ closed: closedCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
