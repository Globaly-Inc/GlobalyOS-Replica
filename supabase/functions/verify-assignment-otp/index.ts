/**
 * Verify Assignment OTP Edge Function
 * Supports two modes:
 *   1. Per-instance: { token, email, code }
 *   2. Per-template: { template_token, email, code } — returns instance_token on success
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
    const { token, template_token, email: rawEmail, code: rawCode } = await req.json();

    if ((!token && !template_token) || !rawEmail || !rawCode) {
      return new Response(
        JSON.stringify({ error: 'Email, code, and either token or template_token are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const email = rawEmail.trim().toLowerCase();
    const code = rawCode.trim();

    let instanceToken: string | null = null;

    if (template_token) {
      // ── Template mode: find instance by template + email ──
      const { data: template } = await supabase
        .from('assignment_templates')
        .select('id')
        .eq('public_token', template_token)
        .single();

      if (!template) {
        return new Response(
          JSON.stringify({ error: 'Invalid assignment link.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: instances } = await supabase
        .from('assignment_instances')
        .select(`
          id, secure_token,
          candidate_applications ( candidates ( email ) )
        `)
        .eq('template_id', template.id);

      const match = (instances || []).find((inst: any) => {
        return inst.candidate_applications?.candidates?.email?.toLowerCase() === email;
      });

      if (!match) {
        return new Response(
          JSON.stringify({ error: 'No assignment found for this email.', notAssigned: true }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      instanceToken = (match as any).secure_token;
    } else {
      // ── Legacy per-instance mode ──
      const { data: assignment } = await supabase
        .from('assignment_instances')
        .select(`
          id, secure_token,
          candidate_applications ( candidates ( email ) )
        `)
        .eq('secure_token', token)
        .single();

      if (!assignment) {
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

      instanceToken = assignment.secure_token;
    }

    // Look up the most recent unverified OTP for this email
    const { data: otpRecord } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', email)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!otpRecord) {
      return new Response(
        JSON.stringify({ error: 'No pending verification code found. Please request a new one.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentFailedAttempts = otpRecord.failed_attempts || 0;

    if (currentFailedAttempts >= MAX_FAILED_ATTEMPTS) {
      await supabase.from('otp_codes').delete().eq('id', otpRecord.id);
      return new Response(
        JSON.stringify({ error: 'Too many failed attempts. Please request a new code.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (new Date(otpRecord.expires_at) < new Date()) {
      await supabase.from('otp_codes').delete().eq('id', otpRecord.id);
      return new Response(
        JSON.stringify({ error: 'Code has expired. Please request a new one.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Success: delete OTP
    await supabase.from('otp_codes').delete().eq('id', otpRecord.id);

    console.log(`Assignment OTP verified for ${email}`);

    return new Response(
      JSON.stringify({ success: true, verified: true, instance_token: instanceToken }),
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
