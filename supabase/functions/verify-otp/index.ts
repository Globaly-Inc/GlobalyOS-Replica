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

  try {
    const { email, code, turnstileToken } = await req.json();

    if (!email || !code) {
      console.error('Missing email or code');
      return new Response(
        JSON.stringify({ error: 'Email and code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientIP = getClientIP(req);
    console.log('Verifying OTP for:', email, 'IP:', clientIP);

    // Create Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

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

    // Find the most recent unverified OTP record for this email
    const { data: otpRecord, error: fetchError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpRecord) {
      console.error('No pending OTP found:', fetchError);
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
      return new Response(
        JSON.stringify({ error: 'Too many failed attempts. Please request a new code.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if OTP is expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      console.error('OTP expired');
      await supabase.from('otp_codes').delete().eq('id', otpRecord.id);
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

    // Check if user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

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
      console.log('User does not exist, creating new user...');
      
      const { data: newUserData, error: createError } = await supabase.auth.admin.createUser({
        email: email.toLowerCase(),
        email_confirm: true,
        user_metadata: {
          full_name: email.split('@')[0],
        },
      });

      if (createError) {
        console.error('Failed to create user:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      user = newUserData.user;

      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email.toLowerCase(),
      });

      if (!linkError && linkData) {
        const url = new URL(linkData.properties.action_link);
        const token = url.searchParams.get('token');

        if (token) {
          const { data: verifyData } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'magiclink',
          });
          session = verifyData?.session;
        }
      }
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
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
