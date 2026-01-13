import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_FAILED_ATTEMPTS_PER_OTP = 5;
const MAX_VERIFICATION_ATTEMPTS_PER_IP_PER_HOUR = 20;
const CAPTCHA_REQUIRED_AFTER_FAILURES = 2;

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

async function verifyTurnstileToken(token: string, ip: string): Promise<boolean> {
  const secretKey = Deno.env.get('TURNSTILE_SECRET_KEY');
  if (!secretKey) {
    console.error('TURNSTILE_SECRET_KEY not configured');
    return false;
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
        remoteip: ip,
      }),
    });

    const result = await response.json();
    console.log('Turnstile verification result:', result.success);
    return result.success === true;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return false;
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
    const { email: rawEmail, code: rawCode, turnstileToken } = await req.json();

    // Normalize inputs
    const email = rawEmail?.trim().toLowerCase();
    const code = rawCode?.trim();

    if (!email || !code) {
      console.error('Missing email or code');
      await logLoginAttempt(supabase, email || 'unknown', clientIP, userAgent, 'otp_verify_failed', false, 'missing_credentials');
      return new Response(
        JSON.stringify({ error: 'Email and code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying OTP for:', email, 'code length:', code.length, 'IP:', clientIP);

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // IP-based rate limiting for verification attempts
    if (clientIP !== 'unknown') {
      const { data: ipAttempts, error: ipError } = await supabase
        .from('otp_codes')
        .select('failed_attempts')
        .eq('ip_address', clientIP)
        .gte('created_at', oneHourAgo);

      if (!ipError && ipAttempts) {
        const totalFailedAttempts = ipAttempts.reduce((sum, record) => sum + (record.failed_attempts || 0), 0);
        if (totalFailedAttempts >= MAX_VERIFICATION_ATTEMPTS_PER_IP_PER_HOUR) {
          console.log(`IP verification rate limit exceeded for ${clientIP}: ${totalFailedAttempts} failed attempts`);
          await logLoginAttempt(supabase, email, clientIP, userAgent, 'otp_verify_failed', false, 'ip_rate_limit_exceeded');
          return new Response(
            JSON.stringify({ 
              error: 'Too many failed attempts. Please try again later.',
              retryAfter: 3600
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Find the most recent unverified OTP record for this email (already normalized)
    const { data: otpRecord, error: fetchError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', email)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpRecord) {
      console.error('No pending OTP found:', fetchError);
      await logLoginAttempt(supabase, email, clientIP, userAgent, 'otp_verify_failed', false, 'no_pending_otp');
      return new Response(
        JSON.stringify({ error: 'No pending verification code found. Please request a new one.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if CAPTCHA is required (after 2+ failed attempts)
    const currentFailedAttempts = otpRecord.failed_attempts || 0;
    if (currentFailedAttempts >= CAPTCHA_REQUIRED_AFTER_FAILURES) {
      if (!turnstileToken) {
        console.log('CAPTCHA required but not provided');
        await logLoginAttempt(supabase, email, clientIP, userAgent, 'captcha_required', false, 'captcha_not_provided');
        return new Response(
          JSON.stringify({ 
            error: 'Please complete the security verification.',
            captchaRequired: true,
            failedAttempts: currentFailedAttempts
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify the Turnstile token
      const isValidCaptcha = await verifyTurnstileToken(turnstileToken, clientIP);
      if (!isValidCaptcha) {
        console.log('Invalid CAPTCHA token');
        await logLoginAttempt(supabase, email, clientIP, userAgent, 'captcha_failed', false, 'invalid_captcha_token');
        return new Response(
          JSON.stringify({ 
            error: 'Security verification failed. Please try again.',
            captchaRequired: true,
            failedAttempts: currentFailedAttempts
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check if this OTP has too many failed attempts
    if (currentFailedAttempts >= MAX_FAILED_ATTEMPTS_PER_OTP) {
      console.error('OTP locked due to too many failed attempts');
      await supabase.from('otp_codes').delete().eq('id', otpRecord.id);
      await logLoginAttempt(supabase, email, clientIP, userAgent, 'otp_verify_failed', false, 'otp_locked_max_attempts');
      return new Response(
        JSON.stringify({ error: 'Too many failed attempts. Please request a new code.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if OTP is expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      console.error('OTP expired');
      await supabase.from('otp_codes').delete().eq('id', otpRecord.id);
      await logLoginAttempt(supabase, email, clientIP, userAgent, 'otp_verify_failed', false, 'otp_expired');
      return new Response(
        JSON.stringify({ error: 'Code has expired. Please request a new one.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if code matches
    if (otpRecord.code !== code) {
      console.error('Invalid OTP code');
      const newFailedAttempts = currentFailedAttempts + 1;
      await supabase
        .from('otp_codes')
        .update({ 
          failed_attempts: newFailedAttempts,
          ip_address: clientIP !== 'unknown' ? clientIP : otpRecord.ip_address 
        })
        .eq('id', otpRecord.id);

      const remainingAttempts = MAX_FAILED_ATTEMPTS_PER_OTP - newFailedAttempts;
      const needsCaptcha = newFailedAttempts >= CAPTCHA_REQUIRED_AFTER_FAILURES;
      
      let errorMessage = remainingAttempts > 0 
        ? `Invalid code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`
        : 'Invalid code. Please request a new one.';

      await logLoginAttempt(supabase, email, clientIP, userAgent, 'otp_verify_failed', false, 'invalid_code');

      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          captchaRequired: needsCaptcha,
          failedAttempts: newFailedAttempts
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('OTP verified, checking user existence...');

    // Mark OTP as verified
    await supabase
      .from('otp_codes')
      .update({ verified: true })
      .eq('id', otpRecord.id);

    // Check if user exists by querying profiles table (mirrors auth.users, avoids pagination issues)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    
    const existingUser = profileData ? { id: profileData.id, email: profileData.email } : null;

    let session = null;
    let user = null;

    if (existingUser) {
      console.log('User exists, generating magic link token...');
      
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email.toLowerCase(),
      });

      if (linkError) {
        console.error('Failed to generate magic link:', linkError);
        await logLoginAttempt(supabase, email, clientIP, userAgent, 'otp_verify_failed', false, 'magic_link_generation_failed');
        return new Response(
          JSON.stringify({ error: 'Failed to sign in' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const url = new URL(linkData.properties.action_link);
      const token = url.searchParams.get('token');

      if (token) {
        const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'magiclink',
        });

        if (verifyError) {
          console.error('Failed to verify token:', verifyError);
        } else {
          session = verifyData.session;
          user = verifyData.user;
        }
      }
    } else {
      // User does not exist - reject login attempt
      // Users must be added by an admin through the team management system
      console.log('User does not exist, rejecting login attempt for:', email);
      await logLoginAttempt(supabase, email, clientIP, userAgent, 'otp_verify_failed', false, 'user_not_found');
      
      // Clean up the OTP since we're rejecting
      await supabase.from('otp_codes').delete().eq('id', otpRecord.id);
      
      return new Response(
        JSON.stringify({ 
          error: 'No account found with this email.',
          accountNotFound: true,
          suggestion: 'If you want to create a new organization, please sign up first. If you are a team member, contact your HR administrator.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean up used OTP
    await supabase.from('otp_codes').delete().eq('id', otpRecord.id);

    // Update employee status from 'invited' to 'active' if applicable
    if (user) {
      console.log('Looking for employee with user_id:', user.id);
      
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id, status, user_id')
        .eq('user_id', user.id)
        .single();

      console.log('Employee lookup result:', { employee, error: employeeError?.message });

      if (employee && !employeeError) {
        if (employee.status === 'invited') {
          const { data: updated, error: updateError } = await supabase
            .from('employees')
            .update({ status: 'active' })
            .eq('id', employee.id)
            .select();

          if (updateError) {
            console.error('Failed to update employee status:', updateError);
          } else {
            console.log('Employee status update result:', updated);
          }
        } else {
          console.log('Employee already has status:', employee.status);
        }
      } else if (employeeError) {
        console.log('No employee record found for this user');
      }
    }

    console.log('OTP verification complete');
    await logLoginAttempt(supabase, email, clientIP, userAgent, 'otp_verify_success', true);

    return new Response(
      JSON.stringify({ 
        success: true, 
        session,
        user,
        message: session ? 'Signed in successfully' : 'Verified, please sign in'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in verify-otp function:', error);
    await logLoginAttempt(supabase, 'unknown', clientIP, userAgent, 'otp_verify_failed', false, 'unknown_error');
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
