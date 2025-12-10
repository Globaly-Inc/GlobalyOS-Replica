import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const MAX_REQUESTS_PER_HOUR = 3;

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, isSignup, fullName } = await req.json();

    if (!email) {
      console.error('No email provided');
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.toLowerCase();
    console.log('Generating OTP for:', normalizedEmail, 'isSignup:', isSignup);

    // Create Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Rate limiting: Check requests in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { count, error: countError } = await supabase
      .from('otp_codes')
      .select('*', { count: 'exact', head: true })
      .eq('email', normalizedEmail)
      .gte('created_at', oneHourAgo);

    if (countError) {
      console.error('Error checking rate limit:', countError);
    } else if (count !== null && count >= MAX_REQUESTS_PER_HOUR) {
      console.log(`Rate limit exceeded for ${normalizedEmail}: ${count} requests in last hour`);
      return new Response(
        JSON.stringify({ 
          error: 'Too many requests. Please try again in an hour.',
          retryAfter: 3600
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Rate limit check passed: ${count || 0}/${MAX_REQUESTS_PER_HOUR} requests in last hour`);

    // Generate 6-digit OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log('Generated OTP code, expires at:', expiresAt.toISOString());

    // Store OTP in database (don't delete old ones - we need them for rate limiting)
    const { error: insertError } = await supabase
      .from('otp_codes')
      .insert({
        email: normalizedEmail,
        code: otpCode,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Failed to store OTP:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate OTP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('OTP stored in database, sending email...');

    // Send email with OTP
    const { error: emailError } = await resend.emails.send({
      from: 'TeamHub <hello@globalyhub.com>',
      to: [email],
      subject: `Your TeamHub verification code: ${otpCode}`,
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
                      <div style="display: inline-block; width: 64px; height: 64px; border-radius: 16px; background: linear-gradient(135deg, #6366f1, #4f46e5); line-height: 64px; text-align: center;">
                        <span style="color: #ffffff; font-size: 24px; font-weight: bold;">TH</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-bottom: 16px;">
                      <h1 style="margin: 0; color: #1f2937; font-size: 24px; font-weight: bold;">Sign in to TeamHub</h1>
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
                        © ${new Date().getFullYear()} TeamHub - HRMS & Social Intranet
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
      return new Response(
        JSON.stringify({ error: 'Failed to send verification email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('OTP email sent successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'OTP sent to your email' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-otp function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
