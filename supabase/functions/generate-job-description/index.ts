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

REQUIRED OUTPUT FORMAT - Use HTML tags exactly as shown:

<h3>Position Overview</h3>
<p>Start with a compelling 2-3 sentence description of the role's core purpose and its direct impact on business outcomes. Focus on what makes this position meaningful. (50-80 words)</p>

<h3>Duties & Responsibilities</h3>
<ul>
<li>Provide 6-8 bullet points of specific, actionable responsibilities appropriate for a ${seniorityLevel} position.</li>
<li>Each should clearly describe what the person will do.</li>
</ul>
(200-250 words total for this section)

<h3>Qualifications & Requirements</h3>
<ul>
<li>Education requirements appropriate for the role and ${seniorityLevel} level</li>
<li>Years of experience expected for ${seniorityLevel} level</li>
<li>Technical skills and competencies required</li>
<li>Any certifications or specific knowledge areas</li>
</ul>
(100-120 words)

<h3>Soft Skills & Mindset</h3>
<ul>
<li><strong>Quality Name:</strong> Description of the quality (use bold for the quality name)</li>
</ul>
4-5 qualities that would make someone successful. Be specific to the position type. (80-100 words)

<h3>How to Apply</h3>
<p>Brief instruction to submit application with CV/resume.${application_deadline ? ` Applications must be received by <strong>${application_deadline}</strong>.` : ''} (30-50 words)</p>

CRITICAL: Output ONLY valid HTML. Use <h3> for headings, <ul><li> for lists, <p> for paragraphs, <strong> for bold text. Do NOT use markdown (##, *, **). Do NOT invent any information not provided above.`;

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
    let generatedDescription = aiData.choices?.[0]?.message?.content || 
      generateFallbackJD(title, department, locationContext, workModelText, employmentText, seniorityLevel, application_deadline);

    // Convert markdown to HTML if the AI returned markdown format
    if (generatedDescription.includes('## ') || generatedDescription.includes('### ')) {
      generatedDescription = markdownToHtml(generatedDescription);
    }

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

// Convert markdown to HTML if AI returns markdown format
function markdownToHtml(text: string): string {
  let html = text;
  
  // Convert ## headers to <h3>
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  
  // Convert **bold** to <strong>
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Convert *italic* to <em>
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  
  // Convert bullet points - handle both * and - style
  const lines = html.split('\n');
  const result: string[] = [];
  let inList = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const bulletMatch = line.match(/^[\*\-]\s+(.+)$/);
    
    if (bulletMatch) {
      if (!inList) {
        result.push('<ul>');
        inList = true;
      }
      result.push(`<li>${bulletMatch[1]}</li>`);
    } else {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      // Wrap plain text paragraphs in <p> tags if not already HTML
      if (line.trim() && !line.trim().startsWith('<') && !line.trim().match(/^<\/(h3|ul|li|p)>/)) {
        result.push(`<p>${line}</p>`);
      } else {
        result.push(line);
      }
    }
  }
  
  if (inList) {
    result.push('</ul>');
  }
  
  // Clean up empty paragraphs and extra whitespace
  return result.join('\n')
    .replace(/<p>\s*<\/p>/g, '')
    .replace(/<p><h3>/g, '<h3>')
    .replace(/<\/h3><\/p>/g, '</h3>')
    .replace(/\n{3,}/g, '\n\n');
}

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
  const deadlineText = applicationDeadline ? ` Applications must be received by <strong>${applicationDeadline}</strong>.` : '';
  
  return `<h3>Position Overview</h3>
<p>We are seeking a talented ${title} to join our organization${deptText}. This is a ${employmentType} ${workModel} position${locationText}. As a ${seniorityLevel || 'mid-level'} role, you will play a key part in driving our mission forward.</p>

<h3>Duties & Responsibilities</h3>
<ul>
<li>Lead and execute key initiatives within your domain of expertise</li>
<li>Collaborate with cross-functional teams to deliver exceptional results</li>
<li>Identify opportunities for improvement and implement innovative solutions</li>
<li>Mentor team members and contribute to a positive team culture</li>
<li>Communicate progress and insights to stakeholders effectively</li>
<li>Stay current with industry trends and best practices</li>
</ul>

<h3>Qualifications & Requirements</h3>
<ul>
<li>Proven experience in a similar ${title} role</li>
<li>Strong analytical and problem-solving skills</li>
<li>Excellent written and verbal communication abilities</li>
<li>Ability to work independently and as part of a team</li>
<li>Track record of delivering results in a professional environment</li>
</ul>

<h3>Soft Skills & Mindset</h3>
<ul>
<li><strong>Growth Mindset:</strong> Eagerness to learn and adapt</li>
<li><strong>Attention to Detail:</strong> Strong focus on quality</li>
<li><strong>Collaboration:</strong> Team-oriented approach to problem-solving</li>
<li><strong>Communication:</strong> Proactive and clear communication style</li>
<li><strong>Resilience:</strong> Ability to handle ambiguity and change</li>
</ul>

<h3>How to Apply</h3>
<p>Submit your application with an updated CV/resume through our application portal.${deadlineText}</p>`;
}

serve(handler);
