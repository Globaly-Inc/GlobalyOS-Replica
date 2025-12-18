import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CascadeConfig {
  includeOrganization: boolean;
  includeDepartments: boolean;
  includeOffices: boolean;
  includeIndividuals: boolean;
}

interface RequestBody {
  documentContent: string;
  periodType: "annual" | "quarterly";
  quarter: number;
  year: number;
  aiInstructions?: string;
  cascadeConfig: CascadeConfig;
  targetDepartments?: string[];
  targetOffices?: string[];
  targetEmployees?: string[];
  organizationContext: {
    name: string;
    departments: string[];
    offices: { id: string; name: string }[];
    employees: { id: string; name: string; department: string; position: string; officeId: string }[];
  };
}

interface GeneratedKpi {
  tempId: string;
  scopeType: "organization" | "department" | "office" | "individual";
  scopeValue?: string;
  scopeId?: string;
  employeeId?: string;
  employeeName?: string;
  title: string;
  description: string;
  targetValue: number;
  unit: string;
  parentTempId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body: RequestBody = await req.json();
    const { documentContent, periodType, quarter, year, aiInstructions, cascadeConfig, targetDepartments, targetOffices, targetEmployees, organizationContext } = body;

    const periodLabel = periodType === "annual" ? `FY ${year}` : `Q${quarter} ${year}`;

    console.log("Bulk KPI Generation Request:", { 
      periodType, periodLabel,
      cascadeConfig,
      departmentsCount: organizationContext.departments.length,
      employeesCount: organizationContext.employees.length,
      documentLength: documentContent?.length || 0,
      aiInstructionsLength: aiInstructions?.length || 0
    });

    // Filter employees based on targets
    let filteredEmployees = organizationContext.employees;
    if (targetDepartments?.length) {
      filteredEmployees = filteredEmployees.filter(e => targetDepartments.includes(e.department));
    }
    if (targetOffices?.length) {
      filteredEmployees = filteredEmployees.filter(e => targetOffices.includes(e.officeId));
    }
    if (targetEmployees?.length) {
      filteredEmployees = filteredEmployees.filter(e => targetEmployees.includes(e.id));
    }

    // Filter departments based on filtered employees
    const activeDepartments = cascadeConfig.includeDepartments 
      ? [...new Set(filteredEmployees.map(e => e.department).filter(Boolean))]
      : [];
    
    const activeOffices = cascadeConfig.includeOffices
      ? organizationContext.offices.filter(o => 
          filteredEmployees.some(e => e.officeId === o.id)
        )
      : [];

    // Build prompt for AI
    const systemPrompt = `You are an expert HR consultant specializing in strategic KPI design and OKR frameworks.
Your task is to analyze organizational documents and generate a hierarchical KPI structure.

Guidelines for KPI creation:
1. Create SMART KPIs (Specific, Measurable, Achievable, Relevant, Time-bound)
2. Organization KPIs should be high-level strategic goals
3. Department/Office KPIs should cascade from organization goals
4. Individual KPIs should be specific, actionable tasks that contribute to department goals
5. Use appropriate units (%, count, $, rating, etc.)
6. Set realistic target values based on industry standards

CRITICAL: You MUST respond with ONLY a valid JSON object, no markdown, no explanation. 
The JSON must follow this exact structure:

{
  "kpis": [
    {
      "tempId": "org-1",
      "scopeType": "organization",
      "title": "KPI Title",
      "description": "Description",
      "targetValue": 100,
      "unit": "%"
    },
    {
      "tempId": "dept-1",
      "scopeType": "department",
      "scopeValue": "Engineering",
      "title": "KPI Title",
      "description": "Description",
      "targetValue": 50,
      "unit": "count",
      "parentTempId": "org-1"
    },
    {
      "tempId": "ind-1",
      "scopeType": "individual",
      "employeeId": "uuid",
      "employeeName": "John Doe",
      "title": "KPI Title",
      "description": "Description",
      "targetValue": 10,
      "unit": "count",
      "parentTempId": "dept-1"
    }
  ]
}`;

    let userPrompt = `Generate KPIs for ${organizationContext.name} for ${periodLabel}.

${aiInstructions ? `IMPORTANT - User Instructions:
${aiInstructions}

` : ''}${documentContent ? `Reference Document Content:
---
${documentContent.slice(0, 8000)}
---

` : ''}Organization Structure:
- Departments: ${activeDepartments.join(', ') || 'N/A'}
- Offices: ${activeOffices.map(o => o.name).join(', ') || 'N/A'}
- Team Members: ${filteredEmployees.length} employees

Generate KPIs with this cascade:`;

    if (cascadeConfig.includeOrganization) {
      userPrompt += `\n- 2-3 Organization-level strategic KPIs for ${periodLabel}`;
    }
    if (cascadeConfig.includeDepartments && activeDepartments.length > 0) {
      userPrompt += `\n- 2-3 KPIs per department: ${activeDepartments.join(', ')}`;
    }
    if (cascadeConfig.includeOffices && activeOffices.length > 0) {
      userPrompt += `\n- 1-2 KPIs per office: ${activeOffices.map(o => o.name).join(', ')}`;
    }
    if (cascadeConfig.includeIndividuals && filteredEmployees.length > 0) {
      userPrompt += `\n- 1-2 Individual KPIs for each of these employees:`;
      filteredEmployees.forEach(e => {
        userPrompt += `\n  • ${e.name} (${e.position}, ${e.department}) - ID: ${e.id}`;
      });
    }

    userPrompt += `\n\nEnsure parent-child relationships are properly set using parentTempId to link child KPIs to their parent.
${documentContent ? 'Base the KPIs on the themes and goals mentioned in the reference document.' : 'Create standard business KPIs based on the organization structure.'}
${aiInstructions ? 'Follow the user instructions provided above when creating KPIs.' : ''}

Respond with ONLY the JSON object, no additional text.`;

    console.log("Sending prompt to AI...", { promptLength: userPrompt.length });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI Response received, length:", content.length);

    // Parse JSON from response
    let parsed: { kpis: GeneratedKpi[] };
    try {
      // Try to extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      parsed = JSON.parse(jsonStr.trim());
      
      if (!parsed.kpis || !Array.isArray(parsed.kpis)) {
        throw new Error("Invalid response structure");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, content.slice(0, 500));
      throw new Error("Failed to parse AI response. Please try again.");
    }

    console.log("Generated KPIs count:", parsed.kpis.length);

    // Add office IDs to office KPIs
    parsed.kpis = parsed.kpis.map(kpi => {
      if (kpi.scopeType === 'office' && kpi.scopeValue) {
        const office = activeOffices.find(o => 
          o.name.toLowerCase() === kpi.scopeValue?.toLowerCase()
        );
        if (office) {
          kpi.scopeId = office.id;
        }
      }
      return kpi;
    });

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in bulk-generate-kpis:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
