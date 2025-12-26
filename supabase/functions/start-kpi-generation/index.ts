/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
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

interface JobConfig {
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
  organizationContext: any;
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

async function updateJobProgress(
  supabase: any, 
  jobId: string, 
  progress: number, 
  message: string, 
  status?: string
) {
  const updates: any = { 
    progress, 
    progress_message: message 
  };
  
  if (status) {
    updates.status = status;
    if (status === 'processing') {
      updates.started_at = new Date().toISOString();
    } else if (status === 'completed' || status === 'failed') {
      updates.completed_at = new Date().toISOString();
    }
  }
  
  const { error } = await supabase
    .from('kpi_generation_jobs')
    .update(updates)
    .eq('id', jobId);
    
  if (error) {
    console.error('Failed to update job progress:', error);
  }
}

// Constants for limiting scope to prevent AI response truncation
const MAX_EMPLOYEES_FOR_INDIVIDUAL_KPIS = 25;
const KPIS_PER_INDIVIDUAL_LARGE_TEAM = 1;

async function processKpiGeneration(jobId: string, config: JobConfig) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Update status to processing
    await updateJobProgress(supabase, jobId, 10, "Preparing organization context...", "processing");
    
    const { 
      documentContent, periodType, quarter, year, quarterlyBreakdown, 
      aiInstructions, cascadeConfig, targetDepartments, targetProjects, 
      targetOffices, targetEmployees, organizationContext 
    } = config;
    
    const periodLabel = periodType === "annual" ? `FY ${year}` : `Q${quarter} ${year}`;
    const { historicalContext, preferredKpiStyles } = organizationContext;

    console.log("Background KPI Generation:", { 
      jobId,
      periodType, 
      periodLabel,
      industry: organizationContext.industry,
      employeesCount: organizationContext.employees?.length || 0,
    });

    // Update progress
    await updateJobProgress(supabase, jobId, 20, "Building AI prompt...");

    // Filter employees based on targets
    let filteredEmployees = organizationContext.employees || [];
    if (targetDepartments?.length) {
      filteredEmployees = filteredEmployees.filter((e: any) => targetDepartments.includes(e.department));
    }
    if (targetOffices?.length) {
      filteredEmployees = filteredEmployees.filter((e: any) => targetOffices.includes(e.officeId));
    }
    if (targetEmployees?.length) {
      filteredEmployees = filteredEmployees.filter((e: any) => targetEmployees.includes(e.id));
    }

    // Filter by projects if specified
    const employeeProjects = organizationContext.employeeProjects || [];
    if (targetProjects?.length) {
      const employeeIdsInProjects = employeeProjects
        .filter((ep: any) => targetProjects.includes(ep.project_id))
        .map((ep: any) => ep.employee_id);
      filteredEmployees = filteredEmployees.filter((e: any) => employeeIdsInProjects.includes(e.id));
    }

    // Limit employees for large teams to prevent AI response truncation
    const originalEmployeeCount = filteredEmployees.length;
    let isLargeTeam = false;
    if (cascadeConfig.includeIndividuals && filteredEmployees.length > MAX_EMPLOYEES_FOR_INDIVIDUAL_KPIS) {
      isLargeTeam = true;
      console.log(`Large team detected (${filteredEmployees.length} employees), limiting to ${MAX_EMPLOYEES_FOR_INDIVIDUAL_KPIS}`);
      
      // Prioritize by projects and tenure
      filteredEmployees = filteredEmployees
        .map((e: any) => {
          const projectCount = employeeProjects.filter((ep: any) => ep.employee_id === e.id).length;
          const tenureScore = e.tenure === 'veteran' ? 2 : e.tenure === 'new' ? 1 : 0;
          return { ...e, priorityScore: projectCount * 2 + tenureScore };
        })
        .sort((a: any, b: any) => b.priorityScore - a.priorityScore)
        .slice(0, MAX_EMPLOYEES_FOR_INDIVIDUAL_KPIS);
    }

    // Filter departments based on filtered employees
    const activeDepartments = cascadeConfig.includeDepartments 
      ? [...new Set(filteredEmployees.map((e: any) => e.department).filter(Boolean))]
      : [];
    
    const activeOffices = cascadeConfig.includeOffices
      ? (organizationContext.offices || []).filter((o: any) => 
          filteredEmployees.some((e: any) => e.officeId === o.id)
        )
      : [];

    // Filter projects
    let activeProjects: { id: string; name: string; description?: string }[] = [];
    if (cascadeConfig.includeProjects && organizationContext.projects) {
      if (targetProjects?.length) {
        activeProjects = organizationContext.projects.filter((p: any) => targetProjects.includes(p.id));
      } else {
        const activeEmployeeIds = new Set(filteredEmployees.map((e: any) => e.id));
        const projectsWithEmployees = new Set(
          employeeProjects
            .filter((ep: any) => activeEmployeeIds.has(ep.employee_id))
            .map((ep: any) => ep.project_id)
        );
        activeProjects = organizationContext.projects.filter((p: any) => projectsWithEmployees.has(p.id));
      }
    }

    // Build project-to-employees mapping
    const projectEmployeeMap: Record<string, { id: string; name: string; position: string }[]> = {};
    if (cascadeConfig.includeProjects) {
      activeProjects.forEach(project => {
        const employeeIds = employeeProjects
          .filter((ep: any) => ep.project_id === project.id)
          .map((ep: any) => ep.employee_id);
        projectEmployeeMap[project.name] = filteredEmployees
          .filter((e: any) => employeeIds.includes(e.id))
          .map((e: any) => ({ id: e.id, name: e.name, position: e.position }));
      });
    }

    await updateJobProgress(supabase, jobId, 35, "AI is analyzing organization structure...");

    // Build prompt
    const quarterlyBreakdownInstructions = quarterlyBreakdown && periodType === "annual" ? `
QUARTERLY BREAKDOWN MODE:
Since this is an annual plan with quarterly breakdown enabled, for EACH annual KPI you create, also generate 4 quarterly child KPIs (Q1, Q2, Q3, Q4).
- The quarterly KPIs should have the same scopeType as their parent
- Their targetValue should sum up to the parent's annual target (distribute intelligently)
- Consider seasonality: Q1 might have lower targets (ramp-up), Q4 might be higher (year-end push)
- Set "quarter" field to 1, 2, 3, or 4 for quarterly KPIs
- Set "isQuarterlyChild" to true for quarterly KPIs
- Link quarterly KPIs to their annual parent via "parentTempId"
` : '';

    const industryGuidelines = getIndustryKpiGuidelines(organizationContext.industry || "General");

    let historicalSection = '';
    if (historicalContext?.lastYearKpis?.length) {
      historicalSection = `
HISTORICAL PERFORMANCE (Last Year):
${historicalContext.lastYearKpis.slice(0, 5).map((k: any) => {
  const achievementPct = k.target > 0 ? Math.round((k.achieved / k.target) * 100) : 0;
  return `- ${k.scope} | ${k.title}: Target ${k.target}${k.unit}, Achieved ${k.achieved}${k.unit} (${achievementPct}%)`;
}).join('\n')}
Use these as baseline for realistic target-setting. Consider 10-20% growth for successful KPIs.
`;
    }

    let templateSection = '';
    if (preferredKpiStyles?.length) {
      templateSection = `
ORGANIZATION'S KPI NAMING PREFERENCES:
${preferredKpiStyles.slice(0, 5).map((t: any) => `- ${t.title} (${t.unit}${t.category ? `, Category: ${t.category}` : ''})`).join('\n')}
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
4. Individual KPIs should be specific, actionable tasks
5. Use appropriate units (%, count, $, rating, etc.)
6. Set realistic target values based on industry standards
7. For project KPIs, use project description to create relevant outcomes
8. Link individual KPIs to projects when the employee is assigned to that project
9. For individual KPIs, use position responsibilities to create role-aligned KPIs
10. For NEW employees (<6 months), focus on onboarding, learning
11. For VETERAN employees (>3 years), include leadership, mentoring

CRITICAL HIERARCHY RULES - YOU MUST FOLLOW THESE:
- Organization KPIs have NO parentTempId (they are the root)
- Department KPIs MUST have parentTempId pointing to an organization KPI's tempId
- Office KPIs MUST have parentTempId pointing to an organization KPI's tempId
- Project KPIs MUST have parentTempId pointing to an organization or department KPI's tempId
- Individual KPIs MUST have parentTempId pointing to their department, project, or office KPI's tempId
- EVERY non-organization KPI MUST have a valid parentTempId that references another KPI in the response
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
      "tempId": "dept-eng-1",
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
      "projectName": "Project Name",
      "title": "Revenue Target",
      "description": "Description",
      "targetValue": 500000,
      "unit": "$",
      "parentTempId": "dept-eng-1"
    },
    {
      "tempId": "ind-john-1",
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
- Departments: ${(activeDepartments as string[]).join(', ') || 'N/A'}
- Offices: ${activeOffices.map((o: any) => o.name).join(', ') || 'N/A'}
- Projects: ${activeProjects.map((p: any) => p.name).join(', ') || 'N/A'}
- Team Members: ${filteredEmployees.length} employees

Generate KPIs with this cascade:`;

    if (cascadeConfig.includeOrganization) {
      userPrompt += `\n- 2-3 Organization-level strategic KPIs for ${periodLabel}`;
    }
    if (cascadeConfig.includeDepartments && activeDepartments.length > 0) {
      userPrompt += `\n- 2-3 KPIs per department: ${(activeDepartments as string[]).join(', ')}`;
    }
    if (cascadeConfig.includeProjects && activeProjects.length > 0) {
      userPrompt += `\n- 2-3 KPIs per project:`;
      activeProjects.forEach(p => {
        const projectTeam = projectEmployeeMap[p.name] || [];
        userPrompt += `\n  • ${p.name} (ID: ${p.id}) - Team: ${projectTeam.length} members`;
        if (p.description) {
          userPrompt += `\n    Focus: ${p.description.slice(0, 100)}`;
        }
      });
    }
    if (cascadeConfig.includeOffices && activeOffices.length > 0) {
      userPrompt += `\n- 1-2 KPIs per office: ${activeOffices.map((o: any) => o.name).join(', ')}`;
    }
    if (cascadeConfig.includeIndividuals && filteredEmployees.length > 0) {
      const kpisPerEmployee = isLargeTeam ? KPIS_PER_INDIVIDUAL_LARGE_TEAM : 2;
      userPrompt += `\n- ${kpisPerEmployee} Individual KPI${kpisPerEmployee > 1 ? 's' : ''} for each employee${isLargeTeam ? ` (showing top ${filteredEmployees.length} of ${originalEmployeeCount} employees)` : ''}:`;
      filteredEmployees.forEach((e: any) => {
        const empProjects = employeeProjects
          .filter((ep: any) => ep.employee_id === e.id)
          .map((ep: any) => activeProjects.find((p: any) => p.id === ep.project_id)?.name)
          .filter(Boolean);
        
        const projectInfo = empProjects.length > 0 ? `, Projects: ${empProjects.join(', ')}` : '';
        
        const tenureNote = e.tenure === "new" 
          ? " [NEW]"
          : e.tenure === "veteran"
          ? " [VETERAN]"
          : "";
        
        userPrompt += `\n  • ${e.name} (${e.position}, ${e.department}${projectInfo})${tenureNote} - ID: ${e.id}`;
        
        const shouldIncludeDetails = !isLargeTeam || empProjects.length > 0;
        if (shouldIncludeDetails && e.positionResponsibilities?.length > 0) {
          const topResponsibilities = e.positionResponsibilities
            .slice(0, 2)
            .map((r: string) => r.slice(0, 60));
          userPrompt += `\n    Role: ${topResponsibilities.join('; ')}`;
        }
      });
    }

    userPrompt += `\n\nCRITICAL: Every department/office/project KPI MUST have parentTempId referencing an organization KPI. Every individual KPI MUST have parentTempId referencing their department, project, or office KPI. Do NOT leave parentTempId empty or null for non-organization KPIs.
${quarterlyBreakdown && periodType === "annual" ? 'REMEMBER: Generate quarterly breakdowns (Q1-Q4) for each annual KPI with parentTempId linking to the annual parent.' : ''}
Respond with ONLY the JSON object, no additional text.`;

    console.log("Prompt lengths:", { 
      system: systemPrompt.length,
      user: userPrompt.length,
      total: systemPrompt.length + userPrompt.length 
    });

    await updateJobProgress(supabase, jobId, 50, "Generating hierarchical KPIs...");

    // Call AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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
        max_tokens: 16000, // Ensure complete response for large KPI sets
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      }
      if (response.status === 402) {
        throw new Error("AI credits exhausted. Please add credits to continue.");
      }
      throw new Error(`AI service error: ${response.status}`);
    }

    await updateJobProgress(supabase, jobId, 75, "Processing AI response...");

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Clean and parse the response
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith("```json")) {
      cleanedContent = cleanedContent.slice(7);
    } else if (cleanedContent.startsWith("```")) {
      cleanedContent = cleanedContent.slice(3);
    }
    if (cleanedContent.endsWith("```")) {
      cleanedContent = cleanedContent.slice(0, -3);
    }
    cleanedContent = cleanedContent.trim();

    await updateJobProgress(supabase, jobId, 85, "Validating KPI structure...");

    let parsed: { kpis: GeneratedKpi[] };
    try {
      parsed = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", cleanedContent.substring(0, 500));
      console.error("Response length:", cleanedContent.length);
      
      // Check if response was truncated
      const isTruncated = !cleanedContent.endsWith('}') && !cleanedContent.endsWith(']');
      
      if (isTruncated) {
        console.log("Attempting to salvage truncated response...");
        
        // Try to find the last complete KPI object and salvage partial data
        const lastKpiEnd = cleanedContent.lastIndexOf('},');
        const lastArrayEnd = cleanedContent.lastIndexOf('}]');
        
        if (lastKpiEnd > 0 || lastArrayEnd > 0) {
          const salvagePoint = Math.max(lastKpiEnd, lastArrayEnd);
          let salvaged = cleanedContent.substring(0, salvagePoint + 1);
          
          // Close the JSON structure properly
          if (!salvaged.endsWith(']}')) {
            if (salvaged.endsWith('},')) {
              salvaged = salvaged.slice(0, -1) + ']}'; // Remove trailing comma, close array and object
            } else if (salvaged.endsWith('}')) {
              salvaged += ']}';
            }
          }
          
          try {
            parsed = JSON.parse(salvaged);
            console.log(`Salvaged ${parsed.kpis?.length || 0} KPIs from truncated response`);
          } catch (salvageError) {
            console.error("Failed to salvage truncated response");
            throw new Error("AI response was truncated. Try with fewer employees or disable quarterly breakdown.");
          }
        } else {
          throw new Error("AI response was truncated and could not be recovered. Try reducing team size or disabling quarterly breakdown.");
        }
      } else {
        throw new Error("Invalid response format from AI. Please try again.");
      }
    }

    if (!parsed.kpis || !Array.isArray(parsed.kpis)) {
      throw new Error("Invalid KPI structure in response");
    }
    
    console.log(`Successfully parsed ${parsed.kpis.length} KPIs`);

    // Validate and add missing fields
    let validatedKpis = parsed.kpis.map((kpi, index) => ({
      ...kpi,
      tempId: kpi.tempId || `kpi-${Date.now()}-${index}`,
      targetValue: typeof kpi.targetValue === 'number' ? kpi.targetValue : parseFloat(kpi.targetValue) || 100,
    }));

    // Post-process: Auto-assign parent KPIs if AI failed to set them
    const orgKpis = validatedKpis.filter(k => k.scopeType === 'organization' && !k.isQuarterlyChild);
    const deptKpis = validatedKpis.filter(k => k.scopeType === 'department' && !k.isQuarterlyChild);
    const officeKpis = validatedKpis.filter(k => k.scopeType === 'office' && !k.isQuarterlyChild);
    const projectKpis = validatedKpis.filter(k => k.scopeType === 'project' && !k.isQuarterlyChild);
    
    // Create lookup maps for finding appropriate parents (case-insensitive for departments)
    const deptKpiMap = new Map<string, string>();
    deptKpis.forEach(k => {
      if (k.scopeValue) {
        deptKpiMap.set(k.scopeValue.toLowerCase(), k.tempId);
      }
    });
    
    // Office lookup by both name and ID
    const officeKpiMap = new Map<string, string>();
    officeKpis.forEach(k => {
      if (k.scopeValue) officeKpiMap.set(k.scopeValue.toLowerCase(), k.tempId);
      if (k.scopeId) officeKpiMap.set(k.scopeId, k.tempId);
    });
    
    // Project lookup by ID and name
    const projectKpiMap = new Map<string, string>();
    projectKpis.forEach(k => {
      if (k.projectId) projectKpiMap.set(k.projectId, k.tempId);
      if (k.projectName) projectKpiMap.set(k.projectName.toLowerCase(), k.tempId);
    });
    
    // Default org KPI tempId for fallback
    const defaultOrgKpiTempId = orgKpis[0]?.tempId;
    
    // First pass: Auto-assign quarterly children to their annual parents
    validatedKpis = validatedKpis.map(kpi => {
      if (kpi.isQuarterlyChild && !kpi.parentTempId) {
        // Find the annual parent with same scope type and matching scope value/employee/project
        const annualParent = validatedKpis.find(k => 
          k.scopeType === kpi.scopeType &&
          !k.isQuarterlyChild &&
          !k.quarter &&
          (
            (kpi.scopeType === 'organization') ||
            (kpi.scopeType === 'individual' && k.employeeId === kpi.employeeId) ||
            (kpi.scopeType === 'project' && k.projectId === kpi.projectId) ||
            (kpi.scopeType === 'department' && k.scopeValue?.toLowerCase() === kpi.scopeValue?.toLowerCase()) ||
            (kpi.scopeType === 'office' && (k.scopeValue === kpi.scopeValue || k.scopeId === kpi.scopeId))
          )
        );
        
        if (annualParent) {
          console.log(`Auto-linked quarterly Q${kpi.quarter} "${kpi.title}" to annual: "${annualParent.title}"`);
          return { ...kpi, parentTempId: annualParent.tempId };
        }
      }
      return kpi;
    });
    
    // Second pass: Auto-assign hierarchy parents for non-quarterly KPIs
    validatedKpis = validatedKpis.map(kpi => {
      // Non-quarterly organization KPIs should not have parents
      if (kpi.scopeType === 'organization' && !kpi.isQuarterlyChild) {
        return { ...kpi, parentTempId: undefined };
      }
      
      // If parentTempId is already set and valid, keep it
      if (kpi.parentTempId && validatedKpis.some(k => k.tempId === kpi.parentTempId)) {
        return kpi;
      }
      
      // Skip quarterly children - they were handled in first pass
      if (kpi.isQuarterlyChild) {
        return kpi;
      }
      
      // Auto-assign parent based on hierarchy
      let assignedParent: string | undefined;
      
      if (kpi.scopeType === 'department' || kpi.scopeType === 'office') {
        // Departments and offices link to first org KPI
        assignedParent = defaultOrgKpiTempId;
      } else if (kpi.scopeType === 'project') {
        // Projects link to first org KPI
        assignedParent = defaultOrgKpiTempId;
      } else if (kpi.scopeType === 'individual') {
        // Individuals: try to find their department/project/office KPI
        const employee = filteredEmployees.find((e: any) => e.id === kpi.employeeId);
        if (employee) {
          // Check for project KPI first (if employee has projects)
          const empProjects = employeeProjects
            .filter((ep: any) => ep.employee_id === kpi.employeeId)
            .map((ep: any) => ep.project_id);
          
          for (const projId of empProjects) {
            if (projectKpiMap.has(projId)) {
              assignedParent = projectKpiMap.get(projId);
              break;
            }
          }
          
          // Fall back to department KPI (case-insensitive)
          if (!assignedParent && employee.department) {
            const deptKey = employee.department.toLowerCase();
            if (deptKpiMap.has(deptKey)) {
              assignedParent = deptKpiMap.get(deptKey);
            }
          }
          
          // Fall back to office KPI (by ID or name)
          if (!assignedParent && employee.officeId) {
            if (officeKpiMap.has(employee.officeId)) {
              assignedParent = officeKpiMap.get(employee.officeId);
            }
          }
        }
        
        // Ultimate fallback to org KPI
        if (!assignedParent) {
          assignedParent = defaultOrgKpiTempId;
        }
      }
      
      if (assignedParent && !kpi.parentTempId) {
        console.log(`Auto-assigned parent ${assignedParent} to ${kpi.scopeType} KPI: ${kpi.title}`);
      }
      
      return { ...kpi, parentTempId: kpi.parentTempId || assignedParent };
    });

    const kpisWithParents = validatedKpis.filter(k => k.parentTempId).length;
    const kpisWithoutParents = validatedKpis.filter(k => !k.parentTempId && k.scopeType !== 'organization').length;
    console.log(`Generated ${validatedKpis.length} KPIs (${kpisWithParents} with parents, ${kpisWithoutParents} missing parents) for job ${jobId}`);

    // Save results and mark as completed
    await supabase
      .from('kpi_generation_jobs')
      .update({
        status: 'completed',
        progress: 100,
        progress_message: 'Complete!',
        generated_kpis: validatedKpis,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    console.log(`Job ${jobId} completed successfully`);

  } catch (error: any) {
    console.error(`Job ${jobId} failed:`, error);
    
    await supabase
      .from('kpi_generation_jobs')
      .update({
        status: 'failed',
        progress: 0,
        progress_message: 'Failed',
        error_message: error.message || 'Unknown error occurred',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get user info
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get employee info
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, organization_id')
      .eq('user_id', user.id)
      .single();

    if (empError || !employee) {
      return new Response(
        JSON.stringify({ error: "Employee not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const config: JobConfig = await req.json();

    console.log("Creating KPI generation job for org:", employee.organization_id);

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('kpi_generation_jobs')
      .insert({
        organization_id: employee.organization_id,
        created_by: employee.id,
        status: 'pending',
        progress: 0,
        progress_message: 'Initializing...',
        config: config,
      })
      .select('id')
      .single();

    if (jobError || !job) {
      console.error("Failed to create job:", jobError);
      return new Response(
        JSON.stringify({ error: "Failed to create generation job" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Job created:", job.id);

    // Start background processing (non-blocking)
    EdgeRuntime.waitUntil(processKpiGeneration(job.id, config));

    // Return job ID immediately
    return new Response(
      JSON.stringify({ jobId: job.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error starting KPI generation:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
