/**
 * Generate Job Description Edge Function
 * Uses Lovable AI to generate comprehensive job descriptions based on role details
 * Supports both "generate" (new) and "improve" (existing) modes
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GenerateJDRequest {
  organization_id: string;
  title: string;
  department?: string;
  location?: string;
  office_country?: string;
  office_region?: string;
  work_model?: string;
  employment_type?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  salary_visible?: boolean;
  company_name?: string;
  industry?: string;
  company_size?: string;
  application_deadline?: string;
  // New fields for enhanced generation
  mode?: "generate" | "improve";
  existing_description?: string;
  seniority_level?: string;
}

// Detect seniority level from position title
function detectSeniorityLevel(title: string): string {
  const lowerTitle = title.toLowerCase();
  
  const seniorityPatterns: { pattern: RegExp; level: string }[] = [
    { pattern: /\b(chief|ceo|cfo|cto|coo|cmo|cio)\b/, level: "C-Level Executive" },
    { pattern: /\b(vp|vice president)\b/, level: "Vice President" },
    { pattern: /\b(director)\b/, level: "Director" },
    { pattern: /\b(head of|head)\b/, level: "Head/Director" },
    { pattern: /\b(principal|staff)\b/, level: "Principal/Staff" },
    { pattern: /\b(senior|sr\.?|lead)\b/, level: "Senior" },
    { pattern: /\b(manager|supervisor)\b/, level: "Manager" },
    { pattern: /\b(mid-level|mid level|intermediate)\b/, level: "Mid-Level" },
    { pattern: /\b(junior|jr\.?|associate)\b/, level: "Junior/Associate" },
    { pattern: /\b(intern|trainee|apprentice|graduate)\b/, level: "Entry-Level/Intern" },
  ];

  for (const { pattern, level } of seniorityPatterns) {
    if (pattern.test(lowerTitle)) {
      return level;
    }
  }
  
  return "Mid-Level"; // Default assumption
}

// Format work model for display
function formatWorkModel(workModel?: string): string {
  switch (workModel) {
    case 'remote': return 'Fully Remote';
    case 'hybrid': return 'Hybrid (Remote + Office)';
    case 'onsite': return 'On-site';
    default: return workModel || 'On-site';
  }
}

// Format employment type for display
function formatEmploymentType(type?: string): string {
  switch (type) {
    case 'full_time': return 'Full-time';
    case 'part_time': return 'Part-time';
    case 'contract': return 'Contract';
    case 'internship': return 'Internship';
    default: return type?.replace('_', ' ') || 'Full-time';
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: GenerateJDRequest = await req.json();
    const {
      title,
      department,
      location,
      office_country,
      office_region,
      work_model,
      employment_type,
      salary_min,
      salary_max,
      salary_currency,
      salary_visible,
      company_name,
      industry,
      company_size,
      application_deadline,
      mode = "generate",
      existing_description,
      seniority_level: providedSeniority,
    } = body;

    if (!title) {
      return new Response(
        JSON.stringify({ success: false, message: "Job title is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`${mode === "improve" ? "Improving" : "Generating"} job description for:`, title);

    // Detect seniority from title or use provided
    const seniorityLevel = providedSeniority || detectSeniorityLevel(title);
    const workModelText = formatWorkModel(work_model);
    const employmentText = formatEmploymentType(employment_type);
    
    // Build location context
    const locationParts = [location, office_country, office_region].filter(Boolean);
    const locationContext = locationParts.join(", ");
    
    // Build salary text only if visible
    let salaryText = "";
    if (salary_visible && salary_min && salary_max) {
      salaryText = `${salary_currency || 'USD'} ${salary_min.toLocaleString()} - ${salary_max.toLocaleString()} per year`;
    }

    // Build the enhanced system prompt
    const systemPrompt = `You are an expert HR professional and technical recruiter${industry ? ` specializing in the ${industry} industry` : ''}.
${mode === "improve" ? "Improve and enhance the provided job description while maintaining its core intent." : "Create a professional job description based ONLY on the information provided."}

STRICT RULES:
- Do NOT invent company-specific details, benefits, team names, or technologies not implied by the role
- Do NOT use generic filler phrases like "competitive salary", "great culture", or "dynamic team"
- Do NOT hallucinate any information not explicitly provided
- Do NOT mention benefits, perks, or company culture unless explicitly provided
- Keep experience requirements realistic for the ${seniorityLevel} level
- Use active voice and industry-appropriate terminology
- Maximum 700 words total
- Use professional, engaging language appropriate for ${industry || 'a professional'} industry`;

    // Build the user prompt based on mode
    let userPrompt = mode === "improve" 
      ? `Improve and enhance this existing job description while keeping its core purpose:\n\n${existing_description}\n\n---\n\nContext for improvement:`
      : `Generate a professional job description for:`;

    userPrompt += `
- Position: ${title}
- Seniority Level: ${seniorityLevel}`;

    if (industry) userPrompt += `\n- Industry: ${industry}`;
    if (department) userPrompt += `\n- Department: ${department}`;
    if (locationContext) userPrompt += `\n- Location: ${locationContext}`;
    userPrompt += `\n- Work Model: ${workModelText}`;
    userPrompt += `\n- Employment Type: ${employmentText}`;
    if (company_size) userPrompt += `\n- Company Size: ${company_size}`;
    if (salaryText) userPrompt += `\n- Compensation: ${salaryText}`;
    if (application_deadline) userPrompt += `\n- Application Deadline: ${application_deadline}`;

    userPrompt += `

${mode === "improve" ? "Improve the description following" : "Generate the following sections"} (maximum 700 words total):

## Position Overview
Start with a compelling 2-3 sentence description of the role's core purpose and its direct impact on business outcomes. Focus on what makes this position meaningful. (50-80 words)

## Duties & Responsibilities
Provide 6-8 bullet points of specific, actionable responsibilities appropriate for a ${seniorityLevel} position. Each should clearly describe what the person will do. (200-250 words)

## Qualifications & Requirements
- Education requirements appropriate for the role and ${seniorityLevel} level
- Years of experience expected for ${seniorityLevel} level
- Technical skills and competencies required
- Any certifications or specific knowledge areas
(100-120 words)

## Soft Skills & Mindset
4-5 qualities and characteristics that would make someone successful in this role. Be specific to the position type. (80-100 words)

## How to Apply
Brief instruction to submit application with CV/resume.${application_deadline ? ` Applications must be received by ${application_deadline}.` : ''} (30-50 words)

IMPORTANT: Use Markdown formatting with ## headers. Do NOT invent any information not provided above.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      // Fallback to template if AI is not configured
      const fallbackJD = generateFallbackJD(title, department, locationContext, workModelText, employmentText, seniorityLevel, application_deadline);
      return new Response(
        JSON.stringify({ success: true, description: fallbackJD }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, message: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, message: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Fallback to template
      const fallbackJD = generateFallbackJD(title, department, locationContext, workModelText, employmentText, seniorityLevel, application_deadline);
      return new Response(
        JSON.stringify({ success: true, description: fallbackJD }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const generatedDescription = aiData.choices?.[0]?.message?.content || 
      generateFallbackJD(title, department, locationContext, workModelText, employmentText, seniorityLevel, application_deadline);

    console.log(`Job description ${mode === "improve" ? "improved" : "generated"} successfully`);

    return new Response(
      JSON.stringify({ success: true, description: generatedDescription }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error generating job description:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

function generateFallbackJD(
  title: string,
  department?: string,
  location?: string,
  workModel?: string,
  employmentType?: string,
  seniorityLevel?: string,
  applicationDeadline?: string
): string {
  const deptText = department ? ` in our ${department} team` : '';
  const locationText = location ? ` based in ${location}` : '';
  const deadlineText = applicationDeadline ? ` Applications must be received by ${applicationDeadline}.` : '';
  
  return `## Position Overview

We are seeking a talented ${title} to join our organization${deptText}. This is a ${employmentType} ${workModel} position${locationText}. As a ${seniorityLevel || 'mid-level'} role, you will play a key part in driving our mission forward.

## Duties & Responsibilities

- Lead and execute key initiatives within your domain of expertise
- Collaborate with cross-functional teams to deliver exceptional results
- Identify opportunities for improvement and implement innovative solutions
- Mentor team members and contribute to a positive team culture
- Communicate progress and insights to stakeholders effectively
- Stay current with industry trends and best practices

## Qualifications & Requirements

- Proven experience in a similar ${title} role
- Strong analytical and problem-solving skills
- Excellent written and verbal communication abilities
- Ability to work independently and as part of a team
- Track record of delivering results in a professional environment

## Soft Skills & Mindset

- Growth mindset with eagerness to learn and adapt
- Strong attention to detail and quality
- Collaborative approach to problem-solving
- Proactive communication style
- Resilience and ability to handle ambiguity

## How to Apply

Submit your application with an updated CV/resume through our application portal.${deadlineText}`;
}

serve(handler);
