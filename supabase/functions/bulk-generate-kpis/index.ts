import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    industry?: string;
    companySize?: string;
    departments: string[];
    offices: { id: string; name: string }[];
    projects: { id: string; name: string; description?: string; documentContent?: string }[];
    employeeProjects: { employee_id: string; project_id: string }[];
    employees: { 
      id: string; 
      name: string; 
      department: string; 
      position: string; 
      positionDescription?: string;
      positionResponsibilities?: string[];
      officeId: string;
      managerId?: string;
      tenure?: "new" | "experienced" | "veteran";
    }[];
    historicalContext?: {
      lastYearKpis: {
        title: string;
        target: number;
        achieved: number;
        unit: string;
        scope: string;
      }[];
    };
    preferredKpiStyles?: {
      title: string;
      unit: string;
      category: string | null;
    }[];
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

// Industry-specific KPI guidelines
function getIndustryKpiGuidelines(industry: string): string {
  const guidelines: Record<string, string> = {
    "Technology": "Focus on: MRR/ARR growth, customer churn, NPS, sprint velocity, deployment frequency, uptime SLAs, feature adoption rates, bug resolution time",
    "Healthcare": "Focus on: Patient satisfaction, treatment outcomes, wait times, compliance rates, staff-to-patient ratios, readmission rates",
    "Finance": "Focus on: Assets under management, portfolio returns, client acquisition cost, regulatory compliance, risk metrics, processing time",
    "Retail": "Focus on: Sales per square foot, inventory turnover, customer retention, average transaction value, foot traffic, conversion rate",
    "Manufacturing": "Focus on: Production efficiency, defect rates, on-time delivery, equipment uptime, cost per unit, safety incidents",
    "Education": "Focus on: Student outcomes, enrollment rates, retention, course completion, satisfaction scores, placement rates",
    "Consulting": "Focus on: Billable utilization, client satisfaction, project profitability, repeat business rate, proposal win rate",
    "SaaS": "Focus on: MRR growth, churn rate, LTV/CAC ratio, activation rate, feature adoption, NPS, expansion revenue",
    "Marketing": "Focus on: Lead generation, conversion rates, CAC, ROAS, brand awareness, engagement metrics",
    "Real Estate": "Focus on: Occupancy rates, rental yield, property appreciation, tenant retention, maintenance costs",
  };
  return guidelines[industry] || "Focus on: Revenue growth, customer satisfaction, operational efficiency, employee productivity, quality metrics, cost optimization";
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
    const { 
      documentContent, periodType, quarter, year, quarterlyBreakdown, 
      aiInstructions, cascadeConfig, targetDepartments, targetProjects, 
      targetOffices, targetEmployees, organizationContext 
    } = body;

    const periodLabel = periodType === "annual" ? `FY ${year}` : `Q${quarter} ${year}`;
    const { historicalContext, preferredKpiStyles } = organizationContext;

    console.log("Bulk KPI Generation Request:", { 
      periodType, periodLabel,
      quarterlyBreakdown,
      cascadeConfig,
      industry: organizationContext.industry,
      companySize: organizationContext.companySize,
      departmentsCount: organizationContext.departments.length,
      projectsCount: organizationContext.projects?.length || 0,
      employeesCount: organizationContext.employees.length,
      documentLength: documentContent?.length || 0,
      aiInstructionsLength: aiInstructions?.length || 0,
      hasHistoricalContext: !!historicalContext?.lastYearKpis?.length,
      hasKpiTemplates: !!preferredKpiStyles?.length,
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
    let activeProjects: { id: string; name: string; description?: string; documentContent?: string }[] = [];
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
` : '';

    // Get industry-specific guidance
    const industryGuidelines = getIndustryKpiGuidelines(organizationContext.industry || "General");

    // Build historical context section
    let historicalSection = '';
    if (historicalContext?.lastYearKpis?.length) {
      historicalSection = `
HISTORICAL PERFORMANCE (Last Year):
${historicalContext.lastYearKpis.slice(0, 5).map(k => {
  const achievementPct = k.target > 0 ? Math.round((k.achieved / k.target) * 100) : 0;
  return `- ${k.scope} | ${k.title}: Target ${k.target}${k.unit}, Achieved ${k.achieved}${k.unit} (${achievementPct}%)`;
}).join('\n')}
Use these as baseline for realistic target-setting. Consider 10-20% growth for successful KPIs.
`;
    }

    // Build KPI template preferences section
    let templateSection = '';
    if (preferredKpiStyles?.length) {
      templateSection = `
ORGANIZATION'S KPI NAMING PREFERENCES:
${preferredKpiStyles.slice(0, 5).map(t => `- ${t.title} (${t.unit}${t.category ? `, Category: ${t.category}` : ''})`).join('\n')}
Follow similar naming conventions and units where appropriate.
`;
    }

    const systemPrompt = `You are an expert HR consultant specializing in strategic KPI design and OKR frameworks.
Your task is to analyze organizational documents and generate a hierarchical KPI structure.

ORGANIZATION PROFILE:
- Industry: ${organizationContext.industry || "General Business"}
- Company Size: ${organizationContext.companySize || "Unknown"}

INDUSTRY-SPECIFIC GUIDANCE:
${industryGuidelines}
${historicalSection}${templateSection}
Guidelines for KPI creation:
1. Create SMART KPIs (Specific, Measurable, Achievable, Relevant, Time-bound)
2. Organization KPIs should be high-level strategic goals
3. Department/Office/Project KPIs should cascade from organization goals
4. Individual KPIs should be specific, actionable tasks that contribute to their team/project goals
5. Use appropriate units (%, count, $, rating, etc.)
6. Set realistic target values based on industry standards and historical performance
7. For project KPIs, use the project description AND any attached reference documents to create relevant product-specific outcomes
8. When project documents are provided, extract key metrics, goals, and milestones from them for KPI targets
9. Link individual KPIs to projects when the employee is assigned to that project
9. For individual KPIs, use position responsibilities to create role-aligned, actionable KPIs
10. For NEW employees (<6 months), focus on onboarding, learning, and initial contributions
11. For VETERAN employees (>3 years), include leadership, mentoring, and strategic initiatives
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
${documentContent.slice(0, 6000)}
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
        // Include project description for context
        if (p.description) {
          userPrompt += `\n    Project focus: ${p.description.slice(0, 200)}`;
        }
        // Include parsed project document content for richer AI context
        if (p.documentContent) {
          userPrompt += `\n    Reference documents:\n${p.documentContent.slice(0, 800)}`;
        }
      });
    }
    if (cascadeConfig.includeOffices && activeOffices.length > 0) {
      userPrompt += `\n- 1-2 KPIs per office: ${activeOffices.map(o => o.name).join(', ')}`;
    }
    if (cascadeConfig.includeIndividuals && filteredEmployees.length > 0) {
      userPrompt += `\n- 1-2 Individual KPIs for each employee:`;
      
      // For large teams, only include detailed responsibilities for employees with projects
      const isLargeTeam = filteredEmployees.length > 20;
      
      filteredEmployees.forEach(e => {
        // Find projects this employee is assigned to
        const empProjects = employeeProjects
          .filter(ep => ep.employee_id === e.id)
          .map(ep => activeProjects.find(p => p.id === ep.project_id)?.name)
          .filter(Boolean);
        
        const projectInfo = empProjects.length > 0 ? `, Projects: ${empProjects.join(', ')}` : '';
        
        // Add tenure context for appropriate KPI assignment
        const tenureNote = e.tenure === "new" 
          ? " [NEW - focus on learning/onboarding]"
          : e.tenure === "veteran"
          ? " [VETERAN - include leadership/mentoring]"
          : "";
        
        userPrompt += `\n  • ${e.name} (${e.position}, ${e.department}${projectInfo})${tenureNote} - ID: ${e.id}`;
        
        // Smart inclusion of responsibilities: only for key employees to save prompt size
        const shouldIncludeDetails = !isLargeTeam || empProjects.length > 0;
        if (shouldIncludeDetails && e.positionResponsibilities && e.positionResponsibilities.length > 0) {
          const topResponsibilities = e.positionResponsibilities
            .slice(0, 2)
            .map((r: string) => r.slice(0, 80));
          userPrompt += `\n    Role: ${topResponsibilities.join('; ')}`;
        }
      });
      
      userPrompt += `\n\nIMPORTANT: When an employee is assigned to a project, consider linking their individual KPIs to the project KPI as parent (using parentTempId referencing proj-X). Use position responsibilities to create relevant, role-specific KPIs.`;
    }

    userPrompt += `\n\nEnsure parent-child relationships are properly set using parentTempId to link child KPIs to their parent.
${quarterlyBreakdown && periodType === "annual" ? 'REMEMBER: Generate quarterly breakdowns (Q1-Q4) for each annual KPI with intelligent target distribution.' : ''}
${documentContent ? 'Base the KPIs on the themes and goals mentioned in the reference document.' : 'Create standard business KPIs based on the organization structure.'}
${aiInstructions ? 'Follow the user instructions provided above when creating KPIs.' : ''}

Respond with ONLY the JSON object, no additional text.`;

    // Log prompt statistics for debugging
    console.log("Prompt stats:", { 
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length,
      totalPromptLength: systemPrompt.length + userPrompt.length,
      filteredEmployeesCount: filteredEmployees.length,
      activeProjectsCount: activeProjects.length,
      activeDepartmentsCount: activeDepartments.length,
      industry: organizationContext.industry
    });

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
