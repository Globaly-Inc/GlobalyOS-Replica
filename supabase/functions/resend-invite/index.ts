import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

// Rate limiting constants
const MAX_RESENDS_PER_IP_PER_HOUR = 10;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResendRequest {
  employeeId: string;
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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = getClientIP(req);
  console.log('Resend invite request from IP:', clientIP);

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

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
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
        JSON.stringify({ error: 'Owner, Admin, or HR access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Authorized user ${user.id} with role: ${roleData[0].role}`);

    const { employeeId }: ResendRequest = await req.json();

    if (!employeeId) {
      return new Response(
        JSON.stringify({ error: 'Employee ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Resending invite for employee:', employeeId);

    // IP-based rate limiting using login_attempts table
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: ipRequestCount } = await supabase
      .from('login_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', clientIP)
      .eq('attempt_type', 'resend_invite')
      .gte('created_at', oneHourAgo);

    if (ipRequestCount !== null && ipRequestCount >= MAX_RESENDS_PER_IP_PER_HOUR) {
      console.log(`Rate limit exceeded for IP ${clientIP}: ${ipRequestCount} requests`);
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get employee details with profile
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select(`
        *,
        profiles!inner(full_name, email)
      `)
      .eq('id', employeeId)
      .single();

    if (employeeError || !employee) {
      console.error('Error fetching employee:', employeeError);
      return new Response(
        JSON.stringify({ error: 'Employee not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if employee is eligible for resend (invited status OR new hire who hasn't completed onboarding)
    const isEligible = employee.status === 'invited' || 
      (employee.is_new_hire === true && employee.employee_onboarding_completed !== true);
    
    if (!isEligible) {
      return new Response(
        JSON.stringify({ error: 'Can only resend invites to employees with invited status or new hires who haven\'t completed onboarding' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const email = employee.profiles.email;
    const fullName = employee.profiles.full_name;
    const position = employee.position;
    const department = employee.department;
    const joinDate = employee.join_date;
    const organizationId = employee.organization_id;

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

    // Stable logo URL from Supabase Storage
    const logoUrl = 'https://rygowmzkvxgnxagqlyxf.supabase.co/storage/v1/object/public/system-assets//GlobalyOS%20Blue%20BG%20Icon.png';

    // Log the resend attempt
    await supabase.from('login_attempts').insert({
      email: email,
      ip_address: clientIP,
      attempt_type: 'resend_invite',
      success: true,
    });

    // Generate new invitation code (OTP)
    const inviteCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiry
    
    // Delete any existing OTP codes for this email
    await supabase
      .from('otp_codes')
      .delete()
      .eq('email', email);

    // Store the new invitation code
    const { error: otpError } = await supabase
      .from('otp_codes')
      .insert({
        email: email,
        code: inviteCode,
        expires_at: expiresAt.toISOString(),
      });

    if (otpError) {
      console.error('Error storing invitation code:', otpError);
    }

    console.log('Generated new invitation code for:', email);

    // Get the app URL
    const appUrl = 'https://www.globalyos.com';
    const joinUrl = `${appUrl}/join?email=${encodeURIComponent(email)}`;

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
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px; text-align: center; }
          .header img { width: 64px; height: 64px; border-radius: 16px; margin-bottom: 16px; }
          .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 600; }
          .header p { color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 16px; }
          .content { padding: 32px; }
          .greeting { font-size: 18px; margin-bottom: 20px; }
          .reminder-badge { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; text-align: center; border: 1px solid #fbbf24; }
          .reminder-badge p { margin: 0; color: #92400e; font-size: 15px; font-weight: 600; }
          .invite-message { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #6366f1; }
          .invite-message p { margin: 0; color: #1e40af; font-size: 16px; }
          .section-title { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
          .inviter-card { background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #e2e8f0; }
          .details-card { background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #e2e8f0; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { color: #64748b; font-size: 14px; }
          .detail-value { color: #1e293b; font-size: 14px; font-weight: 500; }
          .code-section { text-align: center; margin: 32px 0; }
          .code-label { font-size: 14px; color: #64748b; margin-bottom: 12px; }
          .code-box { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; font-size: 36px; font-weight: 700; letter-spacing: 12px; text-align: center; padding: 24px 32px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.4); }
          .cta { text-align: center; margin: 32px 0; }
          .button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.4); }
          .note { background: #fef3c7; border-radius: 12px; padding: 16px; margin-top: 24px; border: 1px solid #fde68a; }
          .note p { margin: 0; color: #92400e; font-size: 14px; }
          .note strong { color: #78350f; }
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
              <h1>🔔 Reminder</h1>
              <p>Complete your registration</p>
            </div>
            <div class="content">
              <p class="greeting">Hi <strong>${fullName}</strong>,</p>
              
              <div class="reminder-badge">
                <p>This is a friendly reminder to complete your GlobalyOS registration</p>
              </div>

              <div class="invite-message">
                <p><strong>${inviterName}</strong> is waiting for you to join <strong>${businessName}</strong> on GlobalyOS.</p>
              </div>

              <p class="section-title">Sent By</p>
              <div class="inviter-card">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td width="64" valign="top">
                      <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 50%; text-align: center; line-height: 48px; color: white; font-weight: 600; font-size: 18px;">${inviterName.charAt(0).toUpperCase()}</div>
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
                <p class="code-label">Your New Login Code</p>
                <div class="code-box">${inviteCode}</div>
              </div>

              <div class="cta">
                <a href="${joinUrl}" class="button">Join ${businessName}</a>
              </div>

              <div class="note">
                <p><strong>Note:</strong> This new code is valid for 7 days. Your previous code has been deactivated.</p>
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

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'GlobalyOS <hello@globalyos.com>',
        to: [email],
        subject: `Reminder: You've been invited to join ${businessName} in GlobalyOS`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const emailError = await emailResponse.text();
      console.error('Error sending invitation email:', emailError);
      return new Response(
        JSON.stringify({ error: 'Failed to send email. Please check your Resend configuration.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Invitation email resent successfully to:', email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitation resent successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in resend-invite:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
