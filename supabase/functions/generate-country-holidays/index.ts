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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

    // Use Lovable AI to generate holidays
    const aiResponse = await fetch(`${supabaseUrl}/functions/v1/generate-with-ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        prompt: `Generate a JSON array of official public holidays for ${countryName}. 
        
For each holiday, provide:
- title: The official English name of the holiday
- title_local: The name in the local language (if different from English)
- month: Month number (1-12)
- day: Day of month (1-31) - use the typical/observed date
- is_movable: true if the date changes each year (like Easter, lunar holidays), false for fixed dates
- movable_rule: For movable holidays, describe how the date is calculated

Include only nationally recognized public holidays (bank holidays, official days off).
Exclude regional or optional holidays.
Order by month and day.

Return ONLY a valid JSON array, no other text. Example format:
[
  {"title": "New Year's Day", "month": 1, "day": 1, "is_movable": false},
  {"title": "Easter Monday", "title_local": "Ostermontag", "month": 4, "day": 21, "is_movable": true, "movable_rule": "Monday after Easter Sunday"}
]`,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI generation failed: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    let holidaysJson: GeneratedHoliday[] = [];

    // Parse AI response - handle different response formats
    try {
      const content = aiData.content || aiData.text || aiData.response || JSON.stringify(aiData);
      // Extract JSON array from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        holidaysJson = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON array found in AI response");
      }
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
