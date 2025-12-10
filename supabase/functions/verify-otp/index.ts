import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      console.error('Missing email or code');
      return new Response(
        JSON.stringify({ error: 'Email and code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying OTP for:', email);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the OTP record
    const { data: otpRecord, error: fetchError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('code', code)
      .eq('verified', false)
      .single();

    if (fetchError || !otpRecord) {
      console.error('OTP not found or already used:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if OTP is expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      console.error('OTP expired');
      // Delete expired OTP
      await supabase.from('otp_codes').delete().eq('id', otpRecord.id);
      return new Response(
        JSON.stringify({ error: 'Code has expired. Please request a new one.' }),
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
      
      // Generate a magic link for existing user
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

      // Extract token from the link
      const url = new URL(linkData.properties.action_link);
      const token = url.searchParams.get('token');

      if (token) {
        // Verify the token to get a session
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
      
      // Create new user
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

      // Generate session for new user
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
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('status', 'invited')
        .single();

      if (employee && !employeeError) {
        const { error: updateError } = await supabase
          .from('employees')
          .update({ status: 'active' })
          .eq('id', employee.id);

        if (updateError) {
          console.error('Failed to update employee status:', updateError);
        } else {
          console.log('Employee status updated to active for user:', user.id);
        }
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
