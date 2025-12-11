import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmployeeData {
  first_name: string;
  last_name: string;
  email: string;
  personal_email?: string;
  phone?: string;
  department: string;
  position: string;
  join_date: string;
  date_of_birth?: string;
  office_name?: string;
  street?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  id_number?: string;
  tax_number?: string;
  remuneration?: string;
  remuneration_currency?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  role?: string;
}

interface ImportResult {
  email: string;
  name: string;
  success: boolean;
  error?: string;
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify the user making the request
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if user is admin or HR
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'hr']);

    if (!roleData || roleData.length === 0) {
      console.log(`User ${user.id} does not have admin or hr role`);
      return new Response(JSON.stringify({ error: 'Admin or HR access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`User ${user.id} has role(s): ${roleData.map(r => r.role).join(', ')}`);

    const { employees, organizationId } = await req.json() as { 
      employees: EmployeeData[]; 
      organizationId: string;
    };

    if (!employees || !Array.isArray(employees) || employees.length === 0) {
      return new Response(JSON.stringify({ error: 'No employees provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Starting bulk import of ${employees.length} employees for org ${organizationId}`);

    // Fetch offices for mapping
    const { data: offices } = await supabase
      .from('offices')
      .select('id, name')
      .eq('organization_id', organizationId);

    const officeMap = new Map(offices?.map(o => [o.name.toLowerCase(), o.id]) || []);

    const results: ImportResult[] = [];

    for (const emp of employees) {
      const fullName = `${emp.first_name} ${emp.last_name}`.trim();
      
      try {
        // Check if email already exists
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', emp.email.toLowerCase())
          .maybeSingle();

        if (existingUser) {
          console.log(`Skipping ${emp.email} - already exists`);
          results.push({
            email: emp.email,
            name: fullName,
            success: false,
            error: 'Email already exists'
          });
          continue;
        }

        // Create auth user with service role
        const tempPassword = crypto.randomUUID();
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: emp.email.toLowerCase(),
          password: tempPassword,
          email_confirm: false,
          user_metadata: { full_name: fullName }
        });

        if (authError || !authData.user) {
          console.error(`Failed to create user ${emp.email}:`, authError);
          results.push({
            email: emp.email,
            name: fullName,
            success: false,
            error: authError?.message || 'Failed to create user'
          });
          continue;
        }

        console.log(`Created auth user for ${emp.email}: ${authData.user.id}`);

        // Create profile (trigger might handle this, but let's be safe)
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          email: emp.email.toLowerCase(),
          full_name: fullName
        }, { onConflict: 'id' });

        // Create employee record
        const officeId = emp.office_name ? officeMap.get(emp.office_name.toLowerCase()) : null;
        
        const { error: empError } = await supabase
          .from('employees')
          .insert({
            user_id: authData.user.id,
            organization_id: organizationId,
            position: emp.position,
            department: emp.department,
            join_date: emp.join_date,
            phone: emp.phone || null,
            date_of_birth: emp.date_of_birth || null,
            office_id: officeId,
            street: emp.street || null,
            city: emp.city || null,
            state: emp.state || null,
            postcode: emp.postcode || null,
            country: emp.country || null,
            id_number: emp.id_number || null,
            tax_number: emp.tax_number || null,
            remuneration: emp.remuneration ? parseFloat(emp.remuneration) : null,
            remuneration_currency: emp.remuneration_currency || 'USD',
            emergency_contact_name: emp.emergency_contact_name || null,
            emergency_contact_phone: emp.emergency_contact_phone || null,
            emergency_contact_relationship: emp.emergency_contact_relationship || null,
            personal_email: emp.personal_email || null,
            status: 'invited'
          });

        if (empError) {
          console.error(`Failed to create employee record for ${emp.email}:`, empError);
          results.push({
            email: emp.email,
            name: fullName,
            success: false,
            error: empError.message
          });
          continue;
        }

        // Add organization membership
        await supabase.from('organization_members').insert({
          user_id: authData.user.id,
          organization_id: organizationId,
          role: 'member'
        });

        // Add user role if specified
        if (emp.role && ['admin', 'hr', 'user'].includes(emp.role.toLowerCase())) {
          await supabase.from('user_roles').insert({
            user_id: authData.user.id,
            organization_id: organizationId,
            role: emp.role.toLowerCase()
          });
        }

        console.log(`Successfully imported ${emp.email}`);
        results.push({
          email: emp.email,
          name: fullName,
          success: true
        });

      } catch (err: any) {
        console.error(`Error importing ${emp.email}:`, err);
        results.push({
          email: emp.email,
          name: fullName,
          success: false,
          error: err.message || 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Bulk import completed: ${successCount}/${results.length} successful`);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Bulk import error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
