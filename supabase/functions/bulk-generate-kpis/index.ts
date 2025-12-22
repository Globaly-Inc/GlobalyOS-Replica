import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CascadeConfig {
  includeOrganization: boolean;
  includeDepartments: boolean;
  includeProjects: boolean;
  includeOffices: boolean;
  includeIndividuals: boolean;
}

interface RequestBody {
  documentContent: string;
  periodType: "annual" | "quarterly";
  quarter: number;
  year: number;
  quarterlyBreakdown?: boolean;
  aiInstructions?: string;
  cascadeConfig: CascadeConfig;
  targetDepartments?: string[];
  targetProjects?: string[];
  targetOffices?: string[];
  targetEmployees?: string[];
  organizationContext: {
    name: string;
    departments: string[];
    offices: { id: string; name: string }[];
    projects: { id: string; name: string }[];
    employeeProjects: { employee_id: string; project_id: string }[];
    employees: { id: string; name: string; department: string; position: string; officeId: string }[];
  };
}

interface GeneratedKpi {
  tempId: string;
  scopeType: "organization" | "department" | "project" | "office" | "individual";
  scopeValue?: string;
  scopeId?: string;
  projectId?: string;
  projectName?: string;
  employeeId?: string;
  employeeName?: string;
  title: string;
  description: string;
  targetValue: number;
  unit: string;
  parentTempId?: string;
  quarter?: number;
  isQuarterlyChild?: boolean;
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
    const { documentContent, periodType, quarter, year, quarterlyBreakdown, aiInstructions, cascadeConfig, targetDepartments, targetProjects, targetOffices, targetEmployees, organizationContext } = body;

    const periodLabel = periodType === "annual" ? `FY ${year}` : `Q${quarter} ${year}`;

    console.log("Bulk KPI Generation Request:", { 
      periodType, periodLabel,
      quarterlyBreakdown,
      cascadeConfig,
      departmentsCount: organizationContext.departments.length,
      projectsCount: organizationContext.projects?.length || 0,
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

    // Filter by projects if specified
    const employeeProjects = organizationContext.employeeProjects || [];
    if (targetProjects?.length) {
      const employeeIdsInProjects = employeeProjects
        .filter(ep => targetProjects.includes(ep.project_id))
        .map(ep => ep.employee_id);
      filteredEmployees = filteredEmployees.filter(e => employeeIdsInProjects.includes(e.id));
    }

    // Filter departments based on filtered employees
    const activeDepartments = cascadeConfig.includeDepartments 
      ? [...new Set(filteredEmployees.map(e => e.department).filter(Boolean))]
      : [];
    
    const activeOffices = cascadeConfig.includeOffices
      ? (organizationContext.offices || []).filter(o => 
          filteredEmployees.some(e => e.officeId === o.id)
        )
      : [];

    // Filter projects based on targets and employee assignments
    let activeProjects: { id: string; name: string }[] = [];
    if (cascadeConfig.includeProjects && organizationContext.projects) {
      if (targetProjects?.length) {
        activeProjects = organizationContext.projects.filter(p => targetProjects.includes(p.id));
      } else {
        // Include projects that have at least one of our filtered employees
        const activeEmployeeIds = new Set(filteredEmployees.map(e => e.id));
        const projectsWithEmployees = new Set(
          employeeProjects
            .filter(ep => activeEmployeeIds.has(ep.employee_id))
            .map(ep => ep.project_id)
        );
        activeProjects = organizationContext.projects.filter(p => projectsWithEmployees.has(p.id));
      }
    }

    // Build project-to-employees mapping for the prompt
    const projectEmployeeMap: Record<string, { id: string; name: string; position: string }[]> = {};
    if (cascadeConfig.includeProjects) {
      activeProjects.forEach(project => {
        const employeeIds = employeeProjects
          .filter(ep => ep.project_id === project.id)
          .map(ep => ep.employee_id);
        projectEmployeeMap[project.name] = filteredEmployees
          .filter(e => employeeIds.includes(e.id))
          .map(e => ({ id: e.id, name: e.name, position: e.position }));
      });
    }

    // Build prompt for AI
    const quarterlyBreakdownInstructions = quarterlyBreakdown && periodType === "annual" ? `
QUARTERLY BREAKDOWN MODE:
Since this is an annual plan with quarterly breakdown enabled, for EACH annual KPI you create, also generate 4 quarterly child KPIs (Q1, Q2, Q3, Q4).
- The quarterly KPIs should have the same scopeType as their parent
- Their targetValue should sum up to the parent's annual target (distribute intelligently)
- Consider seasonality: Q1 might have lower targets (ramp-up), Q4 might be higher (year-end push)
- For revenue targets: typical distribution could be 20% Q1, 25% Q2, 25% Q3, 30% Q4
- For hiring/headcount: might be more even distribution
- For project milestones: consider project phase timing
- Set "quarter" field to 1, 2, 3, or 4 for quarterly KPIs
- Set "isQuarterlyChild" to true for quarterly KPIs
- Link quarterly KPIs to their annual parent via "parentTempId"

Example quarterly breakdown:
{
  "tempId": "org-annual-1",
  "scopeType": "organization",
  "title": "Annual Revenue FY ${year}",
  "targetValue": 1000000,
  "unit": "$"
},
{
  "tempId": "org-q1-1",
  "scopeType": "organization", 
  "title": "Revenue Q1 ${year}",
  "targetValue": 200000,
  "unit": "$",
  "quarter": 1,
  "isQuarterlyChild": true,
  "parentTempId": "org-annual-1"
},
{
  "tempId": "org-q2-1",
  "scopeType": "organization",
  "title": "Revenue Q2 ${year}",
  "targetValue": 250000,
  "unit": "$",
  "quarter": 2,
  "isQuarterlyChild": true,
  "parentTempId": "org-annual-1"
}
... (Q3, Q4 similarly)
` : '';

    const systemPrompt = `You are an expert HR consultant specializing in strategic KPI design and OKR frameworks.
Your task is to analyze organizational documents and generate a hierarchical KPI structure.

Guidelines for KPI creation:
1. Create SMART KPIs (Specific, Measurable, Achievable, Relevant, Time-bound)
2. Organization KPIs should be high-level strategic goals
3. Department/Office/Project KPIs should cascade from organization goals
4. Individual KPIs should be specific, actionable tasks that contribute to their team/project goals
5. Use appropriate units (%, count, $, rating, etc.)
6. Set realistic target values based on industry standards
7. For project KPIs, focus on product/project-specific outcomes (revenue, features, milestones)
8. Link individual KPIs to projects when the employee is assigned to that project
${quarterlyBreakdownInstructions}
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
      "tempId": "proj-1",
      "scopeType": "project",
      "projectId": "uuid",
      "projectName": "Agentcis",
      "title": "Revenue Target",
      "description": "Description",
      "targetValue": 500000,
      "unit": "$",
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
      "parentTempId": "proj-1"
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
- Projects: ${activeProjects.map(p => p.name).join(', ') || 'N/A'}
- Team Members: ${filteredEmployees.length} employees

Generate KPIs with this cascade:`;

    if (cascadeConfig.includeOrganization) {
      userPrompt += `\n- 2-3 Organization-level strategic KPIs for ${periodLabel}`;
    }
    if (cascadeConfig.includeDepartments && activeDepartments.length > 0) {
      userPrompt += `\n- 2-3 KPIs per department: ${activeDepartments.join(', ')}`;
    }
    if (cascadeConfig.includeProjects && activeProjects.length > 0) {
      userPrompt += `\n- 2-3 KPIs per project (product-specific targets):`;
      activeProjects.forEach(p => {
        const projectTeam = projectEmployeeMap[p.name] || [];
        userPrompt += `\n  • ${p.name} (ID: ${p.id}) - Team: ${projectTeam.length} members`;
        if (projectTeam.length > 0 && projectTeam.length <= 5) {
          userPrompt += ` (${projectTeam.map(e => e.name).join(', ')})`;
        }
      });
    }
    if (cascadeConfig.includeOffices && activeOffices.length > 0) {
      userPrompt += `\n- 1-2 KPIs per office: ${activeOffices.map(o => o.name).join(', ')}`;
    }
    if (cascadeConfig.includeIndividuals && filteredEmployees.length > 0) {
      userPrompt += `\n- 1-2 Individual KPIs for each of these employees:`;
      filteredEmployees.forEach(e => {
        // Find projects this employee is assigned to
        const empProjects = employeeProjects
          .filter(ep => ep.employee_id === e.id)
          .map(ep => activeProjects.find(p => p.id === ep.project_id)?.name)
          .filter(Boolean);
        
        const projectInfo = empProjects.length > 0 ? `, Projects: ${empProjects.join(', ')}` : '';
        userPrompt += `\n  • ${e.name} (${e.position}, ${e.department}${projectInfo}) - ID: ${e.id}`;
      });
      
      userPrompt += `\n\nIMPORTANT: When an employee is assigned to a project, consider linking their individual KPIs to the project KPI as parent (using parentTempId referencing proj-X).`;
    }

    userPrompt += `\n\nEnsure parent-child relationships are properly set using parentTempId to link child KPIs to their parent.
${quarterlyBreakdown && periodType === "annual" ? 'REMEMBER: Generate quarterly breakdowns (Q1-Q4) for each annual KPI with intelligent target distribution.' : ''}
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

    // Add IDs to scope-specific KPIs
    parsed.kpis = parsed.kpis.map(kpi => {
      // Add office IDs
      if (kpi.scopeType === 'office' && kpi.scopeValue) {
        const office = activeOffices.find(o => 
          o.name.toLowerCase() === kpi.scopeValue?.toLowerCase()
        );
        if (office) {
          kpi.scopeId = office.id;
        }
      }
      
      // Validate project IDs and add names
      if (kpi.scopeType === 'project') {
        if (kpi.projectId) {
          const project = activeProjects.find(p => p.id === kpi.projectId);
          if (project) {
            kpi.projectName = project.name;
          }
        } else if (kpi.projectName) {
          // Try to find project by name if ID not provided
          const project = activeProjects.find(p => 
            p.name.toLowerCase() === kpi.projectName?.toLowerCase()
          );
          if (project) {
            kpi.projectId = project.id;
          }
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
