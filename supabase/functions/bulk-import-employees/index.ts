import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

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
  manager_email?: string;
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
  emailSent?: boolean;
}

async function sendWelcomeEmail(
  email: string,
  fullName: string,
  position: string,
  department: string,
  joinDate: string,
  role: string
): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return false;
  }

  const appUrl = 'https://www.globalyos.com';
  const loginUrl = `${appUrl}/auth`;
  const roleLabel = role === 'admin' ? 'Administrator' : role === 'hr' ? 'HR Manager' : 'User';

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #6366f1; margin: 0; font-size: 28px; }
        .content { background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 30px; }
        .details { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .details p { margin: 8px 0; }
        .details strong { color: #64748b; }
        .success-badge { background: #dcfce7; color: #166534; padding: 12px 20px; border-radius: 8px; text-align: center; font-weight: 600; margin: 20px 0; }
        .cta { text-align: center; margin: 30px 0; }
        .button { display: inline-block; background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }
        .footer { text-align: center; color: #64748b; font-size: 14px; }
        .note { background: #e0f2fe; border-radius: 8px; padding: 15px; margin: 20px 0; font-size: 14px; color: #0369a1; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to GlobalyOS!</h1>
        </div>
        <div class="content">
          <p>Hi <strong>${fullName}</strong>,</p>
          <div class="success-badge">
            ✓ Your account has been successfully created
          </div>
          <p>You've been added to GlobalyOS. Here are your details:</p>
          <div class="details">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Position:</strong> ${position}</p>
            <p><strong>Department:</strong> ${department}</p>
            <p><strong>Start Date:</strong> ${joinDate ? new Date(joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'To be confirmed'}</p>
            <p><strong>Role:</strong> ${roleLabel}</p>
          </div>
          <p>You can now log in to GlobalyOS using your email address:</p>
          <div class="cta">
            <a href="${loginUrl}" class="button">Log In to GlobalyOS</a>
          </div>
          <div class="note">
            <strong>How to log in:</strong> Click the button above and enter your email address. You'll receive a one-time login code to access your account.
          </div>
        </div>
        <div class="footer">
          <p>If you have any questions, please contact your administrator.</p>
          <p style="margin-top: 10px; font-size: 12px; color: #94a3b8;">GlobalyOS - Your team management platform</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'GlobalyOS <hello@globalyhub.com>',
        to: [email],
        subject: '🎉 Welcome to GlobalyOS - Your Account is Ready!',
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const emailError = await emailResponse.text();
      console.error('Error sending welcome email:', emailError);
      return false;
    }
    
    console.log('Welcome email sent successfully to:', email);
    return true;
  } catch (err) {
    console.error('Error sending welcome email:', err);
    return false;
  }
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

    // Fetch all existing employees for manager email mapping
    const { data: existingEmployees } = await supabase
      .from('employees')
      .select('id, user_id, profiles:user_id(email)')
      .eq('organization_id', organizationId);

    const managerEmailMap = new Map<string, string>();
    existingEmployees?.forEach((emp: any) => {
      if (emp.profiles?.email) {
        managerEmailMap.set(emp.profiles.email.toLowerCase(), emp.id);
      }
    });

    const results: ImportResult[] = [];
    const createdEmployees: { email: string; employeeId: string }[] = [];

    // First pass: create all employees
    for (const emp of employees) {
      const fullName = `${emp.first_name} ${emp.last_name}`.trim();
      let createdUserId: string | null = null;
      
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

        // Create auth user with service role - confirm email immediately since added by admin
        const tempPassword = crypto.randomUUID();
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: emp.email.toLowerCase(),
          password: tempPassword,
          email_confirm: true,
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

        // Store user ID for potential rollback
        createdUserId = authData.user.id;
        console.log(`Created auth user for ${emp.email}: ${createdUserId}`);

        // Create profile (trigger might handle this, but let's be safe)
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: createdUserId,
          email: emp.email.toLowerCase(),
          full_name: fullName
        }, { onConflict: 'id' });

        if (profileError) {
          console.error(`Failed to create profile for ${emp.email}:`, profileError);
          // Rollback: delete auth user
          await supabase.auth.admin.deleteUser(createdUserId);
          console.log(`Rolled back auth user ${createdUserId} due to profile creation failure`);
          results.push({
            email: emp.email,
            name: fullName,
            success: false,
            error: 'Failed to create profile: ' + profileError.message
          });
          continue;
        }

        // Create employee record
        const officeId = emp.office_name ? officeMap.get(emp.office_name.toLowerCase()) : null;
        
        // Resolve manager_id from manager_email
        let managerId: string | null = null;
        if (emp.manager_email) {
          managerId = managerEmailMap.get(emp.manager_email.toLowerCase()) || null;
          if (!managerId) {
            console.log(`Manager email ${emp.manager_email} not found for ${emp.email}`);
          }
        }
        
        const { data: employeeData, error: empError } = await supabase
          .from('employees')
          .insert({
            user_id: createdUserId,
            organization_id: organizationId,
            position: emp.position,
            department: emp.department,
            join_date: emp.join_date,
            phone: emp.phone || null,
            date_of_birth: emp.date_of_birth || null,
            office_id: officeId,
            manager_id: managerId,
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
            status: 'active' // Set as active since account is confirmed
          })
          .select('id')
          .single();

        if (empError) {
          console.error(`Failed to create employee record for ${emp.email}:`, empError);
          // Rollback: delete profile and auth user
          await supabase.from('profiles').delete().eq('id', createdUserId);
          await supabase.auth.admin.deleteUser(createdUserId);
          console.log(`Rolled back auth user and profile ${createdUserId} due to employee creation failure`);
          results.push({
            email: emp.email,
            name: fullName,
            success: false,
            error: 'Failed to create employee: ' + empError.message
          });
          continue;
        }

        // Add to manager email map for subsequent employees
        managerEmailMap.set(emp.email.toLowerCase(), employeeData.id);

        // Add organization membership
        const { error: orgMemberError } = await supabase.from('organization_members').insert({
          user_id: createdUserId,
          organization_id: organizationId,
          role: 'member'
        });

        if (orgMemberError) {
          console.error(`Failed to add org membership for ${emp.email}:`, orgMemberError);
          // Rollback: delete employee, profile, and auth user
          await supabase.from('employees').delete().eq('id', employeeData.id);
          await supabase.from('profiles').delete().eq('id', createdUserId);
          await supabase.auth.admin.deleteUser(createdUserId);
          console.log(`Rolled back all records for ${createdUserId} due to org membership failure`);
          results.push({
            email: emp.email,
            name: fullName,
            success: false,
            error: 'Failed to add organization membership: ' + orgMemberError.message
          });
          continue;
        }

        // Add user role if specified
        const userRole = emp.role && ['admin', 'hr', 'user'].includes(emp.role.toLowerCase()) 
          ? emp.role.toLowerCase() 
          : 'user';
        
        const { error: roleError } = await supabase.from('user_roles').insert({
          user_id: createdUserId,
          organization_id: organizationId,
          role: userRole
        });

        if (roleError) {
          console.error(`Failed to add user role for ${emp.email}:`, roleError);
          // Rollback: delete org membership, employee, profile, and auth user
          await supabase.from('organization_members').delete().eq('user_id', createdUserId);
          await supabase.from('employees').delete().eq('id', employeeData.id);
          await supabase.from('profiles').delete().eq('id', createdUserId);
          await supabase.auth.admin.deleteUser(createdUserId);
          console.log(`Rolled back all records for ${createdUserId} due to role assignment failure`);
          results.push({
            email: emp.email,
            name: fullName,
            success: false,
            error: 'Failed to assign user role: ' + roleError.message
          });
          continue;
        }

        // Store employee info for invitation sending
        createdEmployees.push({
          email: emp.email.toLowerCase(),
          employeeId: employeeData.id
        });

        // Send welcome email with login link
        const emailSent = await sendWelcomeEmail(
          emp.email.toLowerCase(),
          fullName,
          emp.position,
          emp.department,
          emp.join_date,
          userRole
        );

        console.log(`Successfully imported ${emp.email}, welcome email sent: ${emailSent}`);
        results.push({
          email: emp.email,
          name: fullName,
          success: true,
          emailSent
        });

      } catch (err: any) {
        console.error(`Error importing ${emp.email}:`, err);
        // Attempt rollback if we created a user
        if (createdUserId) {
          try {
            await supabase.from('user_roles').delete().eq('user_id', createdUserId);
            await supabase.from('organization_members').delete().eq('user_id', createdUserId);
            await supabase.from('employees').delete().eq('user_id', createdUserId);
            await supabase.from('profiles').delete().eq('id', createdUserId);
            await supabase.auth.admin.deleteUser(createdUserId);
            console.log(`Rolled back all records for ${createdUserId} due to unexpected error`);
          } catch (rollbackErr) {
            console.error(`Rollback failed for ${createdUserId}:`, rollbackErr);
          }
        }
        results.push({
          email: emp.email,
          name: fullName,
          success: false,
          error: err.message || 'Unknown error'
        });
      }
    }


    // Second pass: update manager_id for employees whose managers were created in same batch
    for (const emp of employees) {
      if (emp.manager_email) {
        const managerId = managerEmailMap.get(emp.manager_email.toLowerCase());
        const employeeRecord = createdEmployees.find(e => e.email === emp.email.toLowerCase());
        
        if (managerId && employeeRecord) {
          await supabase
            .from('employees')
            .update({ manager_id: managerId })
            .eq('id', employeeRecord.employeeId);
          
          console.log(`Updated manager for ${emp.email} to ${emp.manager_email}`);
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    const emailsSent = results.filter(r => r.emailSent).length;
    console.log(`Bulk import completed: ${successCount}/${results.length} successful, ${emailsSent} welcome emails sent`);

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
