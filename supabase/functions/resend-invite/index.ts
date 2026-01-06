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

    // Verify user has HR or admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'hr']);

    if (!roleData || roleData.length === 0) {
      console.log(`User ${user.id} does not have admin or hr role`);
      return new Response(
        JSON.stringify({ error: 'Admin or HR access required' }),
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

    // Check if employee is in invited status
    if (employee.status !== 'invited') {
      return new Response(
        JSON.stringify({ error: 'Can only resend invites to employees with invited status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const email = employee.profiles.email;
    const fullName = employee.profiles.full_name;
    const position = employee.position;
    const department = employee.department;
    const joinDate = employee.join_date;

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
          .reminder { background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center; }
          .note { background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0; font-size: 14px; color: #92400e; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Reminder: Join GlobalyOS!</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${fullName}</strong>,</p>
            <div class="reminder">
              <p><strong>This is a reminder to complete your GlobalyOS registration.</strong></p>
            </div>
            <p>You were invited to join GlobalyOS as a team member. Here are your details:</p>
            <div class="details">
              <p><strong>Position:</strong> ${position}</p>
              <p><strong>Department:</strong> ${department}</p>
              <p><strong>Start Date:</strong> ${joinDate ? new Date(joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'To be confirmed'}</p>
            </div>
            <p style="text-align: center; font-weight: 600;">Your New Invitation Code:</p>
            <div class="code-box">${inviteCode}</div>
            <p>Click the button below and enter this code to join the team:</p>
            <div class="cta">
              <a href="${joinUrl}" class="button">Join GlobalyOS</a>
            </div>
            <div class="note">
              <strong>Note:</strong> This code is valid for 7 days. Your previous code (if any) has been deactivated.
            </div>
          </div>
          <div class="footer">
            <p>If you have any questions, please contact your administrator.</p>
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
        from: 'GlobalyOS <hello@globalyhub.com>',
        to: [email],
        subject: 'Reminder: Your New GlobalyOS Invitation Code',
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
