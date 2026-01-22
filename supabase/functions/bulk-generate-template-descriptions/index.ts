import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, id, name, department, category } = await req.json();

    if (!type || !category) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type, category" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let prompt = "";
    let toolSchema: Record<string, unknown> = {};

    if (type === "department") {
      if (!name) {
        return new Response(
          JSON.stringify({ error: "Missing required field: name for department" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      prompt = `You are an HR expert. Generate a brief, professional description (50-80 words) for this department:

Department: ${name}
Industry: ${category}

The description should explain the department's purpose and key functions within an organization in the ${category} industry.`;

      toolSchema = {
        type: "function",
        function: {
          name: "generate_department_description",
          description: "Generate a department description",
          parameters: {
            type: "object",
            properties: {
              description: {
                type: "string",
                description: "A professional description of the department (50-80 words)"
              }
            },
            required: ["description"],
            additionalProperties: false
          }
        }
      };
    } else if (type === "position") {
      if (!name) {
        return new Response(
          JSON.stringify({ error: "Missing required field: name for position" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      prompt = `You are an HR expert. Generate a professional job description for this position:

Position: ${name}
Department: ${department || "General"}
Industry: ${category}

Provide:
1. A clear description (80-120 words) explaining the role's purpose and scope
2. 5-7 key responsibilities as concise bullet points

Focus on responsibilities typical for this role in the ${category} industry.`;

      toolSchema = {
        type: "function",
        function: {
          name: "generate_position_description",
          description: "Generate a position description with responsibilities",
          parameters: {
            type: "object",
            properties: {
              description: {
                type: "string",
                description: "A professional job description (80-120 words)"
              },
              responsibilities: {
                type: "array",
                items: { type: "string" },
                description: "5-7 key responsibilities as bullet points"
              }
            },
            required: ["description", "responsibilities"],
            additionalProperties: false
          }
        }
      };
    } else if (type === "positions") {
      // Generate multiple positions for a department
      if (!department) {
        return new Response(
          JSON.stringify({ error: "Missing required field: department for positions generation" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      prompt = `You are an HR expert. Generate 4-6 typical job positions for this department:

Department: ${department}
Industry: ${category}

For each position, provide:
1. Position name
2. A professional job description (80-120 words)
3. 5-7 key responsibilities

Focus on roles typical for a ${department} department in the ${category} industry.`;

      toolSchema = {
        type: "function",
        function: {
          name: "generate_department_positions",
          description: "Generate multiple positions for a department",
          parameters: {
            type: "object",
            properties: {
              positions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Position title" },
                    description: { type: "string", description: "Job description (80-120 words)" },
                    responsibilities: {
                      type: "array",
                      items: { type: "string" },
                      description: "5-7 key responsibilities"
                    }
                  },
                  required: ["name", "description", "responsibilities"]
                },
                description: "4-6 positions with descriptions"
              }
            },
            required: ["positions"],
            additionalProperties: false
          }
        }
      };

      console.log(`Generating positions for department: ${department} in ${category}`);

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a professional HR consultant creating job descriptions." },
            { role: "user", content: prompt }
          ],
          tools: [toolSchema],
          tool_choice: { type: "function", function: { name: "generate_department_positions" } }
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limited, please try again later" }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

      if (!toolCall?.function?.arguments) {
        return new Response(
          JSON.stringify({ error: "No content generated" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const parsed = JSON.parse(toolCall.function.arguments);
      console.log(`Successfully generated ${parsed.positions?.length || 0} positions for ${department}`);

      return new Response(
        JSON.stringify({ positions: parsed.positions || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating ${type} description for: ${name} in ${category}`);

    const functionName = type === "department" 
      ? "generate_department_description" 
      : "generate_position_description";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a professional HR consultant creating job descriptions and department overviews." },
          { role: "user", content: prompt }
        ],
        tools: [toolSchema],
        tool_choice: { type: "function", function: { name: functionName } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ error: "No content generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    console.log(`Successfully generated ${type} description for: ${name}`);

    return new Response(
      JSON.stringify({
        description: parsed.description,
        responsibilities: parsed.responsibilities || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in bulk-generate-template-descriptions:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});