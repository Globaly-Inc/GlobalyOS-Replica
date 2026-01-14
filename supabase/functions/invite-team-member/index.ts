import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

// Rate limiting constants
const MAX_INVITES_PER_IP_PER_HOUR = 20;

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
}

// Generate a 6-digit OTP code
function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Get client IP from request headers
function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         req.headers.get('x-real-ip') ||
         req.headers.get('cf-connecting-ip') ||
         'unknown';
}

// Stable logo URL from Supabase Storage
const GLOBALYOS_LOGO_URL = 'https://rygowmzkvxgnxagqlyxf.supabase.co/storage/v1/object/public/system-assets//GlobalyOS%20Blue%20BG%20Icon.png';
const APP_URL = 'https://www.globalyos.com';


serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = getClientIP(req);
  console.log('Invite request from IP:', clientIP);
  const logoUrl = GLOBALYOS_LOGO_URL;

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

    // Verify user has HR or admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'hr']);

    if (!roleData || roleData.length === 0) {
      console.log(`User ${user.id} does not have admin or hr role`);
      return new Response(
        JSON.stringify({ 
          error: 'You need Admin or HR permissions to add team members. Please contact your administrator.',
          code: 'ROLE_REQUIRED',
          requiredRoles: ['admin', 'hr'],
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
      isNewHire = true, employmentType = 'employee', gender
    } = data;

    // Validate required fields (postcode is now optional)
    if (!email || !phone || !firstName || !lastName || !street || !city || !state || !country || !position || !department || !role || !organizationId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    // Check if user already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ error: 'A user with this email already exists' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Create employee record with active status
    const effectiveJoinDate = joinDate || new Date().toISOString().split('T')[0];
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        position: position.trim(),
        department: department.trim(),
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

    // Save position to positions table for future use (ignore if already exists)
    const { error: positionError } = await supabase
      .from('positions')
      .upsert({ name: position.trim(), department: department.trim(), organization_id: organizationId }, { onConflict: 'name' });
    
    if (positionError) {
      console.log('Position save note:', positionError.message);
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

    // Get the app URL
    const appUrl = APP_URL;
    const joinUrl = `${appUrl}/join?email=${encodeURIComponent(normalizedEmail)}`;

    // Send invitation email via Resend API
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
          .code-box { background: #6366f1; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .cta { text-align: center; margin: 30px 0; }
          .button { display: inline-block; background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }
          .footer { text-align: center; color: #64748b; font-size: 14px; }
          .note { background: #d1fae5; border-radius: 8px; padding: 15px; margin: 20px 0; font-size: 14px; color: #065f46; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${logoUrl}" alt="GlobalyOS" style="width: 56px; height: 56px; border-radius: 14px; margin-bottom: 12px;" />
            <h1>Welcome to GlobalyOS!</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${fullName}</strong>,</p>
            <p>You've been added to GlobalyOS! Your account is now active. Here are your details:</p>
            <div class="details">
              <p><strong>Position:</strong> ${position}</p>
              <p><strong>Department:</strong> ${department}</p>
              <p><strong>Start Date:</strong> ${joinDate ? new Date(joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'To be confirmed'}</p>
              <p><strong>Role:</strong> ${roleLabel}</p>
            </div>
            <p style="text-align: center; font-weight: 600;">Your Login Code:</p>
            <div class="code-box">${inviteCode}</div>
            <p>Click the button below and enter this code to log in:</p>
            <div class="cta">
              <a href="${joinUrl}" class="button">Log In to GlobalyOS</a>
            </div>
            <div class="note">
              <strong>Note:</strong> This code is valid for 7 days. After first login, you can request a new code anytime.
            </div>
          </div>
          <div class="footer">
            <p>If you have any questions, please contact your administrator.</p>
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
          to: [normalizedEmail],
          subject: 'Welcome to GlobalyOS - Your Account is Ready!',
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

    console.log('Team member added successfully:', normalizedEmail);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Team member added successfully',
        userId 
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
