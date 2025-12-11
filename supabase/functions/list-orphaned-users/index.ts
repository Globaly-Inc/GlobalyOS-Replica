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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify the requesting user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');

    if (!roleData || roleData.length === 0) {
      console.log(`User ${user.id} is not an admin`);
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Find profiles without employee records
    // Use raw SQL to find orphaned users
    const { data: orphanedUsers, error: queryError } = await supabase
      .rpc('get_orphaned_profiles');

    if (queryError) {
      // If the function doesn't exist, fall back to manual query
      console.log('RPC not available, using manual query');
      
      // Get all profiles
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at');

      // Get all employee user_ids
      const { data: employees } = await supabase
        .from('employees')
        .select('user_id');

      const employeeUserIds = new Set(employees?.map(e => e.user_id) || []);
      
      const orphaned = allProfiles?.filter(p => !employeeUserIds.has(p.id)) || [];

      console.log(`Found ${orphaned.length} orphaned users`);

      return new Response(JSON.stringify({ users: orphaned }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found ${orphanedUsers?.length || 0} orphaned users`);

    return new Response(JSON.stringify({ users: orphanedUsers || [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('List orphaned users error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
