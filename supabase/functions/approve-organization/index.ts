import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import React from 'https://esm.sh/react@18.3.1'
import { Resend } from 'https://esm.sh/resend@4.0.0'
import { render } from 'https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1'
import { WelcomeEmail } from './_templates/welcome-email.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') || 'https://www.globalyos.com'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify the request is from a super admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is super admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle();

    if (!roleData) {
      throw new Error("Only super admins can approve organizations");
    }

    const { organizationId } = await req.json();
    if (!organizationId) {
      throw new Error("Organization ID is required");
    }

    // Get the organization
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      throw new Error("Organization not found");
    }

    if (org.approval_status !== 'pending') {
      throw new Error("Organization is not pending approval");
    }

    if (!org.owner_email) {
      throw new Error("Organization owner email is required");
    }

    // Calculate trial end date (7 days from now)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);
    const trialDays = 7;

    // Create the auth user for the owner
    const { data: authUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: org.owner_email,
      email_confirm: true,
      user_metadata: {
        full_name: org.owner_name || org.owner_email.split('@')[0],
      },
    });

    if (createUserError) {
      // Check if user already exists
      if (createUserError.message.includes('already been registered')) {
        // Get existing user
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users.find(u => u.email === org.owner_email);
        
        if (!existingUser) {
          throw new Error("Failed to find existing user");
        }

        // Continue with existing user
        await setupOrganization(supabaseAdmin, org, existingUser.id, trialEndsAt, user.id);
      } else {
        throw new Error(`Failed to create user: ${createUserError.message}`);
      }
    } else if (authUser?.user) {
      await setupOrganization(supabaseAdmin, org, authUser.user.id, trialEndsAt, user.id);
    }

    // Send welcome email
    const ownerName = org.owner_name || org.owner_email.split('@')[0];
    await sendWelcomeEmail(org.owner_email, ownerName, org.name, trialDays);

    return new Response(
      JSON.stringify({ success: true, message: "Organization approved successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error approving organization:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sendWelcomeEmail(email: string, ownerName: string, organizationName: string, trialDays: number) {
  try {
    const loginUrl = `${APP_BASE_URL}/auth`;
    
    const html = render(
      React.createElement(WelcomeEmail, {
        ownerName,
        organizationName,
        email,
        trialDays,
        loginUrl,
      })
    );

    const { data, error } = await resend.emails.send({
      from: 'GlobalyOS <onboarding@resend.dev>',
      to: [email],
      subject: `Welcome to GlobalyOS! Your organization has been approved 🎉`,
      html,
    });

    if (error) {
      console.error('Error sending welcome email:', error);
    } else {
      console.log('Welcome email sent successfully:', data);
    }
  } catch (err) {
    console.error('Failed to send welcome email:', err);
  }
}

async function setupOrganization(
  supabaseAdmin: any, 
  org: any, 
  userId: string, 
  trialEndsAt: Date,
  approvedBy: string
) {
  // Parse owner name into first/last
  const ownerName = org.owner_name || '';
  const nameParts = ownerName.trim().split(' ');
  const firstName = nameParts[0] || org.owner_email?.split('@')[0] || 'Owner';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Update the organization
  const { error: updateError } = await supabaseAdmin
    .from('organizations')
    .update({
      approval_status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: approvedBy,
      trial_ends_at: trialEndsAt.toISOString(),
    })
    .eq('id', org.id);

  if (updateError) {
    throw new Error(`Failed to update organization: ${updateError.message}`);
  }

  // Create profile for owner
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: userId,
      email: org.owner_email,
      full_name: ownerName || firstName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'id'
    });

  if (profileError) {
    console.error("Error creating profile:", profileError);
  }

  // Add the owner as organization member
  const { error: memberError } = await supabaseAdmin
    .from('organization_members')
    .upsert({
      organization_id: org.id,
      user_id: userId,
      role: 'owner',
    }, {
      onConflict: 'organization_id,user_id'
    });

  if (memberError) {
    console.error("Error adding org member:", memberError);
  }

  // Create employee record for owner
  const { error: employeeError } = await supabaseAdmin
    .from('employees')
    .upsert({
      organization_id: org.id,
      user_id: userId,
      first_name: firstName,
      last_name: lastName,
      position: 'Owner',
      department: 'Management',
      join_date: new Date().toISOString().split('T')[0],
      status: 'active',
    }, {
      onConflict: 'user_id'
    });

  if (employeeError) {
    console.error("Error creating employee:", employeeError);
  }

  // Assign owner role (first user of organization gets owner role)
  const { error: roleError } = await supabaseAdmin
    .from('user_roles')
    .upsert({
      user_id: userId,
      organization_id: org.id,
      role: 'owner',
    }, {
      onConflict: 'user_id,role'
    });

  if (roleError) {
    console.error("Error assigning role:", roleError);
  }

  // Create subscription record
  const { error: subError } = await supabaseAdmin
    .from('subscriptions')
    .insert({
      organization_id: org.id,
      plan: org.plan || 'starter',
      status: 'trialing',
      billing_cycle: org.billing_cycle || 'monthly',
      trial_starts_at: new Date().toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
      current_period_start: new Date().toISOString(),
      current_period_end: trialEndsAt.toISOString(),
    });

  if (subError) {
    console.error("Error creating subscription:", subError);
  }

  // Create onboarding progress for owner
  const { error: onboardingError } = await supabaseAdmin
    .from('onboarding_progress')
    .insert({
      user_id: userId,
      organization_id: org.id,
      role: 'owner',
      current_step: 0,
      completed_steps: [],
      is_completed: false,
      tour_completed: false,
    });

  if (onboardingError) {
    console.error("Error creating onboarding progress:", onboardingError);
  }
}
