import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Validate authorization
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Create client for user validation
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  
  if (userError || !userData?.user) {
    return new Response(
      JSON.stringify({ error: 'Invalid token' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const adminUserId = userData.user.id;

  // Create service client for database operations
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // Verify caller is super_admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', adminUserId)
      .eq('role', 'super_admin')
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('User is not a super admin:', adminUserId);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Super admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { masterCodeId } = await req.json();

    if (!masterCodeId) {
      return new Response(
        JSON.stringify({ error: 'Missing masterCodeId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the master code details for logging before deletion
    const { data: masterCode } = await supabase
      .from('super_admin_master_codes')
      .select('target_user_id, target_email')
      .eq('id', masterCodeId)
      .maybeSingle();

    if (!masterCode) {
      return new Response(
        JSON.stringify({ error: 'Master code not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete the master code
    const { error: deleteError } = await supabase
      .from('super_admin_master_codes')
      .delete()
      .eq('id', masterCodeId);

    if (deleteError) {
      console.error('Failed to delete master code:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete master code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log deletion to activity logs
    await supabase.from('super_admin_activity_logs').insert({
      admin_user_id: adminUserId,
      action_type: 'master_code_deleted',
      entity_type: 'member',
      entity_id: masterCode.target_user_id,
      metadata: { 
        target_email: masterCode.target_email,
      }
    });

    console.log('Deleted master code for:', masterCode.target_email);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in delete-master-code:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
