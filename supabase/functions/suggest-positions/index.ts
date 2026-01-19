import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { departments, existingPositions, industry, companySize } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!departments || !Array.isArray(departments) || departments.length === 0) {
      return new Response(JSON.stringify({ 
        error: "Please select at least one department first",
        positions: [] 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sizeContext = companySize === 'large' 
      ? 'large enterprise (500+ employees)' 
      : companySize === 'medium' 
        ? 'medium-sized company (50-500 employees)' 
        : 'small business or startup (under 50 employees)';

    const existingList = existingPositions?.length > 0 
      ? `\n\nAlready existing positions (DO NOT suggest these again): ${existingPositions.join(', ')}`
      : '';

    const systemPrompt = `You are an HR consultant. Suggest additional job positions for specific departments.
IMPORTANT: Return ONLY valid JSON array, no markdown, no code blocks.`;

    const userPrompt = `For a ${sizeContext} in the ${industry || 'General Business'} industry, suggest 3-5 NEW positions for EACH of these departments: ${departments.join(', ')}
${existingList}

Return this exact JSON structure:
{
  "positions": [
    {"name": "Position Name", "department": "Department Name"},
    ...
  ]
}`;

    console.log('Calling Lovable AI for position suggestions...');
    
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
          error: "Rate limit exceeded. Please try again in a moment.",
          positions: [] 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "AI credits exhausted. Please add credits to continue.",
          positions: [] 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ 
        error: "Failed to generate suggestions",
        positions: [] 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      return new Response(JSON.stringify({ positions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed;
    try {
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      parsed = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, content);
      return new Response(JSON.stringify({ positions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!parsed.positions || !Array.isArray(parsed.positions)) {
      console.error("Invalid structure in parsed response:", parsed);
      return new Response(JSON.stringify({ positions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter to only include positions for the requested departments
    const filteredPositions = parsed.positions.filter(
      (p: { name: string; department: string }) => departments.includes(p.department)
    );

    console.log(`Generated ${filteredPositions.length} position suggestions`);

    return new Response(JSON.stringify({ positions: filteredPositions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in suggest-positions:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      positions: []
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
