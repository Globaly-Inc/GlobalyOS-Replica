/**
 * Generate Job Description Edge Function
 * Uses Lovable AI to generate job descriptions based on role details
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
  work_model?: string;
  employment_type?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  company_name?: string;
  industry?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userSupabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: GenerateJDRequest = await req.json();
    const {
      title,
      department,
      location,
      work_model,
      employment_type,
      salary_min,
      salary_max,
      salary_currency,
      company_name,
    } = body;

    if (!title) {
      return new Response(
        JSON.stringify({ success: false, message: "Job title is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generating job description for:", title);

    // Build context for the AI
    const workModelText = work_model === 'remote' ? 'fully remote' : 
                          work_model === 'hybrid' ? 'hybrid (remote + office)' : 'on-site';
    
    const employmentText = employment_type?.replace('_', '-') || 'full-time';
    
    const salaryText = salary_min && salary_max 
      ? `${salary_currency || 'USD'} ${salary_min.toLocaleString()} - ${salary_max.toLocaleString()} per year`
      : salary_min 
        ? `Starting at ${salary_currency || 'USD'} ${salary_min.toLocaleString()}`
        : '';

    const prompt = `Generate a professional job description for the following position. Use Markdown formatting with headers (##).

**Position Details:**
- Job Title: ${title}
${department ? `- Department: ${department}` : ''}
${location ? `- Location: ${location}` : ''}
- Work Model: ${workModelText}
- Employment Type: ${employmentText}
${salaryText ? `- Compensation: ${salaryText}` : ''}
${company_name ? `- Company: ${company_name}` : ''}

**Requirements:**
1. Start with a compelling 2-3 sentence overview of the role
2. Include sections for: Responsibilities (5-7 bullet points), Requirements (5-6 bullet points), Nice to Have (3-4 bullet points), and What We Offer (4-5 bullet points)
3. Use professional but engaging language
4. Be specific to the role type (technical roles should mention relevant skills, management roles should mention leadership)
5. Keep the total length around 400-500 words
6. Do NOT include the job title as a heading - start directly with the overview

Generate the job description now:`;

    // Use Lovable AI
    const lovableAIUrl = Deno.env.get("LOVABLE_AI_URL") || "https://ai.lovable.dev/api/v1/chat";
    const lovableAIKey = Deno.env.get("LOVABLE_AI_API_KEY");

    if (!lovableAIKey) {
      // Fallback to a good template if AI is not configured
      const fallbackJD = generateFallbackJD(title, department, location, workModelText, employmentText, salaryText);
      return new Response(
        JSON.stringify({ success: true, description: fallbackJD }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await fetch(lovableAIUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableAIKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an expert HR professional and technical recruiter. You write compelling, professional job descriptions that attract top talent. Your descriptions are specific, actionable, and avoid generic corporate jargon.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI API error:", await aiResponse.text());
      // Fallback to template
      const fallbackJD = generateFallbackJD(title, department, location, workModelText, employmentText, salaryText);
      return new Response(
        JSON.stringify({ success: true, description: fallbackJD }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const generatedDescription = aiData.choices?.[0]?.message?.content || 
                                  generateFallbackJD(title, department, location, workModelText, employmentText, salaryText);

    console.log("Job description generated successfully");

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
  salary?: string
): string {
  const deptText = department ? ` in our ${department} team` : '';
  const locationText = location ? ` based in ${location}` : '';
  
  return `We are seeking a talented and motivated ${title} to join our growing organization${deptText}. This is a ${employmentType} ${workModel} position${locationText}.

## About the Role

As a ${title}, you will play a key role in driving our mission forward. You'll work with a dynamic team of professionals who are passionate about making an impact.

## Responsibilities

- Lead and execute key initiatives within your domain
- Collaborate with cross-functional teams to deliver exceptional results
- Identify opportunities for improvement and implement innovative solutions
- Mentor team members and contribute to a positive team culture
- Communicate progress and insights to stakeholders
- Stay current with industry trends and best practices

## Requirements

- Proven experience in a similar role
- Strong analytical and problem-solving skills
- Excellent written and verbal communication abilities
- Ability to work independently and as part of a team
- Track record of delivering results in a fast-paced environment

## Nice to Have

- Experience in a startup or high-growth environment
- Industry-specific certifications or training
- Familiarity with relevant tools and technologies
- Leadership or mentoring experience

## What We Offer

- Competitive compensation${salary ? ` (${salary})` : ''}
- Comprehensive health and wellness benefits
- Flexible working arrangements
- Professional development opportunities
- Collaborative and inclusive work environment
- Opportunity to make a meaningful impact`;
}

serve(handler);
