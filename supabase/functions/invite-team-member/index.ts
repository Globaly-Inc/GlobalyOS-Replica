import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateInviteEmailHtml } from "../_shared/email-templates.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const MAX_INVITES_PER_IP_PER_HOUR = 20;
const APP_URL = 'https://www.globalyos.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteRequest {
  email: string;
  personalEmail?: string;
  phone: string;
  fullName: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  street: string;
  city: string;
  postcode?: string;
  state: string;
  country: string;
  position: string;
  department: string;
  joinDate?: string;
  idNumber?: string;
  taxNumber?: string;
  remuneration?: string;
  remunerationCurrency?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  avatarUrl?: string;
  role: 'admin' | 'hr' | 'member';
  managerId?: string;
  officeId?: string;
  organizationId: string;
  isNewHire?: boolean;
  employmentType?: string;
  gender?: string;
  skipEmail?: boolean;
}

function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         req.headers.get('x-real-ip') ||
         req.headers.get('cf-connecting-ip') ||
         'unknown';
}


serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = getClientIP(req);
  console.log('Invite request from IP:', clientIP);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: verifyError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (verifyError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has Owner, Admin, or HR role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin', 'hr']);

    if (!roleData || roleData.length === 0) {
      console.log(`User ${user.id} does not have owner, admin, or hr role`);
      return new Response(
        JSON.stringify({ 
          error: 'You need Owner, Admin, or HR permissions to add team members. Please contact your administrator.',
          code: 'ROLE_REQUIRED',
          requiredRoles: ['owner', 'admin', 'hr'],
          statusCode: 403
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Authorized user ${user.id} with role: ${roleData[0].role}`);

    // IP-based rate limiting using login_attempts table
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: ipRequestCount } = await supabase
      .from('login_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', clientIP)
      .eq('attempt_type', 'invite')
      .gte('created_at', oneHourAgo);

    if (ipRequestCount !== null && ipRequestCount >= MAX_INVITES_PER_IP_PER_HOUR) {
      console.log(`Rate limit exceeded for IP ${clientIP}: ${ipRequestCount} requests`);
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data: InviteRequest = await req.json();
    const { 
      email, personalEmail, phone, fullName, firstName, lastName, dateOfBirth,
      street, city, postcode, state, country,
      position, department, joinDate, idNumber, taxNumber,
      remuneration, remunerationCurrency, 
      emergencyContactName, emergencyContactPhone, emergencyContactRelationship,
      avatarUrl, role, managerId, officeId, organizationId,
      isNewHire = false, employmentType = 'employee', gender
    } = data;

    // Validate required fields (phone, address fields are optional for quick invites)
    if (!email || !firstName || !lastName || !position || !department || !role || !organizationId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate manager assignment won't create circular reference
    if (managerId) {
      let checkId = managerId;
      let depth = 0;
      const maxDepth = 50;
      const visitedIds: string[] = [];
      
      while (checkId && depth < maxDepth) {
        // If we've seen this ID before, there's a cycle in the existing data
        if (visitedIds.includes(checkId)) {
          console.error('Detected existing cycle in manager hierarchy at:', checkId);
          break;
        }
        visitedIds.push(checkId);
        
        const { data: manager } = await supabase
          .from('employees')
          .select('id, manager_id')
          .eq('id', checkId)
          .single();
        
        if (!manager) break;
        
        // Note: For new employees, the database trigger will catch any cycles
        // This check is for validating the manager exists and isn't already in a broken state
        checkId = manager.manager_id || null;
        depth++;
      }
      
      console.log(`Manager validation passed for managerId: ${managerId}`);
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log('Inviting team member:', normalizedEmail, 'with role:', role);

    // Log the invite attempt
    await supabase.from('login_attempts').insert({
      email: normalizedEmail,
      ip_address: clientIP,
      attempt_type: 'invite',
      success: true,
    });

    // Check if user already exists in profiles table
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

    if (existingProfile) {
      console.log('User already exists in profiles:', normalizedEmail);
      return new Response(
        JSON.stringify({ 
          error: 'A user with this email already exists',
          code: 'USER_EXISTS',
          skipped: true
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Also check auth.users table for existing users
    const { data: existingAuthUsers } = await supabase.auth.admin.listUsers();
    const existingAuthUser = existingAuthUsers?.users?.find(
      u => u.email?.toLowerCase() === normalizedEmail
    );

    if (existingAuthUser) {
      console.log('User already exists in auth:', normalizedEmail);
      return new Response(
        JSON.stringify({ 
          error: 'A user with this email already exists',
          code: 'USER_EXISTS',
          skipped: true
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create auth user with a temporary password (they'll use OTP to login)
    const tempPassword = crypto.randomUUID() + crypto.randomUUID();
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (authError || !authData.user) {
      console.error('Error creating auth user:', authError);
      return new Response(
        JSON.stringify({ error: authError?.message || 'Failed to create user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authData.user.id;
    console.log('Created auth user:', userId);

    // Look up department_id from departments table
    let departmentId: string | null = null;
    const { data: deptData } = await supabase
      .from('departments')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('name', department.trim())
      .single();
    
    if (deptData) {
      departmentId = deptData.id;
    } else {
      // Create department if it doesn't exist
      const { data: newDept } = await supabase
        .from('departments')
        .insert({ organization_id: organizationId, name: department.trim() })
        .select('id')
        .single();
      if (newDept) {
        departmentId = newDept.id;
      }
    }

    // Look up position_id from positions table
    let positionId: string | null = null;
    const { data: posData } = await supabase
      .from('positions')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('name', position.trim())
      .eq('department', department.trim())
      .single();
    
    if (posData) {
      positionId = posData.id;
    } else {
      // Create position if it doesn't exist
      const { data: newPos } = await supabase
        .from('positions')
        .insert({ 
          organization_id: organizationId, 
          name: position.trim(), 
          department: department.trim(),
          department_id: departmentId 
        })
        .select('id')
        .single();
      if (newPos) {
        positionId = newPos.id;
      }
    }

    // Create employee record with active status
    const effectiveJoinDate = joinDate || new Date().toISOString().split('T')[0];
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        position: position.trim(),
        department: department.trim(),
        department_id: departmentId,
        position_id: positionId,
        status: 'active',
        join_date: effectiveJoinDate,
        date_of_birth: dateOfBirth || null,
        phone: phone?.trim() || null,
        street: street?.trim() || null,
        city: city?.trim() || null,
        postcode: postcode?.trim() || null,
        state: state?.trim() || null,
        country: country?.trim() || null,
        personal_email: personalEmail?.trim() || null,
        id_number: idNumber?.trim() || null,
        tax_number: taxNumber?.trim() || null,
        salary: remuneration ? parseFloat(remuneration) : null,
        remuneration_currency: remunerationCurrency || 'USD',
        emergency_contact_name: emergencyContactName?.trim() || null,
        emergency_contact_phone: emergencyContactPhone?.trim() || null,
        emergency_contact_relationship: emergencyContactRelationship?.trim() || null,
        manager_id: managerId || null,
        office_id: officeId || null,
        is_new_hire: isNewHire,
        employment_type: employmentType,
        gender: gender || null,
      })
      .select('id')
      .single();

    if (employeeError) {
      console.error('Error creating employee:', employeeError);
      console.error('Employee data attempted:', { userId, organizationId, position, department, effectiveJoinDate });
      // Cleanup: delete the auth user if employee creation fails
      await supabase.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: 'Failed to create employee record', details: employeeError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const employeeId = employeeData?.id;
    console.log('Created employee:', employeeId);

    // Create initial position history record (source of truth for positions)
    if (employeeId) {
      const { error: positionHistoryError } = await supabase
        .from('position_history')
        .insert({
          employee_id: employeeId,
          organization_id: organizationId,
          position: position.trim(),
          department: department.trim(),
          salary: remuneration ? parseFloat(remuneration) : null,
          manager_id: managerId || null,
          effective_date: effectiveJoinDate,
          change_type: 'hire',
          employment_type: employmentType,
          is_current: true,
          notes: 'Initial position on hire',
        });

      if (positionHistoryError) {
        console.error('Error creating position history:', positionHistoryError);
        // Continue anyway - position history can be added later
      } else {
        console.log('Created initial position history for employee:', employeeId);
      }
    }

    // Update profile with avatar URL if provided
    if (avatarUrl) {
      await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId);
    }

    // Add organization membership
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        role: 'member',
      });

    if (memberError) {
      console.error('Error adding organization membership:', memberError);
      // Continue anyway - membership can be added later
    }

    // Assign role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: role,
        organization_id: organizationId,
      });

    if (roleError) {
      console.error('Error assigning role:', roleError);
      // Continue anyway - role can be assigned later
    }

    // Generate invitation code (OTP)
    const inviteCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiry for invitation codes
    
    // Store the invitation code in otp_codes table
    const { error: otpError } = await supabase
      .from('otp_codes')
      .insert({
        email: normalizedEmail,
        code: inviteCode,
        expires_at: expiresAt.toISOString(),
      });

    if (otpError) {
      console.error('Error storing invitation code:', otpError);
      // Continue anyway - they can request a new code
    }

    console.log('Generated invitation code for:', normalizedEmail);

    // Fetch inviter details for the email
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    const { data: inviterEmployee } = await supabase
      .from('employees')
      .select('position')
      .eq('user_id', user.id)
      .single();

    // Fetch organization name
    const { data: organization } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single();

    const inviterName = inviterProfile?.full_name || 'Your administrator';
    const inviterEmail = inviterProfile?.email || '';
    const inviterPosition = inviterEmployee?.position || '';
    const businessName = organization?.name || 'your organization';

    // Get the app URL
    const appUrl = APP_URL;
    const joinUrl = `${appUrl}/join?email=${encodeURIComponent(normalizedEmail)}`;

    const emailHtml = generateInviteEmailHtml({
      fullName,
      inviterName,
      inviterEmail,
      businessName,
      position,
      department,
      joinDate: joinDate || null,
      inviteCode,
      joinUrl,
      isReminder: false
    });

    // Send invitation email via Resend API (unless skipEmail is true)
    const skipEmail = data.skipEmail ?? false;

    if (!skipEmail) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'GlobalyOS <hello@globalyos.com>',
            to: [normalizedEmail],
            subject: `You've been invited to join ${businessName} in GlobalyOS`,
            html: emailHtml,
          }),
        });

        if (!emailResponse.ok) {
          const emailError = await emailResponse.text();
          console.error('Error sending invitation email:', emailError);
        } else {
          console.log('Invitation email sent successfully');
        }
      } catch (emailErr) {
        console.error('Error sending invitation email:', emailErr);
        // Don't fail the whole operation if email fails
      }
    } else {
      console.log('Email skipped for:', normalizedEmail, '(skipEmail flag set during onboarding)');
    }

    console.log('Team member added successfully:', normalizedEmail);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: skipEmail ? 'Team member added (email pending)' : 'Team member added successfully',
        userId,
        emailSkipped: skipEmail
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in invite-team-member:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
