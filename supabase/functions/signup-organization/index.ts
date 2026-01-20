import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import React from 'https://esm.sh/react@18.3.1';
import { Resend } from 'https://esm.sh/resend@4.0.0';
import { render } from 'https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1';
import { ConfirmationEmail } from './_templates/confirmation-email.tsx';
import { SuperAdminNotificationEmail } from './_templates/super-admin-notification.tsx';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const rawBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://globalyos.com';
const APP_BASE_URL = rawBaseUrl.replace(/\/$/, ''); // Remove trailing slash if present

interface SignupRequest {
  organizationName: string;
  industry: string;
  companySize: string;
  country: string;
  businessAddress?: string;
  businessAddressComponents?: {
    street_number?: string;
    route?: string;
    locality?: string;
    administrative_area_level_1?: string;
    administrative_area_level_2?: string;
    country?: string;
    country_code?: string;
    postal_code?: string;
    formatted_address?: string;
    lat?: number;
    lng?: number;
  };
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
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
      businessAddress,
      businessAddressComponents,
      ownerName, 
      ownerEmail,
      ownerPhone,
      plan, 
      billingCycle 
    } = body;

    // Validate required fields
    if (!organizationName || !ownerName || !ownerEmail || !ownerPhone || !plan) {
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

    // Generate slug: initials-8-char-uuid (e.g., ae-7f3ccd30)
    // Extract initials from organization name (up to 4 letters)
    const words = organizationName.trim().split(/\s+/);
    const initials = words
      .slice(0, 4) // Max 4 words
      .map(word => word.charAt(0).toLowerCase())
      .filter(char => /[a-z]/.test(char)) // Only letters
      .join('');
    
    // Generate 8-character UUID portion for uniqueness
    const uuidPart = crypto.randomUUID().replace(/-/g, '').substring(0, 8);
    
    // Create slug: initials-uuid (e.g., ae-7f3ccd30)
    const slug = `${initials || 'org'}-${uuidPart}`;

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
        owner_phone: ownerPhone,
        company_size: companySize,
        industry,
        country,
        business_address: businessAddress || null,
        business_address_components: businessAddressComponents || null,
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
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);

      // Send confirmation to applicant
      try {
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
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
      }

      // Send notification to Super Admin(s)
      try {
        // Get all super admin emails from user_roles joined with profiles
        const { data: superAdmins, error: adminError } = await supabase
          .from('user_roles')
          .select('user_id, profiles!inner(email)')
          .eq('role', 'super_admin');

        if (adminError) {
          console.error('Error fetching super admins:', adminError);
        } else if (superAdmins && superAdmins.length > 0) {
          const superAdminEmails = superAdmins
            .map((sa: any) => sa.profiles?.email)
            .filter((email: string | null) => email);

          if (superAdminEmails.length > 0) {
            const reviewUrl = `${APP_BASE_URL}/super-admin/organisations`;

            const adminHtml = render(
              React.createElement(SuperAdminNotificationEmail, {
                organizationName,
                ownerName,
                ownerEmail,
                ownerPhone,
                plan,
                industry: industry || '',
                companySize: companySize || '',
                country: country || '',
                reviewUrl,
              })
            );

            const adminEmailResult = await resend.emails.send({
              from: 'GlobalyOS <hello@globalyos.com>',
              to: superAdminEmails,
              subject: `New Signup: ${organizationName} - Review Required`,
              html: adminHtml,
            });

            console.log('Super admin notification sent to:', superAdminEmails, adminEmailResult);
          } else {
            console.warn('No super admin emails found');
          }
        } else {
          console.warn('No super admins found in database');
        }
      } catch (adminEmailError) {
        console.error('Failed to send super admin notification:', adminEmailError);
      }
    } else {
      console.warn('RESEND_API_KEY not configured, skipping all emails');
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
