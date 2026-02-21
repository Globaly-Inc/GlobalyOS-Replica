import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

function generateSessionToken(): string {
  const array = new Uint8Array(48);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
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
    const { orgSlug, email, code } = await req.json();

    if (!orgSlug || !email || !code) {
      return new Response(JSON.stringify({ error: 'Organization slug, email, and code are required' }), {
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

    // Get portal settings
    const { data: portalSettings } = await supabase
      .from('client_portal_settings')
      .select('otp_max_attempts, otp_lockout_minutes')
      .eq('organization_id', org.id)
      .single();

    const maxAttempts = portalSettings?.otp_max_attempts || 5;
    const lockoutMinutes = portalSettings?.otp_lockout_minutes || 15;

    // Get the most recent OTP for this email+org
    const { data: otpRecord, error: otpError } = await supabase
      .from('client_portal_otp_codes')
      .select('*')
      .eq('organization_id', org.id)
      .eq('email', normalizedEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otpRecord) {
      return new Response(JSON.stringify({ error: 'No verification code found. Please request a new one.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check lockout
    if (otpRecord.locked_until && new Date(otpRecord.locked_until) > new Date()) {
      const remainingMs = new Date(otpRecord.locked_until).getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      return new Response(JSON.stringify({ error: `Account temporarily locked. Try again in ${remainingMin} minute(s).` }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check expiry
    if (new Date(otpRecord.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Verification code expired. Please request a new one.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check attempts
    if (otpRecord.attempts >= maxAttempts) {
      // Lock the account
      const lockUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000).toISOString();
      await supabase.from('client_portal_otp_codes')
        .update({ locked_until: lockUntil })
        .eq('id', otpRecord.id);

      await logAudit(supabase, org.id, null, 'client', normalizedEmail, 'otp_lockout', 'otp', otpRecord.id, { attempts: otpRecord.attempts }, clientIP, userAgent);

      return new Response(JSON.stringify({ error: `Too many failed attempts. Account locked for ${lockoutMinutes} minutes.` }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify OTP against bcrypt hash
    const isValid = await bcrypt.compare(code, otpRecord.code_hash);

    if (!isValid) {
      // Increment attempts
      const newAttempts = otpRecord.attempts + 1;
      const updateData: any = { attempts: newAttempts };
      if (newAttempts >= maxAttempts) {
        updateData.locked_until = new Date(Date.now() + lockoutMinutes * 60 * 1000).toISOString();
      }
      await supabase.from('client_portal_otp_codes').update(updateData).eq('id', otpRecord.id);

      await logAudit(supabase, org.id, null, 'client', normalizedEmail, 'otp_verify_failed', 'otp', otpRecord.id, { attempt: newAttempts }, clientIP, userAgent);

      const remaining = maxAttempts - newAttempts;
      return new Response(JSON.stringify({
        error: remaining > 0
          ? `Invalid code. ${remaining} attempt(s) remaining.`
          : `Too many failed attempts. Account locked for ${lockoutMinutes} minutes.`,
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // OTP valid — delete it (single-use)
    await supabase.from('client_portal_otp_codes').delete().eq('id', otpRecord.id);

    // Get or create client user
    const { data: clientUser } = await supabase
      .from('client_portal_users')
      .select('*')
      .eq('organization_id', org.id)
      .eq('email', normalizedEmail)
      .single();

    if (!clientUser) {
      return new Response(JSON.stringify({ error: 'Client account not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create session
    const sessionToken = generateSessionToken();
    const tokenHash = await hashValue(sessionToken);
    const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const { error: sessionError } = await supabase
      .from('client_portal_sessions')
      .insert({
        organization_id: org.id,
        client_user_id: clientUser.id,
        token_hash: tokenHash,
        expires_at: sessionExpiry,
        ip_address: clientIP !== 'unknown' ? clientIP : null,
        user_agent: userAgent !== 'unknown' ? userAgent : null,
      });

    if (sessionError) {
      console.error('Failed to create session:', sessionError);
      return new Response(JSON.stringify({ error: 'Failed to create session' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update last_login_at and status
    await supabase.from('client_portal_users').update({
      last_login_at: new Date().toISOString(),
      status: 'active',
    }).eq('id', clientUser.id);

    await logAudit(supabase, org.id, null, 'client', clientUser.id, 'login_success', 'client_portal_user', clientUser.id, {}, clientIP, userAgent);

    return new Response(JSON.stringify({
      success: true,
      token: sessionToken,
      user: {
        id: clientUser.id,
        email: clientUser.email,
        full_name: clientUser.full_name,
        avatar_url: clientUser.avatar_url,
        organization_id: org.id,
        organization_name: org.name,
        organization_slug: org.slug,
      },
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in portal-verify-otp:', error);
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
