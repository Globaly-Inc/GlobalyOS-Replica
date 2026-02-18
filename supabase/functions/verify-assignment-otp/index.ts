/**
 * Verify Assignment OTP Edge Function
 * Verifies the 6-digit code and confirms the candidate's identity
 * before allowing access to the assignment page.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_FAILED_ATTEMPTS = 5;

function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
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
    const { token, email: rawEmail, code: rawCode } = await req.json();

    if (!token || !rawEmail || !rawCode) {
      return new Response(
        JSON.stringify({ error: 'Token, email, and code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const email = rawEmail.trim().toLowerCase();
    const code = rawCode.trim();

    // Re-verify the assignment belongs to this email (server-side double-check)
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignment_instances')
      .select(`
        id,
        candidate_applications (
          candidates (
            email
          )
        )
      `)
      .eq('secure_token', token)
      .single();

    if (assignmentError || !assignment) {
      return new Response(
        JSON.stringify({ error: 'Invalid assignment link.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const candidateEmail = (assignment.candidate_applications as any)?.candidates?.email?.toLowerCase();
    if (email !== candidateEmail) {
      return new Response(
        JSON.stringify({ error: 'This assignment has not been assigned to you.', notAssigned: true }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Look up the most recent unverified OTP for this email
    const { data: otpRecord, error: fetchError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', email)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpRecord) {
      return new Response(
        JSON.stringify({ error: 'No pending verification code found. Please request a new one.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentFailedAttempts = otpRecord.failed_attempts || 0;

    // Check max failed attempts
    if (currentFailedAttempts >= MAX_FAILED_ATTEMPTS) {
      await supabase.from('otp_codes').delete().eq('id', otpRecord.id);
      return new Response(
        JSON.stringify({ error: 'Too many failed attempts. Please request a new code.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiry
    if (new Date(otpRecord.expires_at) < new Date()) {
      await supabase.from('otp_codes').delete().eq('id', otpRecord.id);
      return new Response(
        JSON.stringify({ error: 'Code has expired. Please request a new one.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify code
    if (otpRecord.code !== code) {
      const newFailedAttempts = currentFailedAttempts + 1;
      await supabase
        .from('otp_codes')
        .update({
          failed_attempts: newFailedAttempts,
          ip_address: clientIP !== 'unknown' ? clientIP : otpRecord.ip_address,
        })
        .eq('id', otpRecord.id);

      const remainingAttempts = MAX_FAILED_ATTEMPTS - newFailedAttempts;
      const errorMessage = remainingAttempts > 0
        ? `Invalid code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`
        : 'Invalid code. Please request a new one.';

      return new Response(
        JSON.stringify({ error: errorMessage, failedAttempts: newFailedAttempts }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Success: mark OTP as verified and delete it
    await supabase.from('otp_codes').delete().eq('id', otpRecord.id);

    console.log(`Assignment OTP verified for ${email}, assignment token: ${token}`);

    return new Response(
      JSON.stringify({ success: true, verified: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in verify-assignment-otp:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
