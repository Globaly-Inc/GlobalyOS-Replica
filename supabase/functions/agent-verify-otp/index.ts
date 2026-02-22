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

    // Get agent user
    const { data: agentUser } = await supabase
      .from('partner_users')
      .select('id, email, full_name, phone, avatar_url, partner_id, status, organization_id')
      .eq('organization_id', org.id)
      .eq('email', normalizedEmail)
      .single();

    if (!agentUser) {
      return new Response(JSON.stringify({ error: 'Agent account not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get most recent OTP
    const { data: otpRecord } = await supabase
      .from('partner_user_otp_codes')
      .select('*')
      .eq('partner_user_id', agentUser.id)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otpRecord) {
      return new Response(JSON.stringify({ error: 'No verification code found. Please request a new one.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check expiry
    if (new Date(otpRecord.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Verification code expired. Please request a new one.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify OTP
    const isValid = await bcrypt.compare(code, otpRecord.code_hash);

    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid verification code.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark OTP as used
    await supabase.from('partner_user_otp_codes').update({ used: true }).eq('id', otpRecord.id);

    // Get partner info
    const { data: partner } = await supabase
      .from('crm_partners')
      .select('id, name, type')
      .eq('id', agentUser.partner_id)
      .single();

    // Create session
    const sessionToken = generateSessionToken();
    const tokenHash = await hashValue(sessionToken);
    const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error: sessionError } = await supabase
      .from('partner_user_sessions')
      .insert({
        partner_user_id: agentUser.id,
        token_hash: tokenHash,
        expires_at: sessionExpiry,
      });

    if (sessionError) {
      console.error('Failed to create session:', sessionError);
      return new Response(JSON.stringify({ error: 'Failed to create session' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update last login
    await supabase.from('partner_users').update({
      last_login_at: new Date().toISOString(),
      status: 'active',
    }).eq('id', agentUser.id);

    return new Response(JSON.stringify({
      success: true,
      token: sessionToken,
      user: {
        id: agentUser.id,
        email: agentUser.email,
        full_name: agentUser.full_name,
        phone: agentUser.phone,
        avatar_url: agentUser.avatar_url,
        partner_id: agentUser.partner_id,
        partner_name: partner?.name || '',
        partner_type: partner?.type || '',
        organization_id: org.id,
        organization_name: org.name,
        organization_slug: org.slug,
      },
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in agent-verify-otp:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
