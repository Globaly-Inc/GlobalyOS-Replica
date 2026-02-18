/**
 * Send Assignment OTP Edge Function
 * Validates that the email belongs to the assigned candidate,
 * then sends a 6-digit OTP to grant access to the assignment page.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_REQUESTS_PER_EMAIL_PER_HOUR = 3;
const GLOBALYOS_LOGO_URL = 'https://rygowmzkvxgnxagqlyxf.supabase.co/storage/v1/object/public/system-assets//GlobalyOS%20Blue%20BG%20Icon.png';

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  const masked = local.length <= 2 ? local[0] + '*' : local[0] + '***' + local[local.length - 1];
  return `${masked}@${domain}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = getClientIP(req);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const { token, email: rawEmail } = await req.json();

    if (!token || !rawEmail) {
      return new Response(
        JSON.stringify({ error: 'Token and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const email = rawEmail.trim().toLowerCase();

    // Look up the assignment and the candidate's email
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignment_instances')
      .select(`
        id,
        title,
        organization_id,
        candidate_application_id,
        candidate_applications (
          candidate_id,
          candidates (
            email,
            name
          )
        )
      `)
      .eq('secure_token', token)
      .single();

    if (assignmentError || !assignment) {
      console.error('Assignment not found:', assignmentError);
      return new Response(
        JSON.stringify({ error: 'Invalid assignment link.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const candidateEmail = (assignment.candidate_applications as any)?.candidates?.email?.toLowerCase();
    const candidateName = (assignment.candidate_applications as any)?.candidates?.name;

    if (!candidateEmail) {
      return new Response(
        JSON.stringify({ error: 'Could not find candidate information for this assignment.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the provided email matches the candidate's email
    if (email !== candidateEmail) {
      console.log(`Email mismatch for assignment ${assignment.id}: provided=${email}, expected=${candidateEmail}`);
      return new Response(
        JSON.stringify({ 
          error: 'This assignment has not been assigned to you. Please check your email and try again.',
          notAssigned: true 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting: max 3 OTP requests per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: emailCount } = await supabase
      .from('otp_codes')
      .select('*', { count: 'exact', head: true })
      .eq('email', email)
      .gte('created_at', oneHourAgo);

    if (emailCount !== null && emailCount >= MAX_REQUESTS_PER_EMAIL_PER_HOUR) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again in an hour.', retryAfter: 3600 }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete previous unverified OTPs for this email
    await supabase.from('otp_codes').delete().eq('email', email).eq('verified', false);

    // Generate and store new OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const { error: insertError } = await supabase.from('otp_codes').insert({
      email,
      code: otpCode,
      expires_at: expiresAt.toISOString(),
      ip_address: clientIP !== 'unknown' ? clientIP : null,
      failed_attempts: 0,
    });

    if (insertError) {
      console.error('Failed to store OTP:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate verification code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send OTP email
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);

    const { error: emailError } = await resend.emails.send({
      from: 'GlobalyOS Hiring <hello@globalyos.com>',
      to: [email],
      subject: `Your assignment verification code: ${otpCode}`,
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
                      <img src="${GLOBALYOS_LOGO_URL}" alt="GlobalyOS" style="width: 64px; height: 64px; border-radius: 16px;" />
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-bottom: 8px;">
                      <h1 style="margin: 0; color: #1f2937; font-size: 22px; font-weight: bold;">Assignment Access Code</h1>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-bottom: 24px;">
                      <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 22px;">
                        Hi ${candidateName ? candidateName.split(' ')[0] : 'there'}! Use the code below to access your assignment: <strong>${assignment.title}</strong>
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
      return new Response(
        JSON.stringify({ error: 'Failed to send verification email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Assignment OTP sent to ${maskEmail(email)} for assignment ${assignment.id}`);

    return new Response(
      JSON.stringify({ success: true, maskedEmail: maskEmail(email) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-assignment-otp:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
