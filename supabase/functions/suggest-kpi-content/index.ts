import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  mode: "suggest" | "improve";
  type: "group" | "individual";
  scopeType?: "department" | "office" | "project";
  scopeValue?: string;
  employeeRole?: string;
  department?: string;
  currentTitle?: string;
  currentDescription?: string;
  field: "title" | "description" | "both";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body: RequestBody = await req.json();
    const { mode, type, scopeType, scopeValue, employeeRole, department, currentTitle, currentDescription, field } = body;

    console.log("KPI Suggestion Request:", { mode, type, scopeType, scopeValue, employeeRole, department, field });

    // Build context-aware prompt
    let systemPrompt = `You are an expert HR consultant specializing in KPI design and performance management. 
You help create SMART (Specific, Measurable, Achievable, Relevant, Time-bound) KPIs that follow industry best practices.

Guidelines:
- KPI titles should be clear, action-oriented, and measurable
- Descriptions should explain what success looks like and how it will be measured
- Suggest appropriate target values and units when relevant
- Keep titles concise (3-8 words) and descriptions brief (1-2 sentences)

Always respond with valid JSON in this format:
{
  "title": "Suggested KPI title",
  "description": "Brief description of the KPI and how it's measured",
  "suggestedTarget": 100,
  "suggestedUnit": "%"
}`;

    let userPrompt = "";

    if (type === "group") {
      const scopeContext = scopeType === "department" 
        ? `the ${scopeValue} department`
        : scopeType === "office"
        ? `the ${scopeValue} office location`
        : `the ${scopeValue} project`;

      if (mode === "suggest") {
        userPrompt = `Suggest a KPI for ${scopeContext}.

Context:
- This is a ${scopeType}-level KPI that applies to all team members in ${scopeContext}
- Focus on metrics that make sense for a ${scopeType} level goal

Provide a relevant, measurable KPI that follows best practices for ${scopeType} performance tracking.`;
      } else {
        userPrompt = `Improve this KPI for ${scopeContext}:

Current Title: ${currentTitle || "(empty)"}
Current Description: ${currentDescription || "(empty)"}

Make it more specific, measurable, and aligned with best practices for ${scopeType}-level KPIs. Keep the core intent but enhance clarity and measurability.`;
      }
    } else {
      // Individual KPI
      const roleContext = employeeRole ? `a ${employeeRole}` : "an employee";
      const deptContext = department ? ` in the ${department} department` : "";

      if (mode === "suggest") {
        userPrompt = `Suggest a KPI for ${roleContext}${deptContext}.

Context:
- This is an individual performance KPI for an employee
- Focus on metrics appropriate for their role and department
${employeeRole ? `- The employee's position is: ${employeeRole}` : ""}
${department ? `- They work in the ${department} department` : ""}

Provide a relevant, measurable KPI that follows best practices for individual performance tracking.`;
      } else {
        userPrompt = `Improve this individual KPI for ${roleContext}${deptContext}:

Current Title: ${currentTitle || "(empty)"}
Current Description: ${currentDescription || "(empty)"}

Make it more specific, measurable, and aligned with best practices for individual KPIs. Keep the core intent but enhance clarity and measurability.`;
      }
    }

    // Add field-specific instructions
    if (field === "title") {
      userPrompt += "\n\nFocus primarily on suggesting a great title. The description can be brief.";
    } else if (field === "description") {
      userPrompt += `\n\nFocus primarily on improving the description. Keep the title as: "${currentTitle || "Untitled KPI"}"`;
    }

    console.log("Sending prompt to AI...");

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
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI Response:", content);

    // Parse JSON from response (handle markdown code blocks)
    let parsed;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      parsed = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Return a fallback response
      parsed = {
        title: currentTitle || "KPI Title",
        description: content.slice(0, 200),
        suggestedTarget: null,
        suggestedUnit: null,
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in suggest-kpi-content:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
