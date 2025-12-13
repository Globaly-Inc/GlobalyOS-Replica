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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to check permissions
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is super admin
    const { data: roleData } = await supabaseUser
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Super admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { organizationId } = await req.json();
    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'Organization ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for deletion
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    console.log(`Starting deletion of organization: ${organizationId}`);

    // Delete all related data in order (respecting foreign key constraints)
    const tablesToDelete = [
      // Feed & Social
      'feed_reactions',
      'update_mentions',
      'updates',
      'kudos',
      
      // Wiki
      'wiki_favorites',
      'wiki_page_versions',
      'wiki_pages',
      'wiki_folders',
      
      // HR
      'attendance_leave_adjustments',
      'attendance_hour_balances',
      'attendance_records',
      'leave_balance_logs',
      'leave_type_balances',
      'leave_requests',
      'leave_type_offices',
      'leave_types',
      'employee_schedules',
      'learning_development',
      'position_history',
      'employee_documents',
      'employee_projects',
      'kpi_ai_insights',
      'kpis',
      'performance_reviews',
      'profile_summaries',
      'achievements',
      
      // Calendar
      'calendar_event_offices',
      'calendar_events',
      
      // Settings
      'kpi_templates',
      'office_qr_codes',
      'projects',
      'offices',
      'positions',
      
      // Notifications
      'notifications',
      
      // User roles (for this org)
      'user_roles',
      
      // Organization members (before employees)
      'organization_members',
      
      // Employees
      'employees',
    ];

    for (const table of tablesToDelete) {
      console.log(`Deleting from ${table}...`);
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('organization_id', organizationId);
      
      if (error) {
        console.error(`Error deleting from ${table}:`, error);
        // Continue with other tables
      }
    }

    // Finally delete the organization itself
    console.log('Deleting organization record...');
    const { error: orgError } = await supabase
      .from('organizations')
      .delete()
      .eq('id', organizationId);

    if (orgError) {
      console.error('Error deleting organization:', orgError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete organization' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Organization ${organizationId} deleted successfully`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
