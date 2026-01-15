import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import React from 'https://esm.sh/react@18.3.1';
import { Resend } from 'https://esm.sh/resend@4.0.0';
import { render } from 'https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1';
import { ConfirmationEmail } from './_templates/confirmation-email.tsx';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APP_BASE_URL = Deno.env.get('APP_BASE_URL') || 'https://globalyos.com';

interface SignupRequest {
  organizationName: string;
  industry: string;
  companySize: string;
  country: string;
  ownerName: string;
  ownerEmail: string;
  plan: 'starter' | 'growth' | 'enterprise';
  billingCycle: 'monthly' | 'annual';
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

    const body: SignupRequest = await req.json();
    const { 
      organizationName, 
      industry, 
      companySize, 
      country, 
      ownerName, 
      ownerEmail, 
      plan, 
      billingCycle 
    } = body;

    // Validate required fields
    if (!organizationName || !ownerName || !ownerEmail || !plan) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if organization with this owner email already exists
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id, approval_status')
      .eq('owner_email', ownerEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingOrg) {
      if (existingOrg.approval_status === 'pending') {
        return new Response(
          JSON.stringify({ error: 'You already have a pending application. Please wait for approval.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else if (existingOrg.approval_status === 'approved') {
        return new Response(
          JSON.stringify({ error: 'An organization with this email already exists. Please sign in instead.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generate a slug from organization name
    const baseSlug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Check for slug uniqueness and add suffix if needed
    let slug = baseSlug;
    let slugSuffix = 1;
    while (true) {
      const { data: existingSlug } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .single();
      
      if (!existingSlug) break;
      slug = `${baseSlug}-${slugSuffix}`;
      slugSuffix++;
    }

    // Create the organization with pending status
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: organizationName,
        slug,
        plan,
        billing_cycle: billingCycle,
        approval_status: 'pending',
        owner_email: ownerEmail,
        owner_name: ownerName,
        company_size: companySize,
        industry,
      })
      .select()
      .single();

    if (orgError) {
      console.error('Error creating organization:', orgError);
      return new Response(
        JSON.stringify({ error: 'Failed to create organization' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Organization created: ${organization.id} - ${organizationName} (pending approval)`);

    // Send confirmation email to the applicant
    try {
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        const statusUrl = `${APP_BASE_URL}/pending-approval?email=${encodeURIComponent(ownerEmail)}`;

        const html = render(
          React.createElement(ConfirmationEmail, {
            ownerName,
            organizationName,
            email: ownerEmail,
            statusUrl,
            plan,
          })
        );

        const emailResult = await resend.emails.send({
          from: 'GlobalyOS <hello@globalyos.com>',
          to: [ownerEmail],
          subject: `Application Received - ${organizationName}`,
          html,
        });

        console.log('Confirmation email sent successfully:', emailResult);
      } else {
        console.warn('RESEND_API_KEY not configured, skipping confirmation email');
      }
    } catch (emailError) {
      // Don't fail the signup if email fails - just log the error
      console.error('Failed to send confirmation email:', emailError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        organizationId: organization.id,
        message: 'Your application has been submitted and is pending approval.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in signup-organization:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
