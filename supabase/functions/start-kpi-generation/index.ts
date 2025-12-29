/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Track current job ID for graceful shutdown
let currentProcessingJobId: string | null = null;

// Graceful shutdown handler - mark interrupted jobs as failed
addEventListener('beforeunload', async () => {
  if (currentProcessingJobId) {
    console.log('Edge function shutting down, marking job as interrupted:', currentProcessingJobId);
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await supabase
        .from('kpi_generation_jobs')
        .update({
          status: 'failed',
          error_message: 'Processing interrupted - please retry',
          completed_at: new Date().toISOString()
        })
        .eq('id', currentProcessingJobId)
        .eq('status', 'processing'); // Only update if still processing
    } catch (err) {
      console.error('Failed to mark job as interrupted:', err);
    }
  }
});

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
    progress_message: message,
    last_heartbeat: new Date().toISOString(), // Update heartbeat on every progress update
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

// Helper function to chunk array into batches
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Constants for batching - increased to reduce total batches
const INDIVIDUAL_BATCH_SIZE = 15;
const AI_CALL_TIMEOUT_MS = 30000; // 30 second timeout per AI call
const PARALLEL_BATCH_COUNT = 2; // Process 2 batches in parallel

// Parse AI response and handle truncation
function parseAiResponse(content: string): GeneratedKpi[] {
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

  try {
    const parsed = JSON.parse(cleanedContent);
    return parsed.kpis || [];
  } catch (parseError) {
    console.error("Failed to parse AI response, attempting salvage...");
    
    // Check if response was truncated
    const isTruncated = !cleanedContent.endsWith('}') && !cleanedContent.endsWith(']');
    
    if (isTruncated) {
      const lastKpiEnd = cleanedContent.lastIndexOf('},');
      const lastArrayEnd = cleanedContent.lastIndexOf('}]');
      
      if (lastKpiEnd > 0 || lastArrayEnd > 0) {
        const salvagePoint = Math.max(lastKpiEnd, lastArrayEnd);
        let salvaged = cleanedContent.substring(0, salvagePoint + 1);
        
        if (!salvaged.endsWith(']}')) {
          if (salvaged.endsWith('},')) {
            salvaged = salvaged.slice(0, -1) + ']}';
          } else if (salvaged.endsWith('}')) {
            salvaged += ']}';
          }
        }
        
        try {
          const parsed = JSON.parse(salvaged);
          console.log(`Salvaged ${parsed.kpis?.length || 0} KPIs from truncated response`);
          return parsed.kpis || [];
        } catch {
          throw new Error("AI response was truncated and could not be recovered.");
        }
      }
    }
    throw new Error("Invalid response format from AI.");
  }
}

// Call AI Gateway with timeout handling
async function callAiGateway(systemPrompt: string, userPrompt: string, maxTokens: number = 6000): Promise<GeneratedKpi[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_CALL_TIMEOUT_MS);

  try {
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
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

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

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    return parseAiResponse(content);
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error("AI call timed out after", AI_CALL_TIMEOUT_MS, "ms");
      throw new Error("AI request timed out. Continuing with partial results.");
    }
    throw error;
  }
}

async function processKpiGeneration(jobId: string, config: JobConfig) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Track current job for graceful shutdown
  currentProcessingJobId = jobId;
  
  try {
    // Update status to processing
    await updateJobProgress(supabase, jobId, 5, "Preparing organization context...", "processing");
    
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

    await updateJobProgress(supabase, jobId, 10, "Preparing AI prompts...");

    // Build base system prompt components
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

    // ==========================================
    // PHASE 1: Generate Group KPIs (Org, Dept, Project, Office)
    // ==========================================
    
    let groupKpis: GeneratedKpi[] = [];
    
    const needsGroupKpis = cascadeConfig.includeOrganization || 
                           cascadeConfig.includeDepartments || 
                           cascadeConfig.includeProjects || 
                           cascadeConfig.includeOffices;
    
    if (needsGroupKpis) {
      await updateJobProgress(supabase, jobId, 15, "Generating organization & group KPIs...");
      
      const groupSystemPrompt = `You are an expert HR consultant specializing in strategic KPI design and OKR frameworks.
Your task is to generate hierarchical GROUP-LEVEL KPIs (organization, department, project, office - NOT individual KPIs).

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
4. Use appropriate units (%, count, $, rating, etc.)
5. Set realistic target values based on industry standards

CRITICAL HIERARCHY RULES:
- Organization KPIs have NO parentTempId (they are the root)
- Department KPIs MUST have parentTempId pointing to an organization KPI's tempId
- Office KPIs MUST have parentTempId pointing to an organization KPI's tempId  
- Project KPIs MUST have parentTempId pointing to an organization or department KPI's tempId
${quarterlyBreakdownInstructions}
CRITICAL: Respond with ONLY valid JSON, no markdown, no explanation:
{
  "kpis": [
    { "tempId": "org-1", "scopeType": "organization", "title": "...", "description": "...", "targetValue": 100, "unit": "%" },
    { "tempId": "dept-eng-1", "scopeType": "department", "scopeValue": "Engineering", "title": "...", "description": "...", "targetValue": 50, "unit": "count", "parentTempId": "org-1" }
  ]
}`;

      let groupUserPrompt = `Generate GROUP-LEVEL KPIs for ${organizationContext.name} for ${periodLabel}.

${aiInstructions ? `IMPORTANT - User Instructions:
${aiInstructions}

` : ''}${documentContent ? `Reference Document Content:
---
${documentContent.slice(0, 4000)}
---

` : ''}Organization Structure:
- Departments: ${(activeDepartments as string[]).join(', ') || 'N/A'}
- Offices: ${activeOffices.map((o: any) => o.name).join(', ') || 'N/A'}
- Projects: ${activeProjects.map((p: any) => p.name).join(', ') || 'N/A'}

Generate KPIs with this cascade:`;

      if (cascadeConfig.includeOrganization) {
        groupUserPrompt += `\n- 2-3 Organization-level strategic KPIs for ${periodLabel}`;
      }
      if (cascadeConfig.includeDepartments && activeDepartments.length > 0) {
        groupUserPrompt += `\n- 2-3 KPIs per department: ${(activeDepartments as string[]).join(', ')}`;
      }
      if (cascadeConfig.includeProjects && activeProjects.length > 0) {
        groupUserPrompt += `\n- 2-3 KPIs per project:`;
        activeProjects.forEach(p => {
          const projectTeam = projectEmployeeMap[p.name] || [];
          groupUserPrompt += `\n  • ${p.name} (ID: ${p.id}) - Team: ${projectTeam.length} members`;
          if (p.description) {
            groupUserPrompt += `\n    Focus: ${p.description.slice(0, 100)}`;
          }
        });
      }
      if (cascadeConfig.includeOffices && activeOffices.length > 0) {
        groupUserPrompt += `\n- 1-2 KPIs per office: ${activeOffices.map((o: any) => o.name).join(', ')}`;
      }

      groupUserPrompt += `\n\nCRITICAL: Every department/office/project KPI MUST have parentTempId referencing an organization KPI.
${quarterlyBreakdown && periodType === "annual" ? 'Generate quarterly breakdowns (Q1-Q4) for each annual KPI.' : ''}
Respond with ONLY the JSON object.`;

      console.log("Phase 1: Generating group KPIs...");
      groupKpis = await callAiGateway(groupSystemPrompt, groupUserPrompt, 12000);
      console.log(`Phase 1 complete: Generated ${groupKpis.length} group KPIs`);
    }

    // ==========================================
    // PHASE 2: Generate Individual KPIs in Batches
    // ==========================================
    
    let individualKpis: GeneratedKpi[] = [];
    
    if (cascadeConfig.includeIndividuals && filteredEmployees.length > 0) {
      await updateJobProgress(supabase, jobId, 35, `Generating individual KPIs for ${filteredEmployees.length} employees...`);
      
      // Build lookup maps from group KPIs for parent referencing
      const orgKpis = groupKpis.filter(k => k.scopeType === 'organization' && !k.isQuarterlyChild);
      const deptKpis = groupKpis.filter(k => k.scopeType === 'department' && !k.isQuarterlyChild);
      const projectKpis = groupKpis.filter(k => k.scopeType === 'project' && !k.isQuarterlyChild);
      const officeKpis = groupKpis.filter(k => k.scopeType === 'office' && !k.isQuarterlyChild);
      
      const deptKpiMap = new Map<string, { tempId: string; title: string }>();
      deptKpis.forEach(k => {
        if (k.scopeValue) deptKpiMap.set(k.scopeValue.toLowerCase(), { tempId: k.tempId, title: k.title });
      });
      
      const projectKpiMap = new Map<string, { tempId: string; title: string }>();
      projectKpis.forEach(k => {
        if (k.projectId) projectKpiMap.set(k.projectId, { tempId: k.tempId, title: k.title });
        if (k.projectName) projectKpiMap.set(k.projectName.toLowerCase(), { tempId: k.tempId, title: k.title });
      });
      
      const officeKpiMap = new Map<string, { tempId: string; title: string }>();
      officeKpis.forEach(k => {
        if (k.scopeId) officeKpiMap.set(k.scopeId, { tempId: k.tempId, title: k.title });
        if (k.scopeValue) officeKpiMap.set(k.scopeValue.toLowerCase(), { tempId: k.tempId, title: k.title });
      });
      
      const defaultParentTempId = orgKpis[0]?.tempId || 'org-default';
      
      // Build parent reference summary for AI
      const parentKpiSummary = [
        ...orgKpis.map(k => `Organization: "${k.title}" (tempId: ${k.tempId})`),
        ...deptKpis.map(k => `Department ${k.scopeValue}: "${k.title}" (tempId: ${k.tempId})`),
        ...projectKpis.map(k => `Project ${k.projectName}: "${k.title}" (tempId: ${k.tempId})`),
        ...officeKpis.map(k => `Office ${k.scopeValue}: "${k.title}" (tempId: ${k.tempId})`),
      ].slice(0, 30).join('\n');
      
      // Chunk employees into batches
      const employeeBatches = chunkArray(filteredEmployees, INDIVIDUAL_BATCH_SIZE);
      const totalBatches = employeeBatches.length;
      
      console.log(`Phase 2: Generating individual KPIs in ${totalBatches} batches of up to ${INDIVIDUAL_BATCH_SIZE} employees each (parallel: ${PARALLEL_BATCH_COUNT})`);
      
      // Process batches in parallel groups
      for (let parallelIndex = 0; parallelIndex < totalBatches; parallelIndex += PARALLEL_BATCH_COUNT) {
        const parallelBatches = employeeBatches.slice(parallelIndex, parallelIndex + PARALLEL_BATCH_COUNT);
        const batchProgress = 35 + Math.round(((parallelIndex + parallelBatches.length) / totalBatches) * 45);
        
        await updateJobProgress(supabase, jobId, batchProgress, 
          `Generating individual KPIs (batch ${parallelIndex + 1}-${Math.min(parallelIndex + PARALLEL_BATCH_COUNT, totalBatches)} of ${totalBatches})...`);
        
        // Create promises for parallel execution
        const batchPromises = parallelBatches.map(async (batch, subIndex) => {
          const actualBatchIndex = parallelIndex + subIndex;
          
          const individualSystemPrompt = `You are an expert HR consultant. Generate INDIVIDUAL employee KPIs that link to existing group KPIs.

ORGANIZATION: ${organizationContext.name}
PERIOD: ${periodLabel}
INDUSTRY: ${organizationContext.industry || "General Business"}

EXISTING PARENT KPIs (use these tempIds for parentTempId):
${parentKpiSummary}

Guidelines:
1. Generate 2 SMART individual KPIs per employee
2. Each individual KPI MUST have parentTempId linking to a relevant department/project/office KPI
3. If employee is in a project, prefer linking to that project's KPI
4. Otherwise link to their department or office KPI
5. For NEW employees (<6 months), focus on onboarding, learning
6. For VETERAN employees (>3 years), include leadership, mentoring
7. Use the employee's position to create role-aligned KPIs

CRITICAL: Respond with ONLY valid JSON:
{
  "kpis": [
    { "tempId": "ind-uuid-1", "scopeType": "individual", "employeeId": "uuid", "employeeName": "Name", "title": "...", "description": "...", "targetValue": 10, "unit": "count", "parentTempId": "dept-eng-1" }
  ]
}`;

          let batchUserPrompt = `Generate individual KPIs for these ${batch.length} employees:

`;
          batch.forEach((e: any) => {
            const empProjects = employeeProjects
              .filter((ep: any) => ep.employee_id === e.id)
              .map((ep: any) => activeProjects.find((p: any) => p.id === ep.project_id))
              .filter(Boolean);
            
            const projectInfo = empProjects.length > 0 
              ? `Projects: ${empProjects.map((p: any) => `${p.name} (ID: ${p.id})`).join(', ')}`
              : 'No projects';
            
            // Find best parent KPI for hint
            let suggestedParent = defaultParentTempId;
            if (empProjects.length > 0) {
              const projKpi = projectKpiMap.get(empProjects[0].id);
              if (projKpi) suggestedParent = projKpi.tempId;
            } else if (e.department && deptKpiMap.has(e.department.toLowerCase())) {
              suggestedParent = deptKpiMap.get(e.department.toLowerCase())!.tempId;
            } else if (e.officeId && officeKpiMap.has(e.officeId)) {
              suggestedParent = officeKpiMap.get(e.officeId)!.tempId;
            }
            
            const tenureNote = e.tenure === "new" 
              ? " [NEW - focus on learning/onboarding]"
              : e.tenure === "veteran"
              ? " [VETERAN - include leadership/mentoring]"
              : "";
            
            batchUserPrompt += `• ${e.name} (ID: ${e.id})
  Position: ${e.position}, Department: ${e.department}
  ${projectInfo}${tenureNote}
  Suggested parentTempId: ${suggestedParent}
`;
            if (e.positionResponsibilities?.length > 0) {
              batchUserPrompt += `  Key responsibilities: ${e.positionResponsibilities.slice(0, 2).join('; ')}\n`;
            }
            batchUserPrompt += '\n';
          });

          batchUserPrompt += `Generate 2 individual KPIs per employee. Each KPI MUST have a valid parentTempId.
Respond with ONLY the JSON object.`;

          try {
            const batchKpis = await callAiGateway(individualSystemPrompt, batchUserPrompt, 5000);
            console.log(`Batch ${actualBatchIndex + 1}/${totalBatches}: Generated ${batchKpis.length} individual KPIs`);
            return batchKpis;
          } catch (error) {
            console.error(`Batch ${actualBatchIndex + 1} failed:`, error);
            return []; // Return empty on failure, continue with other batches
          }
        });
        
        // Wait for parallel batches to complete
        const parallelResults = await Promise.all(batchPromises);
        parallelResults.forEach(kpis => individualKpis.push(...kpis));
      }
      
      console.log(`Phase 2 complete: Generated ${individualKpis.length} individual KPIs for ${filteredEmployees.length} employees`);
    }

    await updateJobProgress(supabase, jobId, 85, "Validating and linking KPIs...");

    // ==========================================
    // PHASE 3: Combine and Validate All KPIs
    // ==========================================
    
    let allKpis = [...groupKpis, ...individualKpis];
    
    // Validate and add missing fields
    let validatedKpis = allKpis.map((kpi, index) => ({
      ...kpi,
      tempId: kpi.tempId || `kpi-${Date.now()}-${index}`,
      targetValue: typeof kpi.targetValue === 'number' ? kpi.targetValue : parseFloat(kpi.targetValue) || 100,
    }));
    
    // ==========================================
    // POST-PROCESS: Resolve Project IDs from Titles/Names
    // ==========================================
    // AI sometimes generates project KPIs without proper projectId - resolve from project name in title
    validatedKpis = validatedKpis.map(kpi => {
      if (kpi.scopeType === 'project' && !kpi.projectId) {
        // Try to extract project from scopeValue, projectName, or title
        const searchTerms = [
          kpi.scopeValue?.toLowerCase(),
          kpi.projectName?.toLowerCase(),
          kpi.title?.toLowerCase(),
        ].filter(Boolean);
        
        for (const term of searchTerms) {
          const matchedProject = activeProjects.find(p => 
            term?.includes(p.name.toLowerCase()) ||
            p.name.toLowerCase().includes(term || '')
          );
          
          if (matchedProject) {
            console.log(`Resolved project ID for "${kpi.title}": ${matchedProject.name} (${matchedProject.id})`);
            return {
              ...kpi,
              projectId: matchedProject.id,
              projectName: matchedProject.name,
              scopeId: matchedProject.id,
              scopeValue: matchedProject.name,
            };
          }
        }
        
        // If still no match and we have projects, assign to first relevant project
        if (activeProjects.length > 0) {
          console.warn(`Could not resolve project for KPI "${kpi.title}", assigning to first available project`);
          const fallbackProject = activeProjects[0];
          return {
            ...kpi,
            projectId: fallbackProject.id,
            projectName: fallbackProject.name,
            scopeId: fallbackProject.id,
            scopeValue: fallbackProject.name,
          };
        }
      }
      return kpi;
    });

    // Post-process: Fix parent relationships
    const orgKpis = validatedKpis.filter(k => k.scopeType === 'organization' && !k.isQuarterlyChild);
    const deptKpis = validatedKpis.filter(k => k.scopeType === 'department' && !k.isQuarterlyChild);
    const officeKpis = validatedKpis.filter(k => k.scopeType === 'office' && !k.isQuarterlyChild);
    const projectKpis = validatedKpis.filter(k => k.scopeType === 'project' && !k.isQuarterlyChild);
    
    // Quarterly versions
    const deptKpisQuarterly = validatedKpis.filter(k => k.scopeType === 'department' && k.isQuarterlyChild);
    const officeKpisQuarterly = validatedKpis.filter(k => k.scopeType === 'office' && k.isQuarterlyChild);
    const projectKpisQuarterly = validatedKpis.filter(k => k.scopeType === 'project' && k.isQuarterlyChild);
    
    // Create lookup maps
    const deptKpiMap = new Map<string, string>();
    deptKpis.forEach(k => {
      if (k.scopeValue) deptKpiMap.set(k.scopeValue.toLowerCase(), k.tempId);
    });
    
    const deptKpiQuarterlyMap = new Map<string, string>();
    deptKpisQuarterly.forEach(k => {
      if (k.scopeValue && k.quarter) {
        deptKpiQuarterlyMap.set(`${k.scopeValue.toLowerCase()}|${k.quarter}`, k.tempId);
      }
    });
    
    const officeKpiMap = new Map<string, string>();
    officeKpis.forEach(k => {
      if (k.scopeValue) officeKpiMap.set(k.scopeValue.toLowerCase(), k.tempId);
      if (k.scopeId) officeKpiMap.set(k.scopeId, k.tempId);
    });
    
    const officeKpiQuarterlyMap = new Map<string, string>();
    officeKpisQuarterly.forEach(k => {
      if (k.quarter) {
        if (k.scopeValue) officeKpiQuarterlyMap.set(`${k.scopeValue.toLowerCase()}|${k.quarter}`, k.tempId);
        if (k.scopeId) officeKpiQuarterlyMap.set(`${k.scopeId}|${k.quarter}`, k.tempId);
      }
    });
    
    const projectKpiMap = new Map<string, string>();
    projectKpis.forEach(k => {
      if (k.projectId) projectKpiMap.set(k.projectId, k.tempId);
      if (k.projectName) projectKpiMap.set(k.projectName.toLowerCase(), k.tempId);
    });
    
    const projectKpiQuarterlyMap = new Map<string, string>();
    projectKpisQuarterly.forEach(k => {
      if (k.quarter) {
        if (k.projectId) projectKpiQuarterlyMap.set(`${k.projectId}|${k.quarter}`, k.tempId);
        if (k.projectName) projectKpiQuarterlyMap.set(`${k.projectName.toLowerCase()}|${k.quarter}`, k.tempId);
      }
    });
    
    const defaultOrgKpiTempId = orgKpis[0]?.tempId;
    
    // First pass: Auto-assign quarterly children to their annual parents
    validatedKpis = validatedKpis.map(kpi => {
      if (kpi.isQuarterlyChild && !kpi.parentTempId) {
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
          return { ...kpi, parentTempId: annualParent.tempId };
        }
      }
      return kpi;
    });
    
    // Second pass: Auto-assign hierarchy parents
    validatedKpis = validatedKpis.map(kpi => {
      if (kpi.scopeType === 'organization' && !kpi.isQuarterlyChild) {
        return { ...kpi, parentTempId: undefined };
      }
      
      if (kpi.parentTempId && validatedKpis.some(k => k.tempId === kpi.parentTempId)) {
        return kpi;
      }
      
      if (kpi.isQuarterlyChild) {
        return kpi;
      }
      
      let assignedParent: string | undefined;
      
      if (kpi.scopeType === 'department' || kpi.scopeType === 'office' || kpi.scopeType === 'project') {
        assignedParent = defaultOrgKpiTempId;
      } else if (kpi.scopeType === 'individual') {
        const employee = filteredEmployees.find((e: any) => e.id === kpi.employeeId);
        const kpiQuarter = kpi.quarter;
        
        if (employee) {
          const empProjects = employeeProjects
            .filter((ep: any) => ep.employee_id === kpi.employeeId)
            .map((ep: any) => ep.project_id);
          
          for (const projId of empProjects) {
            if (kpiQuarter && projectKpiQuarterlyMap.has(`${projId}|${kpiQuarter}`)) {
              assignedParent = projectKpiQuarterlyMap.get(`${projId}|${kpiQuarter}`);
              break;
            }
            if (projectKpiMap.has(projId)) {
              assignedParent = projectKpiMap.get(projId);
              break;
            }
          }
          
          if (!assignedParent && employee.department) {
            const deptKey = employee.department.toLowerCase();
            if (kpiQuarter && deptKpiQuarterlyMap.has(`${deptKey}|${kpiQuarter}`)) {
              assignedParent = deptKpiQuarterlyMap.get(`${deptKey}|${kpiQuarter}`);
            } else if (deptKpiMap.has(deptKey)) {
              assignedParent = deptKpiMap.get(deptKey);
            }
          }
          
          if (!assignedParent && employee.officeId) {
            if (kpiQuarter && officeKpiQuarterlyMap.has(`${employee.officeId}|${kpiQuarter}`)) {
              assignedParent = officeKpiQuarterlyMap.get(`${employee.officeId}|${kpiQuarter}`);
            } else if (officeKpiMap.has(employee.officeId)) {
              assignedParent = officeKpiMap.get(employee.officeId);
            }
          }
        }
        
        if (!assignedParent) {
          assignedParent = defaultOrgKpiTempId;
        }
      }
      
      if (assignedParent && !kpi.parentTempId) {
        console.log(`Auto-assigned parent ${assignedParent} to ${kpi.scopeType} KPI: ${kpi.title}`);
      }
      
      return { ...kpi, parentTempId: kpi.parentTempId || assignedParent };
    });

    // ==========================================
    // PHASE 4: Check for Missing Employees and Generate Additional KPIs
    // ==========================================
    
    if (cascadeConfig.includeIndividuals) {
      const employeesWithKpis = new Set(
        validatedKpis
          .filter(k => k.scopeType === 'individual')
          .map(k => k.employeeId)
      );
      
      const missingEmployees = filteredEmployees.filter((e: any) => !employeesWithKpis.has(e.id));
      
      if (missingEmployees.length > 0) {
        console.log(`Found ${missingEmployees.length} employees still missing KPIs, generating additional batch...`);
        await updateJobProgress(supabase, jobId, 90, `Generating KPIs for ${missingEmployees.length} remaining employees...`);
        
        // Build parent summary again
        const parentKpiSummary = [
          ...orgKpis.map(k => `Organization: "${k.title}" (tempId: ${k.tempId})`),
          ...deptKpis.map(k => `Department ${k.scopeValue}: "${k.title}" (tempId: ${k.tempId})`),
          ...projectKpis.map(k => `Project ${k.projectName}: "${k.title}" (tempId: ${k.tempId})`),
          ...officeKpis.map(k => `Office ${k.scopeValue}: "${k.title}" (tempId: ${k.tempId})`),
        ].slice(0, 20).join('\n');
        
        const fallbackSystemPrompt = `Generate INDIVIDUAL employee KPIs for ${organizationContext.name}.

EXISTING PARENT KPIs:
${parentKpiSummary}

Generate 2 KPIs per employee with parentTempId linking to appropriate parent.
Respond with ONLY valid JSON: { "kpis": [...] }`;

        let fallbackUserPrompt = `Generate KPIs for these employees:\n\n`;
        missingEmployees.forEach((e: any) => {
          const deptParent = deptKpiMap.get(e.department?.toLowerCase());
          fallbackUserPrompt += `• ${e.name} (ID: ${e.id}, ${e.position}, ${e.department}) - use parentTempId: ${deptParent || defaultOrgKpiTempId}\n`;
        });
        
        try {
          const additionalKpis = await callAiGateway(fallbackSystemPrompt, fallbackUserPrompt, 6000);
          console.log(`Generated ${additionalKpis.length} additional KPIs for missing employees`);
          
          // Add to validated KPIs
          additionalKpis.forEach((kpi, index) => {
            validatedKpis.push({
              ...kpi,
              tempId: kpi.tempId || `kpi-fallback-${Date.now()}-${index}`,
              targetValue: typeof kpi.targetValue === 'number' ? kpi.targetValue : parseFloat(kpi.targetValue) || 100,
              parentTempId: kpi.parentTempId || defaultOrgKpiTempId,
            });
          });
        } catch (error) {
          console.error("Failed to generate fallback KPIs:", error);
        }
      }
    }

    const kpisWithParents = validatedKpis.filter(k => k.parentTempId).length;
    const kpisWithoutParents = validatedKpis.filter(k => !k.parentTempId && k.scopeType !== 'organization').length;
    const individualKpisCount = validatedKpis.filter(k => k.scopeType === 'individual').length;
    
    console.log(`Generated ${validatedKpis.length} total KPIs (${individualKpisCount} individual, ${kpisWithParents} with parents, ${kpisWithoutParents} missing parents) for job ${jobId}`);

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
    
    // Clear current job tracking
    currentProcessingJobId = null;

  } catch (error: any) {
    console.error(`Job ${jobId} failed:`, error);
    
    // Clear current job tracking
    currentProcessingJobId = null;
    
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
