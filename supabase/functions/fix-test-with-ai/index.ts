import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FixRequest {
  test_name: string;
  test_file: string;
  test_suite?: string;
  test_category: string;
  error_message: string;
  stack_trace?: string;
}

interface FixResponse {
  explanation: string;
  suggestedFix: string;
  confidence: 'High' | 'Medium' | 'Low';
  affectedFiles: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body: FixRequest = await req.json();
    const { test_name, test_file, test_suite, test_category, error_message, stack_trace } = body;

    console.log(`Analyzing failed test: ${test_name} in ${test_file}`);

    const prompt = `You are a senior software engineer helping to fix a failing test in a React/TypeScript application.

TEST DETAILS:
- Test Name: ${test_name}
- Test File: ${test_file}
${test_suite ? `- Test Suite: ${test_suite}` : ''}
- Category: ${test_category}

ERROR MESSAGE:
${error_message}

${stack_trace ? `STACK TRACE:
${stack_trace}` : ''}

Please analyze this test failure and provide a solution. Consider:
1. Common causes for this type of error
2. The file path and test context
3. Potential fixes based on the error message and stack trace

Respond with a JSON object containing:
{
  "explanation": "A clear 2-3 sentence explanation of why the test is failing",
  "suggestedFix": "The code fix with file path and line references if determinable. Use diff format (- for removed lines, + for added lines)",
  "confidence": "High, Medium, or Low based on how certain you are about the fix",
  "affectedFiles": ["array", "of", "affected", "files"]
}

IMPORTANT: Return ONLY valid JSON, no markdown code blocks or extra text.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert software engineer specializing in debugging and fixing test failures. Always respond with valid JSON only." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to continue using AI features." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    console.log("AI response received:", content.substring(0, 200));

    // Parse the JSON response
    let fixResponse: FixResponse;
    try {
      // Clean up the response - remove any markdown code blocks if present
      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      fixResponse = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Return a fallback response
      fixResponse = {
        explanation: "The AI was unable to provide a structured analysis. The raw response may contain useful information.",
        suggestedFix: content,
        confidence: "Low",
        affectedFiles: [test_file]
      };
    }

    return new Response(JSON.stringify(fixResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in fix-test-with-ai:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred",
        explanation: "Failed to analyze the test failure. Please try again.",
        suggestedFix: "",
        confidence: "Low",
        affectedFiles: []
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
