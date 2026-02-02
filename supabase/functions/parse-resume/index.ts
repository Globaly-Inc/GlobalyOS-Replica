/**
 * Parse Resume Edge Function
 * Uses Lovable AI to extract structured data from CV/resume files
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ParseResumeRequest {
  file_path: string;
  candidate_id: string;
  application_id: string;
}

interface ParsedResumeData {
  personal_info?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin_url?: string;
    portfolio_url?: string;
  };
  summary?: string;
  skills?: string[];
  experience?: Array<{
    title: string;
    company: string;
    location?: string;
    start_date?: string;
    end_date?: string;
    description?: string;
  }>;
  education?: Array<{
    degree: string;
    institution: string;
    year?: string;
    field?: string;
  }>;
  certifications?: string[];
  languages?: string[];
  total_years_experience?: number;
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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
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

    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ParseResumeRequest = await req.json();
    const { file_path, candidate_id, application_id } = body;

    if (!file_path) {
      return new Response(
        JSON.stringify({ success: false, message: "File path is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Parsing resume:", file_path);

    // Download the file from storage
    const { data: fileData, error: downloadError } = await serviceSupabase.storage
      .from("hiring-documents")
      .download(file_path);

    if (downloadError || !fileData) {
      console.error("Failed to download file:", downloadError);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to download resume file" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert file to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64Content = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    // Get file extension to determine type
    const extension = file_path.split(".").pop()?.toLowerCase();
    const fileName = file_path.split("/").pop() || "resume";

    // First, parse the document content using our existing edge function
    const parseResponse = await fetch(`${supabaseUrl}/functions/v1/parse-document-content`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify({
        fileContent: base64Content,
        fileName: fileName,
        mimeType: extension === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    });

    if (!parseResponse.ok) {
      console.error("Failed to parse document:", await parseResponse.text());
      return new Response(
        JSON.stringify({ success: false, message: "Failed to parse document content" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsedDoc = await parseResponse.json();
    const documentText = parsedDoc.text || "";

    if (!documentText || documentText.length < 50) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Could not extract sufficient text from the resume. Please try a different file format." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Extracted ${documentText.length} characters from resume`);

    // Use Lovable AI to parse the resume
    const lovableAIUrl = Deno.env.get("LOVABLE_AI_URL") || "https://ai.lovable.dev/api/v1/chat";
    const lovableAIKey = Deno.env.get("LOVABLE_AI_API_KEY");

    if (!lovableAIKey) {
      return new Response(
        JSON.stringify({ success: false, message: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `You are an expert HR professional. Parse the following resume/CV text and extract structured information.

Resume Text:
---
${documentText.slice(0, 15000)}
---

Extract and return a JSON object with the following structure (include only fields where you can find information):
{
  "personal_info": {
    "name": "Full name of the candidate",
    "email": "Email address",
    "phone": "Phone number",
    "location": "City, Country or similar location info",
    "linkedin_url": "LinkedIn profile URL if mentioned",
    "portfolio_url": "Portfolio or personal website URL if mentioned"
  },
  "summary": "Brief professional summary or objective (2-3 sentences max)",
  "skills": ["List", "of", "technical", "and", "soft", "skills"],
  "experience": [
    {
      "title": "Job title",
      "company": "Company name",
      "location": "Location if mentioned",
      "start_date": "Start date (YYYY-MM format if possible)",
      "end_date": "End date or 'Present'",
      "description": "Brief description of responsibilities (1-2 sentences)"
    }
  ],
  "education": [
    {
      "degree": "Degree name (e.g., Bachelor of Science)",
      "institution": "University or school name",
      "year": "Graduation year",
      "field": "Field of study"
    }
  ],
  "certifications": ["List of certifications"],
  "languages": ["List of languages spoken"],
  "total_years_experience": 0
}

Return ONLY valid JSON, no additional text or markdown formatting. If you cannot find information for a field, omit it entirely.`;

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
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI API error:", await aiResponse.text());
      return new Response(
        JSON.stringify({ success: false, message: "Failed to parse resume with AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "";

    // Parse the JSON response
    let parsedData: ParsedResumeData = {};
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, aiContent];
      const jsonStr = jsonMatch[1]?.trim() || aiContent.trim();
      parsedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      console.log("AI response:", aiContent);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Failed to parse resume data. Please try again." 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Successfully parsed resume data");

    // Update candidate with extracted data if available
    if (candidate_id && parsedData.personal_info) {
      const updates: Record<string, any> = {};
      
      if (parsedData.personal_info.phone) {
        updates.phone = parsedData.personal_info.phone;
      }
      if (parsedData.personal_info.location) {
        updates.location = parsedData.personal_info.location;
      }
      if (parsedData.personal_info.linkedin_url) {
        updates.linkedin_url = parsedData.personal_info.linkedin_url;
      }
      if (parsedData.personal_info.portfolio_url) {
        updates.portfolio_url = parsedData.personal_info.portfolio_url;
      }

      if (Object.keys(updates).length > 0) {
        await serviceSupabase
          .from("candidates")
          .update(updates)
          .eq("id", candidate_id);
      }
    }

    // Store parsed data in application custom_fields
    if (application_id) {
      await serviceSupabase
        .from("candidate_applications")
        .update({
          custom_fields: {
            parsed_resume: parsedData,
            parsed_at: new Date().toISOString(),
          },
        })
        .eq("id", application_id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: parsedData,
        message: "Resume parsed successfully" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error parsing resume:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
