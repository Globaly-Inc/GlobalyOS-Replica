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

    // Send invitation email via Resend API - Minimal design
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #1e293b; margin: 0; padding: 0; background-color: #f8fafc;">
        <div style="background-color: #f8fafc; padding: 24px 16px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="padding: 20px 24px; text-align: center; border-bottom: 1px solid #e2e8f0;">
              <img src="${logoUrl}" alt="GlobalyOS" style="width: 48px; height: 48px; border-radius: 10px;" />
              <h1 style="color: #1e293b; margin: 12px 0 4px 0; font-size: 20px; font-weight: 600;">Reminder</h1>
              <p style="color: #64748b; margin: 0; font-size: 14px;">Complete your registration</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 24px;">
              <p style="margin: 0 0 16px 0; font-size: 15px;">Hi <strong>${fullName}</strong>,</p>
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569;">${inviterName} is waiting for you to join <strong>${businessName}</strong>.</p>
              
              <!-- Details -->
              <div style="background: #f8fafc; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size: 13px;">
                  <tr>
                    <td style="color: #64748b; padding: 4px 0;">Position</td>
                    <td style="color: #1e293b; font-weight: 500; text-align: right; padding: 4px 0;">${position}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; padding: 4px 0;">Department</td>
                    <td style="color: #1e293b; font-weight: 500; text-align: right; padding: 4px 0;">${department}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; padding: 4px 0;">Start Date</td>
                    <td style="color: #1e293b; font-weight: 500; text-align: right; padding: 4px 0;">${joinDate ? new Date(joinDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBC'}</td>
                  </tr>
                </table>
              </div>
              
              <!-- Code -->
              <div style="text-align: center; margin: 24px 0;">
                <p style="font-size: 12px; color: #64748b; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">New Login Code</p>
                <div style="background: #f0f4ff; color: #4f46e5; font-size: 28px; font-weight: 700; letter-spacing: 8px; padding: 16px 24px; border-radius: 8px; display: inline-block;">${inviteCode}</div>
              </div>
              
              <!-- CTA -->
              <div style="text-align: center; margin: 20px 0;">
                <a href="${joinUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Join Team</a>
              </div>
              
              <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 16px 0 0 0;">Previous code deactivated • New code valid for 7 days</p>
            </div>
            
            <!-- Footer -->
            <div style="background: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">Questions? Contact <a href="mailto:${inviterEmail || 'support@globalyos.com'}" style="color: #4f46e5; text-decoration: none;">${inviterEmail || 'support'}</a></p>
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

    const emailResponseData = await emailResponse.json();
    console.log('Resend API response:', JSON.stringify(emailResponseData));
    
    if (!emailResponse.ok) {
      console.error('Error sending invitation email:', JSON.stringify(emailResponseData));
      return new Response(
        JSON.stringify({ error: 'Failed to send email. Please check your Resend configuration.', details: emailResponseData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Invitation email resent successfully to:', email, 'Resend ID:', emailResponseData.id);

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
