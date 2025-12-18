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
    const { type, title, description, page_url } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a helpful assistant that improves bug reports and feature requests for a business software application called GlobalyOS.

Your task is to:
1. Improve the clarity and grammar of the user's description
2. Add technical context based on the page URL if relevant
3. Structure the content for easy understanding
4. Suggest an appropriate priority level based on the impact described

For bug reports:
- Extract clear steps to reproduce
- Identify expected vs actual behavior
- Note any error messages or symptoms

For feature requests:
- Clarify the use case and benefit
- Identify who would benefit from this feature
- Suggest any related functionality

Keep the improved description concise but comprehensive. Maintain a professional tone.`;

    const userPrompt = `Type: ${type}
Title: ${title}
Original Description: ${description}
Page URL: ${page_url}

Please improve this ${type === 'bug' ? 'bug report' : 'feature request'} and suggest a priority level (low, medium, high, or critical).

Respond in JSON format:
{
  "improved_description": "The improved description...",
  "suggested_priority": "medium"
}`;

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
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let result;
    try {
      // Handle markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      result = JSON.parse(jsonStr.trim());
    } catch {
      // Fallback if parsing fails
      result = {
        improved_description: description,
        suggested_priority: "medium",
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in improve-support-content:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
