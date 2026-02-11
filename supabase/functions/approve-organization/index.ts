import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import React from 'https://esm.sh/react@18.3.1'
import { Resend } from 'https://esm.sh/resend@4.0.0'
import { render } from 'https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1'
import { WelcomeEmail } from './_templates/welcome-email.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const APP_BASE_URL = (Deno.env.get('APP_BASE_URL') || 'https://www.globalyos.com').replace(/\/+$/, '')

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
      from: 'GlobalyOS <hello@globalyos.com>',
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

    // Create employee record for owner - owners skip individual onboarding
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
        is_new_hire: false,
        employee_onboarding_completed: true,
        employee_onboarding_step: 9,
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

  // Seed default data for the organization
  await seedDefaultData(supabaseAdmin, org.id);
}

async function seedDefaultData(supabaseAdmin: any, orgId: string) {
  console.log(`Seeding default data for organization: ${orgId}`);

  // Seed employment types with default descriptions
  const employmentTypes = [
    { 
      name: 'trainee', 
      label: 'Trainee', 
      display_order: 1, 
      is_system: true,
      description: 'Entry-level role focused on skill development through structured training programs and mentorship. Trainees work under close supervision while building foundational competencies for their career path.'
    },
    { 
      name: 'intern', 
      label: 'Intern', 
      display_order: 2, 
      is_system: true,
      description: 'Temporary position offering practical work experience, typically for students or recent graduates. Internships provide hands-on exposure to professional environments while developing industry-relevant skills.'
    },
    { 
      name: 'contract', 
      label: 'Contract', 
      display_order: 3, 
      is_system: true,
      description: 'Fixed-term employment with defined project scope or duration. Contract workers bring specialized expertise for specific initiatives and operate with clear deliverables and timelines.'
    },
    { 
      name: 'employee', 
      label: 'Employee', 
      display_order: 4, 
      is_system: true,
      description: 'Full-time or part-time permanent staff member with standard benefits and long-term commitment to the organization. Employees are integral team members contributing to ongoing operations and growth.'
    },
  ];

  const { error: etError } = await supabaseAdmin
    .from('employment_types')
    .insert(employmentTypes.map(et => ({
      ...et,
      organization_id: orgId,
      is_active: true,
    })));

  if (etError) {
    console.error("Error seeding employment types:", etError);
  } else {
    console.log("Employment types seeded successfully");
  }

  // Seed default positions
  const positions = [
    { name: 'CEO', department: 'Management' },
    { name: 'Manager', department: 'Management' },
    { name: 'Team Lead', department: 'Engineering' },
    { name: 'Senior Developer', department: 'Engineering' },
    { name: 'Developer', department: 'Engineering' },
    { name: 'HR Manager', department: 'Human Resources' },
    { name: 'HR Specialist', department: 'Human Resources' },
    { name: 'Marketing Manager', department: 'Marketing' },
    { name: 'Sales Representative', department: 'Sales' },
    { name: 'Operations Manager', department: 'Operations' },
    { name: 'Accountant', department: 'Finance' },
    { name: 'Support Specialist', department: 'Customer Support' },
  ];

  const { error: posError } = await supabaseAdmin
    .from('positions')
    .insert(positions.map(pos => ({
      organization_id: orgId,
      name: pos.name,
      department: pos.department,
    })));

  if (posError) {
    console.error("Error seeding positions:", posError);
  } else {
    console.log("Positions seeded successfully");
  }

  // Seed default hiring email templates
  const emailTemplates = [
    {
      name: 'Application Received',
      template_type: 'application_received',
      subject: 'We received your application for {{job_title}}',
      body: `Dear {{candidate_name}},

Thank you for applying for the {{job_title}} position at {{company_name}}. We appreciate your interest in joining our team.

We have received your application and our hiring team is currently reviewing it. We carefully evaluate every candidate, so please allow us some time to go through all submissions.

Here's what you can expect next:
• Our team will review your application within the next few business days
• If your profile matches our requirements, we'll reach out to schedule an initial conversation
• You'll receive an update on your application status either way

In the meantime, feel free to learn more about us and our culture on our website.

Thank you again for your interest in {{company_name}}. We look forward to learning more about you.

Best regards,
The {{company_name}} Hiring Team`,
      is_active: true,
    },
    {
      name: 'Application Rejected',
      template_type: 'application_rejected',
      subject: 'Update on your application for {{job_title}}',
      body: `Dear {{candidate_name}},

Thank you for your interest in the {{job_title}} position at {{company_name}} and for taking the time to apply.

After careful consideration, we have decided to move forward with other candidates whose experience more closely aligns with our current needs. This was not an easy decision, as we received many strong applications.

Please know that this does not reflect on your abilities or potential. We encourage you to apply for future openings that match your skills and experience.

We truly appreciate the time and effort you invested in your application, and we wish you the very best in your career journey.

Warm regards,
The {{company_name}} Hiring Team`,
      is_active: true,
    },
    {
      name: 'Interview Scheduled',
      template_type: 'interview_scheduled',
      subject: 'Interview scheduled: {{job_title}} at {{company_name}}',
      body: `Dear {{candidate_name}},

Great news! We'd like to invite you to an interview for the {{job_title}} position at {{company_name}}.

Interview Details:
• Date: {{interview_date}}
• Time: {{interview_time}}
• Format: {{interview_type}}

Please confirm your availability by replying to this email. If the proposed time doesn't work for you, let us know and we'll find an alternative.

To help you prepare:
• Review the job description and think about relevant experiences
• Prepare questions you'd like to ask about the role and our team
• Ensure you have a stable internet connection if the interview is virtual

We're excited to learn more about you and discuss how you could contribute to our team.

Best regards,
The {{company_name}} Hiring Team`,
      is_active: true,
    },
    {
      name: 'Interview Reminder',
      template_type: 'interview_reminder',
      subject: 'Reminder: Your interview for {{job_title}} is coming up',
      body: `Hi {{candidate_name}},

This is a friendly reminder that your interview for the {{job_title}} position at {{company_name}} is coming up soon.

Interview Details:
• Date: {{interview_date}}
• Time: {{interview_time}}
• Format: {{interview_type}}

A few tips to help you prepare:
• Test your technology setup ahead of time if it's a virtual interview
• Have a copy of your resume handy
• Prepare a few questions about the role and our team

If you need to reschedule or have any questions, please don't hesitate to reach out.

We look forward to speaking with you!

Best regards,
The {{company_name}} Hiring Team`,
      is_active: true,
    },
    {
      name: 'Assignment Sent',
      template_type: 'assignment_sent',
      subject: 'Assessment task for {{job_title}} at {{company_name}}',
      body: `Dear {{candidate_name}},

As part of the hiring process for the {{job_title}} position, we'd like you to complete a short assessment task.

You'll find all the details and instructions at the link provided. Please review the requirements carefully before getting started.

Key information:
• Deadline: Please submit your work by the date indicated in the assignment
• Estimated effort: The task is designed to be completed within a reasonable timeframe
• If you have any questions about the assignment, feel free to reach out

We value your time and effort, and this assessment helps us understand how you approach real-world challenges.

Good luck!

Best regards,
The {{company_name}} Hiring Team`,
      is_active: true,
    },
    {
      name: 'Assignment Reminder',
      template_type: 'assignment_reminder',
      subject: 'Reminder: Your assessment for {{job_title}} is due soon',
      body: `Hi {{candidate_name}},

Just a friendly reminder that the assessment task for the {{job_title}} position at {{company_name}} is due soon.

If you've already submitted your work, thank you! Please disregard this message.

If you haven't started yet or are still working on it, please make sure to submit before the deadline. If you need additional time or have any questions, don't hesitate to let us know.

We look forward to reviewing your submission!

Best regards,
The {{company_name}} Hiring Team`,
      is_active: true,
    },
    {
      name: 'Offer Sent',
      template_type: 'offer_sent',
      subject: 'Congratulations! Job offer for {{job_title}} at {{company_name}}',
      body: `Dear {{candidate_name}},

We are thrilled to extend an offer for the {{job_title}} position at {{company_name}}!

After a thorough evaluation process, we were impressed by your skills, experience, and the enthusiasm you showed throughout our conversations. We believe you would be a fantastic addition to our team.

Please review the offer details carefully. If you have any questions or would like to discuss any aspect of the offer, we're happy to set up a call.

We'd appreciate your response within the timeframe indicated in the offer letter.

We truly hope you'll join us, and we're excited about the possibility of working together!

Warm regards,
The {{company_name}} Hiring Team`,
      is_active: true,
    },
    {
      name: 'Offer Accepted',
      template_type: 'offer_accepted',
      subject: 'Welcome to {{company_name}}, {{candidate_name}}! 🎉',
      body: `Dear {{candidate_name}},

We are absolutely delighted that you've accepted our offer for the {{job_title}} position at {{company_name}}! Welcome to the team!

Here's what happens next:
• Our HR team will be in touch with onboarding details and paperwork
• You'll receive information about your start date, team introductions, and first-week schedule
• Feel free to reach out if you have any questions before your start date

We're excited to have you on board and can't wait for you to get started. The team is looking forward to welcoming you!

Congratulations once again, and welcome to {{company_name}}!

Best regards,
The {{company_name}} Hiring Team`,
      is_active: true,
    },
  ];

  const { error: templateError } = await supabaseAdmin
    .from('hiring_email_templates')
    .insert(emailTemplates.map(t => ({
      ...t,
      organization_id: orgId,
    })));

  if (templateError) {
    console.error("Error seeding email templates:", templateError);
  } else {
    console.log("Hiring email templates seeded successfully");
  }
}
