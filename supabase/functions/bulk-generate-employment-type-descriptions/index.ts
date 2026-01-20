import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmploymentType {
  id: string;
  name: string;
  label: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { organizationId } = await req.json();

    if (!organizationId) {
      throw new Error("organizationId is required");
    }

    console.log(`Generating descriptions for employment types in organization: ${organizationId}`);

    // Fetch employment types without descriptions
    const { data: employmentTypes, error: fetchError } = await supabaseAdmin
      .from("employment_types")
      .select("id, name, label")
      .eq("organization_id", organizationId)
      .is("description", null);

    if (fetchError) {
      throw new Error(`Failed to fetch employment types: ${fetchError.message}`);
    }

    if (!employmentTypes || employmentTypes.length === 0) {
      console.log("No employment types without descriptions found");
      return new Response(
        JSON.stringify({ success: true, generated: 0, message: "No employment types need descriptions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${employmentTypes.length} employment types without descriptions`);

    let generated = 0;
    let failed = 0;

    for (const et of employmentTypes as EmploymentType[]) {
      try {
        console.log(`Generating description for: ${et.label} (${et.name})`);

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: `You are an HR expert. Generate a professional, concise description for an employment type classification. The description should explain what this employment type means, typical characteristics, and how it differs from other types. Keep it under 150 words and professional in tone.`,
              },
              {
                role: "user",
                content: `Generate a professional description for the employment type: "${et.label}" (internal name: "${et.name}"). This is used in an HR system to classify employees.`,
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "set_employment_type_description",
                  description: "Set the description for an employment type",
                  parameters: {
                    type: "object",
                    properties: {
                      description: {
                        type: "string",
                        description: "A professional description of the employment type (under 150 words)",
                      },
                    },
                    required: ["description"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "set_employment_type_description" } },
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            console.log("Rate limited, waiting before retry...");
            await new Promise((r) => setTimeout(r, 2000));
            failed++;
            continue;
          }
          throw new Error(`AI API error: ${response.status}`);
        }

        const aiResult = await response.json();
        const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
        
        if (!toolCall) {
          console.error(`No tool call in response for ${et.label}`);
          failed++;
          continue;
        }

        const args = JSON.parse(toolCall.function.arguments);
        const description = args.description;

        if (!description) {
          console.error(`No description generated for ${et.label}`);
          failed++;
          continue;
        }

        // Update the employment type with the description
        const { error: updateError } = await supabaseAdmin
          .from("employment_types")
          .update({ description })
          .eq("id", et.id);

        if (updateError) {
          console.error(`Failed to update ${et.label}:`, updateError);
          failed++;
          continue;
        }

        console.log(`Updated description for ${et.label}`);
        generated++;

        // Small delay to avoid rate limits
        await new Promise((r) => setTimeout(r, 300));
      } catch (err) {
        console.error(`Error processing ${et.label}:`, err);
        failed++;
      }
    }

    console.log(`Completed: ${generated} generated, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        generated,
        failed,
        total: employmentTypes.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating employment type descriptions:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
