/**
 * Suggest Positions for Custom Departments
 * Uses AI to generate position suggestions for user-added custom departments
 * Only called when a user adds a department that doesn't exist in templates
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { departmentName, industry, companySize, existingPositions } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!departmentName) {
      return new Response(JSON.stringify({ 
        error: "Department name is required",
        positions: [] 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generating positions for custom department: ${departmentName}`);

    const sizeContext = companySize === 'large' 
      ? 'large enterprise (500+ employees)' 
      : companySize === 'medium' 
        ? 'medium-sized company (50-500 employees)' 
        : 'small business or startup (under 50 employees)';

    const existingList = existingPositions && existingPositions.length > 0
      ? `\n\nEXISTING POSITIONS (do not duplicate): ${existingPositions.join(', ')}`
      : '';

    const systemPrompt = `You are an HR consultant. Generate position suggestions for a specific department.
Return ONLY valid JSON, no markdown, no code blocks, no explanation.`;

    const userPrompt = `For a ${sizeContext} in the ${industry || 'General Business'} industry, suggest 4-6 relevant positions for the "${departmentName}" department.

Consider what roles would typically exist in this department. Use full professional titles.${existingList}

Return this exact JSON structure:
{
  "positions": [
    {"name": "Position Title", "department": "${departmentName}"},
    ...
  ]
}`;

    console.log('Calling Lovable AI for custom department positions...');
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded. Please add positions manually.",
          positions: getDefaultPositionsForDepartment(departmentName)
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ 
        positions: getDefaultPositionsForDepartment(departmentName) 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      return new Response(JSON.stringify({ 
        positions: getDefaultPositionsForDepartment(departmentName) 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse JSON from response
    let parsed;
    try {
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      parsed = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, content);
      return new Response(JSON.stringify({ 
        positions: getDefaultPositionsForDepartment(departmentName) 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate structure and filter to only the requested department
    if (!parsed.positions || !Array.isArray(parsed.positions)) {
      console.error("Invalid structure in parsed response:", parsed);
      return new Response(JSON.stringify({ 
        positions: getDefaultPositionsForDepartment(departmentName) 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure all positions have the correct department
    const positions = parsed.positions.map((p: { name: string }) => ({
      name: p.name,
      department: departmentName
    }));

    console.log(`Generated ${positions.length} positions for ${departmentName}`);

    return new Response(JSON.stringify({ positions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in suggest-custom-department-positions:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      positions: []
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getDefaultPositionsForDepartment(departmentName: string) {
  // Generic fallback positions for any custom department
  return [
    { name: `${departmentName} Manager`, department: departmentName },
    { name: `${departmentName} Coordinator`, department: departmentName },
    { name: `${departmentName} Specialist`, department: departmentName },
    { name: `${departmentName} Assistant`, department: departmentName },
  ];
}
