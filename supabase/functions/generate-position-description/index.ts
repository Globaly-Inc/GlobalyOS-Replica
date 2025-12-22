import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { 
      positionId, 
      positionName, 
      department, 
      keywords, 
      organizationId, 
      forceRegenerate,
      existingDescription,
      existingResponsibilities,
      mode = "generate" // "generate" | "improve"
    } = await req.json();

    if (!positionName || !organizationId) {
      return new Response(
        JSON.stringify({ error: "Position name and organization ID are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for cached description if not forcing regeneration and not in improve mode
    if (!forceRegenerate && mode !== "improve" && positionId) {
      const { data: cached } = await supabase
        .from("positions")
        .select("description, responsibilities, ai_generated_at")
        .eq("id", positionId)
        .maybeSingle();
      
      if (cached?.description && cached?.responsibilities) {
        console.log("Returning cached description for position:", positionId);
        return new Response(JSON.stringify({ 
          description: cached.description, 
          responsibilities: cached.responsibilities,
          ai_generated_at: cached.ai_generated_at,
          cached: true 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`${mode === "improve" ? "Improving" : "Generating"} AI description for position:`, positionName);

    const keywordsContext = keywords?.length > 0 
      ? `Additional context/keywords: ${keywords.join(', ')}` 
      : '';

    // Build prompt based on mode
    let userPrompt: string;
    
    if (mode === "improve" && (existingDescription || existingResponsibilities?.length > 0)) {
      const existingContent = existingDescription 
        ? `Current description:\n"${existingDescription}"\n\n` 
        : '';
      const existingResp = existingResponsibilities?.length > 0
        ? `Current responsibilities:\n${existingResponsibilities.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}\n\n`
        : '';

      userPrompt = `Improve and enhance the job description for: ${positionName}
Department: ${department || 'General'}
${keywordsContext}

${existingContent}${existingResp}

Please improve the content by:
- Making it more professional and engaging
- Ensuring clarity and conciseness
- Adding any missing key aspects based on the role
- Incorporating the keywords naturally if provided

Provide a JSON response with:
1. "description": An improved professional description (100-150 words) explaining the role's purpose and scope
2. "responsibilities": An improved array of 5-8 key responsibilities as concise bullet points (each 10-20 words)

Respond ONLY with valid JSON, no markdown formatting.`;
    } else {
      userPrompt = `Generate a job description for: ${positionName}
Department: ${department || 'General'}
${keywordsContext}

Provide a JSON response with:
1. "description": A professional description (100-150 words) explaining the role's purpose and scope
2. "responsibilities": An array of 5-8 key responsibilities as concise bullet points (each 10-20 words)

Respond ONLY with valid JSON, no markdown formatting.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: `You are an expert HR professional writing job descriptions. Create clear, professional, and industry-standard content. Focus on the core purpose of the role and key value it brings. Do not include salary information or specific company names. Use active voice and professional language.` 
          },
          { 
            role: "user", 
            content: userPrompt 
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_position_content",
              description: "Generate or improve job description and responsibilities",
              parameters: {
                type: "object",
                properties: {
                  description: { 
                    type: "string",
                    description: "A professional job description of 100-150 words"
                  },
                  responsibilities: { 
                    type: "array",
                    items: { type: "string" },
                    description: "5-8 key responsibilities as concise bullet points"
                  }
                },
                required: ["description", "responsibilities"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_position_content" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate position description");
    }

    const data = await response.json();
    
    // Extract from tool call response
    let description = "";
    let responsibilities: string[] = [];
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        description = parsed.description || "";
        responsibilities = parsed.responsibilities || [];
      } catch (parseError) {
        console.error("Failed to parse tool response:", parseError);
        throw new Error("Failed to parse AI response");
      }
    }

    if (!description || responsibilities.length === 0) {
      throw new Error("AI did not return valid content");
    }

    // Cache the description in positions table
    if (positionId) {
      const { error: updateError } = await supabase
        .from("positions")
        .update({
          description,
          responsibilities,
          ai_generated_at: new Date().toISOString()
        })
        .eq("id", positionId);
      
      if (updateError) {
        console.error("Error caching description:", updateError);
      } else {
        console.log("Description cached successfully for position:", positionId);
      }
    }

    return new Response(JSON.stringify({ 
      description, 
      responsibilities,
      ai_generated_at: new Date().toISOString(),
      cached: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating position description:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
