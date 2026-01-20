import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Position {
  id: string;
  name: string;
  department: string | null;
}

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

    const { organizationId } = await req.json();

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: "Organization ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all positions without descriptions
    const { data: positions, error: fetchError } = await supabase
      .from("positions")
      .select("id, name, department")
      .eq("organization_id", organizationId)
      .is("description", null);

    if (fetchError) {
      console.error("Error fetching positions:", fetchError);
      throw new Error("Failed to fetch positions");
    }

    if (!positions || positions.length === 0) {
      console.log("No positions without descriptions found");
      return new Response(JSON.stringify({ 
        success: true, 
        generated: 0,
        message: "No positions need descriptions" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating AI descriptions for ${positions.length} positions...`);

    let generated = 0;
    let failed = 0;

    // Process positions in batches to avoid rate limits
    for (const position of positions) {
      try {
        console.log(`Generating description for: ${position.name}`);

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
                content: `Generate a job description for: ${position.name}
Department: ${position.department || 'General'}

Provide a JSON response with:
1. "description": A professional description (100-150 words) explaining the role's purpose and scope
2. "responsibilities": An array of 5-8 key responsibilities as concise bullet points (each 10-20 words)

Respond ONLY with valid JSON, no markdown formatting.` 
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "generate_position_content",
                  description: "Generate job description and responsibilities",
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
            console.log("Rate limited, waiting before continuing...");
            await new Promise(resolve => setTimeout(resolve, 2000));
            failed++;
            continue;
          }
          console.error(`Failed to generate for ${position.name}:`, response.status);
          failed++;
          continue;
        }

        const data = await response.json();
        
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          const parsed = JSON.parse(toolCall.function.arguments);
          const description = parsed.description || "";
          const responsibilities = parsed.responsibilities || [];

          if (description && responsibilities.length > 0) {
            // Save to database
            const { error: updateError } = await supabase
              .from("positions")
              .update({
                description,
                responsibilities,
                ai_generated_at: new Date().toISOString()
              })
              .eq("id", position.id);
            
            if (updateError) {
              console.error(`Error saving description for ${position.name}:`, updateError);
              failed++;
            } else {
              console.log(`Successfully generated description for: ${position.name}`);
              generated++;
            }
          } else {
            failed++;
          }
        } else {
          failed++;
        }

        // Small delay between requests to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (positionError) {
        console.error(`Error processing position ${position.name}:`, positionError);
        failed++;
      }
    }

    console.log(`Bulk generation complete. Generated: ${generated}, Failed: ${failed}`);

    return new Response(JSON.stringify({ 
      success: true, 
      generated,
      failed,
      total: positions.length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in bulk position description generation:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
