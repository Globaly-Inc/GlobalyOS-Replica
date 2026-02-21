import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@4.0.0";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

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

  const clientIP = getClientIP(req);
  const userAgent = req.headers.get('user-agent') || 'unknown';

  try {
    const { orgSlug, email } = await req.json();

    if (!orgSlug || !email) {
      return new Response(JSON.stringify({ error: 'Organization slug and email are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Resolve organization from slug
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', orgSlug)
      .single();

    if (orgError || !org) {
      return new Response(JSON.stringify({ error: 'Organization not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check portal is enabled
    const { data: portalSettings } = await supabase
      .from('client_portal_settings')
      .select('*')
      .eq('organization_id', org.id)
      .single();

    if (!portalSettings?.is_enabled) {
      return new Response(JSON.stringify({ error: 'Client portal is not enabled for this organization' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check client exists
    const { data: clientUser } = await supabase
      .from('client_portal_users')
      .select('id, status')
      .eq('organization_id', org.id)
      .eq('email', normalizedEmail)
      .single();

    if (!clientUser) {
      // Don't reveal that the email doesn't exist (security)
      return new Response(JSON.stringify({ success: true, message: 'If an account exists, an OTP has been sent.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (clientUser.status === 'suspended') {
      return new Response(JSON.stringify({ error: 'Your account has been suspended. Please contact support.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting: check recent OTP requests
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const ipHash = clientIP !== 'unknown' ? await hashValue(clientIP) : null;

    const { count: emailCount } = await supabase
      .from('client_portal_otp_codes')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', org.id)
      .eq('email', normalizedEmail)
      .gte('created_at', oneHourAgo);

    if (emailCount !== null && emailCount >= 3) {
      await logAudit(supabase, org.id, null, 'client', clientUser.id, 'otp_rate_limited', 'client_portal_user', clientUser.id, { reason: 'email_rate_limit' }, clientIP, userAgent);
      return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.', retryAfter: 3600 }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (ipHash) {
      const { count: ipCount } = await supabase
        .from('client_portal_otp_codes')
        .select('*', { count: 'exact', head: true })
        .eq('ip_hash', ipHash)
        .gte('created_at', oneHourAgo);

      if (ipCount !== null && ipCount >= 10) {
        await logAudit(supabase, org.id, null, 'client', clientUser.id, 'otp_rate_limited', 'client_portal_user', clientUser.id, { reason: 'ip_rate_limit' }, clientIP, userAgent);
        return new Response(JSON.stringify({ error: 'Too many requests from this location. Please try again later.', retryAfter: 3600 }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Check lockout
    const { data: recentOtp } = await supabase
      .from('client_portal_otp_codes')
      .select('locked_until')
      .eq('organization_id', org.id)
      .eq('email', normalizedEmail)
      .not('locked_until', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentOtp?.locked_until && new Date(recentOtp.locked_until) > new Date()) {
      return new Response(JSON.stringify({ error: 'Account temporarily locked. Please try again later.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate and hash OTP
    const otpCode = generateOTP();
    const codeHash = await bcrypt.hash(otpCode);
    const expiryMinutes = portalSettings.otp_expiry_minutes || 10;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();
    const uaHash = await hashValue(userAgent);

    // Store hashed OTP
    const { error: insertError } = await supabase
      .from('client_portal_otp_codes')
      .insert({
        organization_id: org.id,
        email: normalizedEmail,
        code_hash: codeHash,
        expires_at: expiresAt,
        max_attempts: portalSettings.otp_max_attempts || 5,
        ip_hash: ipHash,
        user_agent_hash: uaHash,
      });

    if (insertError) {
      console.error('Failed to store OTP:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to generate verification code' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send branded email
    const brandingName = portalSettings.branding_company_name || org.name;
    const brandingColor = portalSettings.branding_primary_color || '#3B82F6';
    const logoUrl = portalSettings.branding_logo_url || 'https://rygowmzkvxgnxagqlyxf.supabase.co/storage/v1/object/public/system-assets//GlobalyOS%20Blue%20BG%20Icon.png';

    const { error: emailError } = await resend.emails.send({
      from: `${brandingName} <hello@globalyos.com>`,
      to: [normalizedEmail],
      subject: `Your ${brandingName} portal verification code: ${otpCode}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background-color:#f6f9fc;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f9fc;padding:40px 20px;">
            <tr><td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;padding:40px;">
                <tr><td align="center" style="padding-bottom:24px;">
                  <img src="${logoUrl}" alt="${brandingName}" style="width:64px;height:64px;border-radius:16px;" />
                </td></tr>
                <tr><td align="center" style="padding-bottom:16px;">
                  <h1 style="margin:0;color:#1f2937;font-size:24px;font-weight:bold;">Sign in to ${brandingName} Portal</h1>
                </td></tr>
                <tr><td align="center" style="padding-bottom:24px;">
                  <p style="margin:0;color:#4b5563;font-size:16px;line-height:24px;">Use the following 6-digit code to sign in:</p>
                </td></tr>
                <tr><td align="center" style="padding-bottom:16px;">
                  <div style="background:linear-gradient(135deg,${brandingColor}15,${brandingColor}25);border:2px solid ${brandingColor}40;border-radius:12px;padding:24px;">
                    <span style="color:#1f2937;font-size:36px;font-weight:bold;letter-spacing:8px;font-family:monospace;">${otpCode}</span>
                  </div>
                </td></tr>
                <tr><td align="center" style="padding-bottom:32px;">
                  <p style="margin:0;color:#9ca3af;font-size:14px;">This code will expire in ${expiryMinutes} minutes.</p>
                </td></tr>
                <tr><td align="center" style="border-top:1px solid #e5e7eb;padding-top:24px;">
                  <p style="margin:0;color:#9ca3af;font-size:12px;">If you didn't request this code, you can safely ignore this email.</p>
                </td></tr>
                <tr><td align="center" style="padding-top:16px;">
                  <p style="margin:0;color:#d1d5db;font-size:12px;">© ${new Date().getFullYear()} ${brandingName}</p>
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

    await logAudit(supabase, org.id, null, 'client', clientUser.id, 'otp_sent', 'client_portal_user', clientUser.id, {}, clientIP, userAgent);

    // If client was in "invited" status, update to "active" on first OTP request
    if (clientUser.status === 'invited') {
      await supabase.from('client_portal_users').update({ status: 'active' }).eq('id', clientUser.id);
    }

    return new Response(JSON.stringify({ success: true, message: 'If an account exists, an OTP has been sent.' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in portal-send-otp:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function logAudit(
  supabase: any, orgId: string, officeId: string | null,
  actorType: string, actorId: string, action: string,
  entityType: string, entityId: string, metadata: any,
  ipAddress: string, userAgent: string
) {
  try {
    await supabase.from('client_portal_audit_logs').insert({
      organization_id: orgId, office_id: officeId,
      actor_type: actorType, actor_id: actorId, action,
      entity_type: entityType, entity_id: entityId,
      metadata, ip_address: ipAddress, user_agent: userAgent,
    });
  } catch (e) { console.error('Audit log failed:', e); }
}
