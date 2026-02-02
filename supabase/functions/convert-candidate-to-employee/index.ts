/**
 * Convert Candidate to Employee Edge Function
 * Handles the complete flow of converting a hired candidate to an employee
 * including user account creation and boarding workflow initiation
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ConvertRequest {
  application_id: string;
  employee_data: {
    position?: string;
    department_id?: string;
    office_id?: string;
    manager_id?: string;
    join_date?: string;
    employment_type?: string;
    salary?: number;
    salary_currency?: string;
  };
  send_welcome_email?: boolean;
  start_onboarding?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const userSupabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the employee making the conversion
    const { data: actingEmployee, error: empError } = await userSupabase
      .from("employees")
      .select("id, organization_id, role")
      .eq("user_id", user.id)
      .single();

    if (empError || !actingEmployee) {
      return new Response(
        JSON.stringify({ success: false, message: "Employee not found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has hiring access
    const hasAccess = ["owner", "admin", "hr"].includes(actingEmployee.role);
    if (!hasAccess) {
      return new Response(
        JSON.stringify({ success: false, message: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: ConvertRequest = await req.json();
    const { application_id, employee_data, send_welcome_email = true, start_onboarding = true } = body;

    if (!application_id) {
      return new Response(
        JSON.stringify({ success: false, message: "Application ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Converting candidate to employee:", application_id);

    // Get application with candidate and job info
    const { data: application, error: appError } = await serviceSupabase
      .from("candidate_applications")
      .select(`
        *,
        candidate:candidates(*),
        job:jobs(title, department_id, office_id)
      `)
      .eq("id", application_id)
      .eq("organization_id", actingEmployee.organization_id)
      .single();

    if (appError || !application) {
      console.error("Application not found:", appError);
      return new Response(
        JSON.stringify({ success: false, message: "Application not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const candidate = application.candidate;
    if (!candidate) {
      return new Response(
        JSON.stringify({ success: false, message: "Candidate not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if candidate is already linked to an employee
    if (candidate.employee_id) {
      return new Response(
        JSON.stringify({ success: false, message: "Candidate has already been converted to an employee" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email already exists as a user
    const { data: existingUser } = await serviceSupabase.auth.admin.listUsers();
    const userExists = existingUser?.users?.find(u => u.email === candidate.email);

    let newUserId: string;
    let userCreated = false;

    if (userExists) {
      newUserId = userExists.id;
      console.log("User already exists:", newUserId);
    } else {
      // Create new user account with a random password (they'll set it via email)
      const tempPassword = crypto.randomUUID();
      
      const { data: newUser, error: createUserError } = await serviceSupabase.auth.admin.createUser({
        email: candidate.email,
        password: tempPassword,
        email_confirm: false,
        user_metadata: {
          full_name: candidate.name,
          source: "hiring_conversion",
        },
      });

      if (createUserError || !newUser.user) {
        console.error("Failed to create user:", createUserError);
        return new Response(
          JSON.stringify({ success: false, message: `Failed to create user account: ${createUserError?.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      newUserId = newUser.user.id;
      userCreated = true;
      console.log("Created new user:", newUserId);
    }

    // Create profile
    const { error: profileError } = await serviceSupabase
      .from("profiles")
      .upsert({
        id: newUserId,
        full_name: candidate.name,
        avatar_url: candidate.avatar_url,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "id",
      });

    if (profileError) {
      console.error("Failed to create profile:", profileError);
    }

    // Create employee record
    const { data: newEmployee, error: employeeError } = await serviceSupabase
      .from("employees")
      .insert({
        user_id: newUserId,
        organization_id: actingEmployee.organization_id,
        role: "member",
        position: employee_data.position || application.job?.title || "Team Member",
        department: employee_data.department_id || application.job?.department_id || null,
        office_id: employee_data.office_id || application.job?.office_id || null,
        manager_id: employee_data.manager_id || null,
        join_date: employee_data.join_date || new Date().toISOString().split("T")[0],
        employment_type: employee_data.employment_type || "full_time",
        employee_onboarding_completed: false,
        employee_onboarding_step: 0,
        status: "active",
      })
      .select()
      .single();

    if (employeeError || !newEmployee) {
      console.error("Failed to create employee:", employeeError);
      return new Response(
        JSON.stringify({ success: false, message: `Failed to create employee: ${employeeError?.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Created employee:", newEmployee.id);

    // Link candidate to employee
    await serviceSupabase
      .from("candidates")
      .update({ employee_id: newEmployee.id })
      .eq("id", candidate.id);

    // Update application status
    await serviceSupabase
      .from("candidate_applications")
      .update({
        status: "hired",
        stage: "hired",
        hired_at: new Date().toISOString(),
      })
      .eq("id", application_id);

    // Log activity
    await serviceSupabase.from("hiring_activity_logs").insert({
      organization_id: actingEmployee.organization_id,
      entity_type: "application",
      entity_id: application_id,
      action: "converted_to_employee",
      performed_by: actingEmployee.id,
      details: {
        employee_id: newEmployee.id,
        position: newEmployee.position,
        user_created: userCreated,
      },
    });

    // Start onboarding workflow if requested
    let workflowId: string | null = null;
    if (start_onboarding) {
      // Get onboarding template
      const { data: template } = await serviceSupabase
        .from("workflow_templates")
        .select("id")
        .eq("organization_id", actingEmployee.organization_id)
        .eq("type", "onboarding")
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (template) {
        // Create workflow
        const { data: workflow, error: workflowError } = await serviceSupabase
          .from("employee_workflows")
          .insert({
            organization_id: actingEmployee.organization_id,
            employee_id: newEmployee.id,
            template_id: template.id,
            type: "onboarding",
            status: "active",
            created_by: actingEmployee.id,
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (!workflowError && workflow) {
          workflowId = workflow.id;
          console.log("Created onboarding workflow:", workflowId);
        }
      }
    }

    // Send welcome email if requested
    if (send_welcome_email && userCreated) {
      try {
        // Generate password reset link
        const { data: resetData, error: resetError } = await serviceSupabase.auth.admin.generateLink({
          type: "recovery",
          email: candidate.email,
        });

        if (!resetError && resetData?.properties?.action_link) {
          // Send via existing email function
          const resendApiKey = Deno.env.get("RESEND_API_KEY");
          if (resendApiKey) {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${resendApiKey}`,
              },
              body: JSON.stringify({
                from: Deno.env.get("FROM_EMAIL") || "noreply@globalyos.com",
                to: [candidate.email],
                subject: "Welcome to the Team! Set Up Your Account",
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #333;">Welcome to the Team, ${candidate.name}! 🎉</h1>
                    <p>Your account has been created and you're now officially part of the team.</p>
                    <p><strong>Position:</strong> ${newEmployee.position}</p>
                    <p><strong>Start Date:</strong> ${new Date(newEmployee.join_date).toLocaleDateString()}</p>
                    <p>Please click the button below to set your password and complete your profile:</p>
                    <div style="margin: 30px 0;">
                      <a href="${resetData.properties.action_link}" 
                         style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                        Set Your Password
                      </a>
                    </div>
                    <p style="color: #666;">This link expires in 24 hours. If you have any questions, please contact HR.</p>
                  </div>
                `,
              }),
            });
            console.log("Welcome email sent to:", candidate.email);
          }
        }
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        // Don't fail the whole operation for email errors
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          employee_id: newEmployee.id,
          user_id: newUserId,
          user_created: userCreated,
          workflow_id: workflowId,
        },
        message: `Successfully converted ${candidate.name} to an employee`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error converting candidate:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
