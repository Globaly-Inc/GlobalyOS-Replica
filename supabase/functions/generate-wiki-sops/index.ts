import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SOP_PROMPTS: Record<string, { name: string; description: string; prompt: string }> = {
  onboarding: {
    name: "Employee Onboarding SOP",
    description: "Standard operating procedure for new employee onboarding",
    prompt: "Create a detailed Standard Operating Procedure for Employee Onboarding. Include: purpose, scope, pre-arrival preparations, first day procedures, first week activities, training requirements, documentation checklist, role-specific setup, buddy/mentor assignment, and 30-60-90 day milestones.",
  },
  offboarding: {
    name: "Employee Offboarding SOP",
    description: "Standard operating procedure for employee departures",
    prompt: "Create a detailed Standard Operating Procedure for Employee Offboarding. Include: resignation/termination handling, notice period procedures, knowledge transfer, asset return, access revocation, exit interview, final pay and benefits, reference policy, and alumni program.",
  },
  performance_review: {
    name: "Performance Review SOP",
    description: "Standard operating procedure for performance evaluations",
    prompt: "Create a detailed Standard Operating Procedure for Performance Reviews. Include: review cycle timing, preparation steps, self-assessment process, manager assessment, goal setting (SMART), feedback delivery, rating calibration, documentation requirements, and development planning.",
  },
  expense_approval: {
    name: "Expense Approval SOP",
    description: "Standard operating procedure for expense claims and approvals",
    prompt: "Create a detailed Standard Operating Procedure for Expense Approval. Include: expense submission process, required documentation, approval hierarchy, spending limits by category, reimbursement timelines, exception handling, audit procedures, and system usage instructions.",
  },
  leave_request: {
    name: "Leave Request SOP",
    description: "Standard operating procedure for leave applications",
    prompt: "Create a detailed Standard Operating Procedure for Leave Requests. Include: types of leave, advance notice requirements, submission process, approval workflow, leave balance checks, coverage arrangements, emergency leave handling, and return-to-work procedures.",
  },
  incident_reporting: {
    name: "Incident Reporting SOP",
    description: "Standard operating procedure for workplace incident reports",
    prompt: "Create a detailed Standard Operating Procedure for Incident Reporting. Include: types of reportable incidents, immediate response steps, reporting channels, investigation process, documentation requirements, corrective actions, communication protocols, and follow-up procedures.",
  },
  customer_complaint: {
    name: "Customer Complaint Handling SOP",
    description: "Standard operating procedure for handling customer complaints",
    prompt: "Create a detailed Standard Operating Procedure for Customer Complaint Handling. Include: complaint receipt channels, initial response timeframes, categorization and prioritization, investigation steps, resolution protocols, escalation procedures, customer communication, and feedback loop.",
  },
  quality_assurance: {
    name: "Quality Assurance SOP",
    description: "Standard operating procedure for quality control processes",
    prompt: "Create a detailed Standard Operating Procedure for Quality Assurance. Include: quality standards, inspection checkpoints, testing procedures, defect identification, corrective action process, documentation requirements, continuous improvement, and training requirements.",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    // Verify user is super admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(token);
    
    if (claimsError || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const userId = claims.claims.sub;

    // Check super admin role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Super admin access required" }), { 
        status: 403, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const { sop_type, business_category } = await req.json();

    if (!sop_type || !SOP_PROMPTS[sop_type]) {
      return new Response(JSON.stringify({ error: "Invalid SOP type" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Check for duplicate template
    const existingName = SOP_PROMPTS[sop_type].name + (business_category ? ` (${business_category})` : "");
    const { data: existing } = await adminClient
      .from("template_wiki_documents")
      .select("id")
      .eq("name", existingName)
      .eq("category", "sops")
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ 
        error: "Template already exists", 
        duplicate: true,
        template_id: existing.id 
      }), { 
        status: 409, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const sopConfig = SOP_PROMPTS[sop_type];
    
    // Add business category context if specified
    let contextPrompt = sopConfig.prompt;
    if (business_category) {
      contextPrompt += ` Tailor this SOP specifically for the ${business_category} industry, including industry-specific considerations, terminology, and best practices.`;
    }

    // Generate content using Lovable AI
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a business process expert. Generate professional Standard Operating Procedure documents in HTML format.
Use proper HTML tags: <h1>, <h2>, <h3> for headings, <p> for paragraphs, <ul>/<ol> and <li> for lists, <strong> for emphasis.
Include: Document ID placeholder, Version, Effective Date, Owner, Purpose, Scope, Prerequisites, detailed step-by-step Procedure, Troubleshooting, and Related Documents sections.
Make the content practical and actionable with clear numbered steps.
Do not include any markdown formatting - only use HTML tags.`
          },
          {
            role: "user",
            content: contextPrompt
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Insert the template
    const { data: insertedTemplate, error: insertError } = await adminClient
      .from("template_wiki_documents")
      .insert({
        name: sopConfig.name + (business_category ? ` (${business_category})` : ""),
        category: "sops",
        subcategory: sop_type,
        description: sopConfig.description,
        content: content,
        business_category: business_category || null,
        icon_name: "ListChecks",
        tags: ["sop", sop_type, ...(business_category ? [business_category.toLowerCase().replace(/\s+/g, "-")] : [])],
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save template" }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      template: insertedTemplate 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
