import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecoverUserRequest {
  userEmail: string;
  organizationId: string;
  position: string;
  department: string;
  joinDate: string;
  officeId?: string;
  role?: string;
}

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

    const { userEmail, organizationId, position, department, joinDate, officeId, role } = await req.json() as RecoverUserRequest;

    if (!userEmail || !organizationId || !position || !department || !joinDate) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Recovering user ${userEmail} for org ${organizationId}`);

    // Find the orphaned profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', userEmail.toLowerCase())
      .single();

    if (profileError || !profile) {
      console.error('Profile not found:', profileError);
      return new Response(JSON.stringify({ error: 'User profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if user already has an employee record
    const { data: existingEmployee } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', profile.id)
      .single();

    if (existingEmployee) {
      return new Response(JSON.stringify({ error: 'User already has an employee record' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create employee record
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .insert({
        user_id: profile.id,
        organization_id: organizationId,
        position,
        department,
        join_date: joinDate,
        office_id: officeId || null,
        status: 'active'
      })
      .select('id')
      .single();

    if (empError) {
      console.error('Failed to create employee:', empError);
      return new Response(JSON.stringify({ error: 'Failed to create employee record: ' + empError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Created employee record ${employee.id} for ${userEmail}`);

    // Add organization membership
    const { error: orgError } = await supabase
      .from('organization_members')
      .insert({
        user_id: profile.id,
        organization_id: organizationId,
        role: 'member'
      });

    if (orgError) {
      console.error('Failed to add org membership:', orgError);
      // Continue anyway - employee record is more important
    }

    // Add user role
    const userRole = role && ['admin', 'hr', 'user'].includes(role.toLowerCase()) 
      ? role.toLowerCase() 
      : 'user';

    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: profile.id,
        organization_id: organizationId,
        role: userRole
      });

    if (roleError) {
      console.error('Failed to add user role:', roleError);
      // Continue anyway
    }

    console.log(`Successfully recovered user ${userEmail}`);

    return new Response(JSON.stringify({ 
      success: true, 
      employeeId: employee.id,
      message: `Successfully linked ${profile.full_name} to the organization`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Recovery error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
