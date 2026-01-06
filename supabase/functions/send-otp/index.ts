import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const MAX_REQUESTS_PER_EMAIL_PER_HOUR = 3;
const MAX_REQUESTS_PER_IP_PER_HOUR = 10;

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP.trim();
  }
  return 'unknown';
}

function getUserAgent(req: Request): string {
  return req.headers.get('user-agent') || 'unknown';
}

async function logLoginAttempt(
  supabase: any,
  email: string,
  ipAddress: string,
  userAgent: string,
  attemptType: string,
  success: boolean,
  failureReason?: string
) {
  try {
    await supabase.from('login_attempts').insert({
      email: email.toLowerCase(),
      ip_address: ipAddress !== 'unknown' ? ipAddress : null,
      attempt_type: attemptType,
      success,
      failure_reason: failureReason || null,
      user_agent: userAgent !== 'unknown' ? userAgent : null,
    });
  } catch (error) {
    console.error('Failed to log login attempt:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = getClientIP(req);
  const userAgent = getUserAgent(req);

  // Create Supabase client with service role (bypasses RLS)
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    const { email, isSignup, fullName } = await req.json();

    if (!email) {
      console.error('No email provided');
      await logLoginAttempt(supabase, 'unknown', clientIP, userAgent, 'otp_request', false, 'missing_email');
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.toLowerCase();
    console.log('Generating OTP for:', normalizedEmail, 'isSignup:', isSignup, 'IP:', clientIP);

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Email-based rate limiting
    const { count: emailCount, error: emailCountError } = await supabase
      .from('otp_codes')
      .select('*', { count: 'exact', head: true })
      .eq('email', normalizedEmail)
      .gte('created_at', oneHourAgo);

    if (emailCountError) {
      console.error('Error checking email rate limit:', emailCountError);
    } else if (emailCount !== null && emailCount >= MAX_REQUESTS_PER_EMAIL_PER_HOUR) {
      console.log(`Email rate limit exceeded for ${normalizedEmail}: ${emailCount} requests in last hour`);
      await logLoginAttempt(supabase, normalizedEmail, clientIP, userAgent, 'otp_request', false, 'email_rate_limit_exceeded');
      return new Response(
        JSON.stringify({ 
          error: 'Too many requests. Please try again in an hour.',
          retryAfter: 3600
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // IP-based rate limiting
    if (clientIP !== 'unknown') {
      const { count: ipCount, error: ipCountError } = await supabase
        .from('otp_codes')
        .select('*', { count: 'exact', head: true })
        .eq('ip_address', clientIP)
        .gte('created_at', oneHourAgo);

      if (ipCountError) {
        console.error('Error checking IP rate limit:', ipCountError);
      } else if (ipCount !== null && ipCount >= MAX_REQUESTS_PER_IP_PER_HOUR) {
        console.log(`IP rate limit exceeded for ${clientIP}: ${ipCount} requests in last hour`);
        await logLoginAttempt(supabase, normalizedEmail, clientIP, userAgent, 'otp_request', false, 'ip_rate_limit_exceeded');
        return new Response(
          JSON.stringify({ 
            error: 'Too many requests from this location. Please try again later.',
            retryAfter: 3600
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`Rate limit check passed for email: ${emailCount || 0}/${MAX_REQUESTS_PER_EMAIL_PER_HOUR}, IP: ${clientIP}`);

    // Generate 6-digit OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log('Generated OTP code, expires at:', expiresAt.toISOString());

    // Store OTP in database with IP address
    const { error: insertError } = await supabase
      .from('otp_codes')
      .insert({
        email: normalizedEmail,
        code: otpCode,
        expires_at: expiresAt.toISOString(),
        ip_address: clientIP !== 'unknown' ? clientIP : null,
        failed_attempts: 0,
      });

    if (insertError) {
      console.error('Failed to store OTP:', insertError);
      await logLoginAttempt(supabase, normalizedEmail, clientIP, userAgent, 'otp_request', false, 'database_error');
      return new Response(
        JSON.stringify({ error: 'Failed to generate OTP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('OTP stored in database, sending email...');

    // Send email with OTP
    const { error: emailError } = await resend.emails.send({
      from: 'GlobalyOS <hello@globalyhub.com>',
      to: [email],
      subject: `Your GlobalyOS verification code: ${otpCode}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f6f9fc;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; padding: 40px;">
                  <tr>
                    <td align="center" style="padding-bottom: 24px;">
                      <img src="https://people.globalyhub.com/images/globalyos-icon.png" alt="GlobalyOS" style="width: 64px; height: 64px; border-radius: 16px;" />
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-bottom: 16px;">
                      <h1 style="margin: 0; color: #1f2937; font-size: 24px; font-weight: bold;">Sign in to GlobalyOS</h1>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-bottom: 24px;">
                      <p style="margin: 0; color: #4b5563; font-size: 16px; line-height: 24px;">
                        Use the following 6-digit code to sign in:
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-bottom: 16px;">
                      <div style="background: linear-gradient(135deg, #f3f4f6, #e5e7eb); border-radius: 12px; padding: 24px;">
                        <span style="color: #1f2937; font-size: 36px; font-weight: bold; letter-spacing: 8px; font-family: monospace;">${otpCode}</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-bottom: 32px;">
                      <p style="margin: 0; color: #9ca3af; font-size: 14px;">
                        This code will expire in 10 minutes.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="border-top: 1px solid #e5e7eb; padding-top: 24px;">
                      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                        If you didn't request this code, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top: 16px;">
                      <p style="margin: 0; color: #d1d5db; font-size: 12px;">
                        © ${new Date().getFullYear()} GlobalyOS - HRMS & Social Intranet
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error('Failed to send email:', emailError);
      await logLoginAttempt(supabase, normalizedEmail, clientIP, userAgent, 'otp_request', false, 'email_send_failed');
      return new Response(
        JSON.stringify({ error: 'Failed to send verification email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('OTP email sent successfully');
    await logLoginAttempt(supabase, normalizedEmail, clientIP, userAgent, 'otp_request', true);

    return new Response(
      JSON.stringify({ success: true, message: 'OTP sent to your email' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-otp function:', error);
    await logLoginAttempt(supabase, 'unknown', clientIP, userAgent, 'otp_request', false, 'unknown_error');
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
