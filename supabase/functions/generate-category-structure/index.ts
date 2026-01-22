import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category, categoryLabel } = await req.json();

    if (!category) {
      return new Response(
        JSON.stringify({ error: "Missing required field: category" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const prompt = `You are an HR expert creating an organizational structure template for a ${categoryLabel || category} company.

Generate a comprehensive organizational structure including:
1. 6-8 key departments (Executive MUST be the first department)
2. 10-15 positions spread across these departments

For each department, provide a brief description.
For each position, provide:
- The position name
- Which department it belongs to
- A professional job description (80-120 words)
- 5-7 key responsibilities

Focus on roles typical for a medium-sized company in the ${categoryLabel || category} industry.`;

    const toolSchema = {
      type: "function",
      function: {
        name: "generate_org_structure",
        description: "Generate organizational structure with departments and positions",
        parameters: {
          type: "object",
          properties: {
            departments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Department name" },
                  description: { type: "string", description: "Brief department description (50-80 words)" }
                },
                required: ["name", "description"]
              },
              description: "6-8 departments, Executive must be first"
            },
            positions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Position title" },
                  department: { type: "string", description: "Department this position belongs to" },
                  description: { type: "string", description: "Job description (80-120 words)" },
                  responsibilities: {
                    type: "array",
                    items: { type: "string" },
                    description: "5-7 key responsibilities"
                  }
                },
                required: ["name", "department", "description", "responsibilities"]
              },
              description: "10-15 positions with descriptions"
            }
          },
          required: ["departments", "positions"],
          additionalProperties: false
        }
      }
    };

    console.log(`Generating structure for category: ${category}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a professional HR consultant creating organizational structures for businesses." },
          { role: "user", content: prompt }
        ],
        tools: [toolSchema],
        tool_choice: { type: "function", function: { name: "generate_org_structure" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ error: "No content generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const { departments, positions } = parsed;

    // Insert departments
    const departmentRecords = departments.map((dept: { name: string; description: string }, index: number) => ({
      business_category: category,
      name: dept.name,
      description: dept.description,
      sort_order: index + 1,
      is_active: true,
    }));

    const { error: deptError } = await supabase
      .from("template_departments")
      .insert(departmentRecords);

    if (deptError) {
      console.error("Error inserting departments:", deptError);
      throw new Error(`Failed to insert departments: ${deptError.message}`);
    }

    // Insert positions
    const positionRecords = positions.map((pos: { 
      name: string; 
      department: string; 
      description: string; 
      responsibilities: string[] 
    }, index: number) => ({
      business_category: category,
      department_name: pos.department,
      name: pos.name,
      description: pos.description,
      responsibilities: pos.responsibilities,
      sort_order: index + 1,
      is_active: true,
    }));

    const { error: posError } = await supabase
      .from("template_positions")
      .insert(positionRecords);

    if (posError) {
      console.error("Error inserting positions:", posError);
      throw new Error(`Failed to insert positions: ${posError.message}`);
    }

    console.log(`Successfully generated structure for ${category}: ${departments.length} departments, ${positions.length} positions`);

    return new Response(
      JSON.stringify({
        success: true,
        departmentsCreated: departments.length,
        positionsCreated: positions.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-category-structure:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
