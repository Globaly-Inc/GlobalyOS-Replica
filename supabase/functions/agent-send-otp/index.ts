import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@4.0.0";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(100000 + (array[0] % 900000));
}

function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')?.trim()
    || 'unknown';
}

async function hashValue(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
  const clientIP = getClientIP(req);

  try {
    const { orgSlug, email } = await req.json();

    if (!orgSlug || !email) {
      return new Response(JSON.stringify({ error: 'Organization slug and email are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Resolve organization
    const { data: org } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', orgSlug)
      .single();

    if (!org) {
      return new Response(JSON.stringify({ error: 'Organization not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check agent user exists
    const { data: agentUser } = await supabase
      .from('partner_users')
      .select('id, status, partner_id, full_name')
      .eq('organization_id', org.id)
      .eq('email', normalizedEmail)
      .single();

    if (!agentUser) {
      // Don't reveal email doesn't exist
      return new Response(JSON.stringify({ success: true, message: 'If an account exists, an OTP has been sent.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (agentUser.status === 'suspended') {
      return new Response(JSON.stringify({ error: 'Your account has been suspended. Please contact support.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting: max 3 OTPs per hour per email
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: emailCount } = await supabase
      .from('partner_user_otp_codes')
      .select('*', { count: 'exact', head: true })
      .eq('partner_user_id', agentUser.id)
      .gte('created_at', oneHourAgo);

    if (emailCount !== null && emailCount >= 3) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.', retryAfter: 3600 }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate and hash OTP
    const otpCode = generateOTP();
    const codeHash = await bcrypt.hash(otpCode);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase
      .from('partner_user_otp_codes')
      .insert({
        partner_user_id: agentUser.id,
        code_hash: codeHash,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error('Failed to store OTP:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to generate verification code' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send email
    const { error: emailError } = await resend.emails.send({
      from: `${org.name} <hello@globalyos.com>`,
      to: [normalizedEmail],
      subject: `Your ${org.name} agent portal verification code`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f6f9fc;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f9fc;padding:40px 20px;">
            <tr><td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;padding:40px;">
                <tr><td align="center" style="padding-bottom:16px;">
                  <h1 style="margin:0;color:#1f2937;font-size:24px;font-weight:bold;">Agent Portal Sign In</h1>
                </td></tr>
                <tr><td align="center" style="padding-bottom:24px;">
                  <p style="margin:0;color:#4b5563;font-size:16px;">Use the following 6-digit code to sign in:</p>
                </td></tr>
                <tr><td align="center" style="padding-bottom:16px;">
                  <div style="background:linear-gradient(135deg,#3B82F615,#3B82F625);border:2px solid #3B82F640;border-radius:12px;padding:24px;">
                    <span style="color:#1f2937;font-size:36px;font-weight:bold;letter-spacing:8px;font-family:monospace;">${otpCode}</span>
                  </div>
                </td></tr>
                <tr><td align="center"><p style="margin:0;color:#9ca3af;font-size:14px;">This code expires in 10 minutes.</p></td></tr>
                <tr><td align="center" style="border-top:1px solid #e5e7eb;padding-top:24px;margin-top:24px;">
                  <p style="margin:0;color:#9ca3af;font-size:12px;">If you didn't request this code, you can safely ignore this email.</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error('Failed to send email:', emailError);
      return new Response(JSON.stringify({ error: 'Failed to send verification email' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update status if invited
    if (agentUser.status === 'invited') {
      await supabase.from('partner_users').update({ status: 'active' }).eq('id', agentUser.id);
    }

    return new Response(JSON.stringify({ success: true, message: 'If an account exists, an OTP has been sent.' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in agent-send-otp:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
