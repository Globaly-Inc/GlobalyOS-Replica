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
  skipEmail?: boolean; // Skip sending invitation email (used during onboarding)
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
      isNewHire = true, employmentType = 'employee', gender
    } = data;

    // Validate required fields (phone, address fields are optional for quick invites)
    if (!email || !firstName || !lastName || !position || !department || !role || !organizationId) {
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

    // Send invitation email via Resend API
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f1f5f9; }
          .wrapper { background-color: #f1f5f9; padding: 40px 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); }
          .header { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 32px; text-align: center; }
          .header img { width: 64px; height: 64px; border-radius: 16px; margin-bottom: 16px; }
          .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 600; }
          .header p { color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 16px; }
          .content { padding: 32px; }
          .greeting { font-size: 18px; margin-bottom: 20px; }
          .invite-message { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #6366f1; }
          .invite-message p { margin: 0; color: #1e40af; font-size: 16px; }
          .section-title { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
          .inviter-card { background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #e2e8f0; }
          .inviter-info { display: flex; align-items: flex-start; }
          .inviter-avatar { width: 48px; height: 48px; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 18px; margin-right: 16px; flex-shrink: 0; }
          .inviter-details { flex: 1; }
          .inviter-name { font-weight: 600; color: #1e293b; font-size: 16px; margin: 0; }
          .inviter-position { color: #64748b; font-size: 14px; margin: 4px 0 0 0; }
          .inviter-email { color: #6366f1; font-size: 14px; margin: 4px 0 0 0; text-decoration: none; }
          .details-card { background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #e2e8f0; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { color: #64748b; font-size: 14px; }
          .detail-value { color: #1e293b; font-size: 14px; font-weight: 500; }
          .code-section { text-align: center; margin: 32px 0; }
          .code-label { font-size: 14px; color: #64748b; margin-bottom: 12px; }
          .code-box { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; font-size: 36px; font-weight: 700; letter-spacing: 12px; text-align: center; padding: 24px 32px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.4); }
          .cta { text-align: center; margin: 32px 0; }
          .button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.4); transition: transform 0.2s; }
          .note { background: #f0fdf4; border-radius: 12px; padding: 16px; margin-top: 24px; border: 1px solid #bbf7d0; }
          .note p { margin: 0; color: #166534; font-size: 14px; }
          .note strong { color: #15803d; }
          .footer { background: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0; }
          .footer p { margin: 0; color: #64748b; font-size: 14px; }
          .footer a { color: #6366f1; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <img src="${logoUrl}" alt="GlobalyOS" />
              <h1>You're Invited!</h1>
              <p>Join ${businessName} on GlobalyOS</p>
            </div>
            <div class="content">
              <p class="greeting">Hi <strong>${fullName}</strong>,</p>
              
              <div class="invite-message">
                <p><strong>${inviterName}</strong> has invited you to join <strong>${businessName}</strong> on GlobalyOS.</p>
              </div>

              <p class="section-title">Invited By</p>
              <div class="inviter-card">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td width="64" valign="top">
                      <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border-radius: 50%; text-align: center; line-height: 48px; color: white; font-weight: 600; font-size: 18px;">${inviterName.charAt(0).toUpperCase()}</div>
                    </td>
                    <td valign="top">
                      <p style="font-weight: 600; color: #1e293b; font-size: 16px; margin: 0;">${inviterName}</p>
                      ${inviterPosition ? `<p style="color: #64748b; font-size: 14px; margin: 4px 0 0 0;">${inviterPosition}</p>` : ''}
                      ${inviterEmail ? `<p style="margin: 4px 0 0 0;"><a href="mailto:${inviterEmail}" style="color: #6366f1; font-size: 14px; text-decoration: none;">${inviterEmail}</a></p>` : ''}
                    </td>
                  </tr>
                </table>
              </div>

              <p class="section-title">Your Details</p>
              <div class="details-card">
                <div class="detail-row">
                  <span class="detail-label">Position</span>
                  <span class="detail-value">${position}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Department</span>
                  <span class="detail-value">${department}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Start Date</span>
                  <span class="detail-value">${joinDate ? new Date(joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'To be confirmed'}</span>
                </div>
              </div>

              <div class="code-section">
                <p class="code-label">Your Login Code</p>
                <div class="code-box">${inviteCode}</div>
              </div>

              <div class="cta">
                <a href="${joinUrl}" class="button">Join ${businessName}</a>
              </div>

              <div class="note">
                <p><strong>Note:</strong> This code is valid for 7 days. Click the button above and enter your code to get started.</p>
              </div>
            </div>
            <div class="footer">
              <p>Questions? Contact <a href="mailto:${inviterEmail || 'support@globalyos.com'}">${inviterEmail || 'your administrator'}</a></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

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
