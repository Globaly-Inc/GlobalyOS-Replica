/**
 * Edge Function: generate-country-holidays
 * Uses AI to generate public holiday templates for a given country
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  countryCode: string;
  countryName: string;
}

interface GeneratedHoliday {
  title: string;
  title_local?: string;
  month: number;
  day: number;
  is_movable: boolean;
  movable_rule?: string;
}

const toolSchema = {
  type: "function",
  function: {
    name: "generate_holidays",
    description: "Generate official public holidays for a country",
    parameters: {
      type: "object",
      properties: {
        holidays: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Official English name of the holiday" },
              title_local: { type: "string", description: "Name in local language (if different)" },
              month: { type: "number", description: "Month number (1-12)" },
              day: { type: "number", description: "Day of month (1-31) - use typical/observed date" },
              is_movable: { type: "boolean", description: "True if date changes each year (Easter, lunar holidays)" },
              movable_rule: { type: "string", description: "Rule for calculating movable dates" }
            },
            required: ["title", "month", "day", "is_movable"],
            additionalProperties: false
          }
        }
      },
      required: ["holidays"],
      additionalProperties: false
    }
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { countryCode, countryName }: RequestBody = await req.json();

    if (!countryCode || !countryName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: countryCode, countryName" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating holidays for ${countryName} (${countryCode})`);

    // Check if country already has holidays
    const { data: existing } = await supabase
      .from("template_holidays")
      .select("id")
      .eq("country_code", countryCode)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ error: "Country already has holiday templates" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Lovable AI gateway
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
            content: "You are an expert on international public holidays. Generate accurate, officially recognized national holidays only (not regional or optional holidays)."
          },
          {
            role: "user",
            content: `Generate all official public holidays (bank holidays, national days off) for ${countryName}. 

For each holiday:
- title: Official English name
- title_local: Name in local language (if different from English)
- month: Month number (1-12)
- day: Day of month - use the typical/observed date
- is_movable: true if the date changes yearly (Easter, lunar calendar holidays)
- movable_rule: For movable holidays, describe how the date is calculated

Include only nationally recognized public holidays. Exclude regional or optional holidays. Order by month and day.`
          }
        ],
        tools: [toolSchema],
        tool_choice: { type: "function", function: { name: "generate_holidays" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI generation failed: ${response.statusText}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data));
      throw new Error("AI did not generate structured holiday data");
    }

    let holidaysJson: GeneratedHoliday[];
    try {
      const parsed = JSON.parse(toolCall.function.arguments);
      holidaysJson = parsed.holidays;
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error("Failed to parse AI-generated holidays");
    }

    if (!Array.isArray(holidaysJson) || holidaysJson.length === 0) {
      throw new Error("AI did not generate valid holiday data");
    }

    console.log(`AI generated ${holidaysJson.length} holidays for ${countryName}`);

    // Insert holidays into database
    const holidayInserts = holidaysJson.map((holiday, index) => ({
      country_code: countryCode,
      country_name: countryName,
      title: holiday.title,
      title_local: holiday.title_local || null,
      month: holiday.month,
      day: holiday.is_movable ? null : holiday.day,
      is_movable: holiday.is_movable || false,
      movable_rule: holiday.movable_rule || null,
      sort_order: index + 1,
      is_active: true,
    }));

    const { error: insertError } = await supabase
      .from("template_holidays")
      .insert(holidayInserts);

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error(`Failed to save holidays: ${insertError.message}`);
    }

    // Track the generation
    await supabase
      .from("template_holiday_generations")
      .upsert({
        country_code: countryCode,
        year: new Date().getFullYear(),
        generated_by: "ai",
        status: "completed",
        notes: `Generated ${holidaysJson.length} holidays using AI`,
      });

    return new Response(
      JSON.stringify({
        success: true,
        holidaysCreated: holidaysJson.length,
        holidays: holidayInserts.map(h => h.title),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-country-holidays:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
