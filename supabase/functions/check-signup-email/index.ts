import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckEmailRequest {
  email: string;
}

type EmailUnavailableReason = 'account_exists' | 'pending_application' | 'organization_exists';

interface EmailCheckResponse {
  available: boolean;
  reason?: EmailUnavailableReason;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body: CheckEmailRequest = await req.json();
    const { email } = body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check 1: Does this email exist in profiles (existing user account)?
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', normalizedEmail)
      .limit(1)
      .maybeSingle();

    if (existingProfile) {
      const response: EmailCheckResponse = {
        available: false,
        reason: 'account_exists'
      };
      return new Response(
        JSON.stringify(response),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check 2: Does this email exist as an organization owner?
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id, approval_status')
      .ilike('owner_email', normalizedEmail)
      .in('approval_status', ['pending', 'approved'])
      .limit(1)
      .maybeSingle();

    if (existingOrg) {
      const response: EmailCheckResponse = {
        available: false,
        reason: existingOrg.approval_status === 'pending' ? 'pending_application' : 'organization_exists'
      };
      return new Response(
        JSON.stringify(response),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Email is available
    const response: EmailCheckResponse = { available: true };
    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-signup-email:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
