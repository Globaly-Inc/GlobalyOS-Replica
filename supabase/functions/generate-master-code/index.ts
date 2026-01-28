import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

    const { targetUserId, targetEmail } = await req.json();

    if (!targetUserId || !targetEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing targetUserId or targetEmail' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already has a master code
    const { data: existingCode } = await supabase
      .from('super_admin_master_codes')
      .select('*')
      .eq('target_user_id', targetUserId)
      .maybeSingle();

    if (existingCode) {
      // Return existing code
      console.log('Returning existing master code for:', targetEmail);
      return new Response(
        JSON.stringify({ 
          masterCode: existingCode,
          isExisting: true 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate new code
    const newCode = generateCode();

    const { data: insertedCode, error: insertError } = await supabase
      .from('super_admin_master_codes')
      .insert({
        target_user_id: targetUserId,
        target_email: targetEmail.toLowerCase(),
        code: newCode,
        created_by: adminUserId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert master code:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate master code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log to activity logs
    await supabase.from('super_admin_activity_logs').insert({
      admin_user_id: adminUserId,
      action_type: 'master_code_generated',
      entity_type: 'member',
      entity_id: targetUserId,
      metadata: { 
        target_email: targetEmail.toLowerCase(),
      }
    });

    console.log('Generated new master code for:', targetEmail);

    return new Response(
      JSON.stringify({ 
        masterCode: insertedCode,
        isExisting: false 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-master-code:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
