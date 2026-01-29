import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const POLICY_PROMPTS: Record<string, { name: string; description: string; prompt: string }> = {
  annual_leave: {
    name: "Annual Leave Policy",
    description: "Company policy for annual/vacation leave entitlements and procedures",
    prompt: "Create a comprehensive Annual Leave Policy document for a company. Include: purpose, scope, eligibility, leave entitlements, application process, approval workflow, carry-forward rules, leave during notice period, and special circumstances.",
  },
  sick_leave: {
    name: "Sick Leave Policy",
    description: "Policy for sick leave and medical absences",
    prompt: "Create a comprehensive Sick Leave Policy document. Include: purpose, eligibility, sick leave entitlements, notification requirements, medical certificates, extended illness, return to work procedures, and abuse prevention.",
  },
  parental_leave: {
    name: "Parental Leave Policy",
    description: "Policy for maternity, paternity, and parental leave",
    prompt: "Create a comprehensive Parental Leave Policy. Include: maternity leave, paternity leave, adoption leave, eligibility, duration, pay during leave, return to work, flexible arrangements, and related benefits.",
  },
  code_of_conduct: {
    name: "Code of Conduct",
    description: "Employee behavioral standards and expectations",
    prompt: "Create a comprehensive Employee Code of Conduct. Include: core values, professional behavior, workplace relationships, confidentiality, conflicts of interest, use of company resources, social media guidelines, and consequences of violations.",
  },
  remote_work: {
    name: "Remote Work Policy",
    description: "Guidelines for working from home and remote arrangements",
    prompt: "Create a comprehensive Remote Work Policy. Include: eligibility, types of remote work arrangements, equipment and expenses, communication expectations, availability requirements, data security, performance expectations, and health & safety.",
  },
  data_privacy: {
    name: "Data Privacy Policy",
    description: "Policy for handling personal and sensitive data",
    prompt: "Create a comprehensive Data Privacy Policy for employees. Include: data collection principles, types of data collected, data processing purposes, data security measures, employee responsibilities, third-party sharing, retention periods, and individual rights.",
  },
  anti_harassment: {
    name: "Anti-Harassment Policy",
    description: "Policy against workplace harassment and discrimination",
    prompt: "Create a comprehensive Anti-Harassment Policy. Include: policy statement, definitions of harassment types, prohibited conduct, reporting procedures, investigation process, confidentiality, non-retaliation, consequences, and support resources.",
  },
  expense: {
    name: "Expense Reimbursement Policy",
    description: "Guidelines for business expense claims and reimbursements",
    prompt: "Create a comprehensive Expense Reimbursement Policy. Include: eligible expenses, spending limits, approval workflow, receipt requirements, submission deadlines, reimbursement process, non-reimbursable expenses, and travel-specific guidelines.",
  },
  attendance: {
    name: "Attendance Policy",
    description: "Work hours, attendance, and punctuality expectations",
    prompt: "Create a comprehensive Attendance Policy. Include: working hours, punctuality expectations, attendance tracking, absences, tardiness, flexible schedules, overtime, and consequences for violations.",
  },
  dress_code: {
    name: "Dress Code Policy",
    description: "Workplace attire and grooming standards",
    prompt: "Create a comprehensive Dress Code Policy. Include: general standards, professional attire, business casual, casual days, safety requirements, grooming standards, religious and cultural accommodations, and enforcement.",
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

    const { policy_type, country_code } = await req.json();

    if (!policy_type || !POLICY_PROMPTS[policy_type]) {
      return new Response(JSON.stringify({ error: "Invalid policy type" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Check for duplicate template
    const existingName = POLICY_PROMPTS[policy_type].name + (country_code ? ` (${country_code})` : "");
    const { data: existing } = await adminClient
      .from("template_wiki_documents")
      .select("id")
      .eq("name", existingName)
      .eq("category", "policies")
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

    const policyConfig = POLICY_PROMPTS[policy_type];
    
    // Add country context if specified
    let contextPrompt = policyConfig.prompt;
    if (country_code) {
      contextPrompt += ` Make this policy specific to ${country_code} laws and regulations where applicable.`;
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
            content: `You are an HR policy expert. Generate professional company policy documents in HTML format. 
Use proper HTML tags: <h1>, <h2>, <h3> for headings, <p> for paragraphs, <ul>/<ol> and <li> for lists, <strong> for emphasis.
Make the content comprehensive but practical. Include all standard sections expected in a professional policy document.
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
        name: policyConfig.name + (country_code ? ` (${country_code})` : ""),
        category: "policies",
        subcategory: policy_type,
        description: policyConfig.description,
        content: content,
        country_code: country_code || null,
        icon_name: "FileText",
        tags: ["policy", policy_type, ...(country_code ? [country_code.toLowerCase()] : [])],
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
