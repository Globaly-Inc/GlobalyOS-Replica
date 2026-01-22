/**
 * Edge Function: setup-public-holidays
 * Creates public holiday calendar events for each office based on its country
 * Now reads from template_holidays database table instead of hardcoded data
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OfficeInput {
  id: string;
  countryCode: string | null;
}

interface RequestBody {
  organizationId: string;
  offices: OfficeInput[];
  createdBy: string;
}

interface Holiday {
  title: string;
  month: number;
  day: number;
}

/**
 * Fetches holidays for a specific country from the template_holidays table
 */
async function getHolidaysForCountry(
  supabase: SupabaseClient,
  countryCode: string,
  year: number
): Promise<Holiday[]> {
  const { data: holidays, error } = await supabase
    .from("template_holidays")
    .select("title, month, day, is_movable, year")
    .eq("country_code", countryCode.toUpperCase())
    .eq("is_active", true)
    .or(`year.is.null,year.eq.${year}`)
    .order("month", { ascending: true })
    .order("day", { ascending: true });

  if (error) {
    console.error(`Error fetching holidays for ${countryCode}:`, error);
    return getDefaultHolidays();
  }

  if (!holidays || holidays.length === 0) {
    console.log(`No template holidays found for ${countryCode}, using defaults`);
    return getDefaultHolidays();
  }

  // Filter out movable holidays without calculated dates (day is null)
  // For holidays with specific year, prefer those over generic (year=null)
  const holidayMap = new Map<string, Holiday>();
  
  for (const h of holidays) {
    if (h.day === null) {
      // Skip movable holidays without calculated date for this year
      continue;
    }
    
    const key = h.title;
    const existing = holidayMap.get(key);
    
    // If we have a year-specific entry, prefer it over generic
    if (!existing || (h.year === year && existing)) {
      holidayMap.set(key, {
        title: h.title,
        month: h.month,
        day: h.day,
      });
    }
  }

  return Array.from(holidayMap.values());
}

/**
 * Returns minimal fallback holidays when no templates exist
 */
function getDefaultHolidays(): Holiday[] {
  return [
    { month: 1, day: 1, title: "New Year's Day" },
    { month: 12, day: 25, title: "Christmas Day" },
  ];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { organizationId, offices, createdBy }: RequestBody = await req.json();

    if (!organizationId || !offices || !createdBy) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: organizationId, offices, createdBy" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Setting up public holidays for ${offices.length} offices in org ${organizationId}`);

    // Get current year for creating events
    const currentYear = new Date().getFullYear();
    const createdEvents: string[] = [];
    const skippedOffices: string[] = [];

    for (const office of offices) {
      if (!office.countryCode) {
        console.log(`Skipping office ${office.id} - no country code`);
        skippedOffices.push(office.id);
        continue;
      }

      // Get holidays from template_holidays table
      const countryCode = office.countryCode.toUpperCase();
      const holidays = await getHolidaysForCountry(supabase, countryCode, currentYear);

      console.log(`Creating ${holidays.length} holidays for office ${office.id} (${countryCode})`);

      for (const holiday of holidays) {
        // Create date for current year
        const startDate = `${currentYear}-${String(holiday.month).padStart(2, "0")}-${String(holiday.day).padStart(2, "0")}`;
        
        // Check if this holiday already exists for this office
        const { data: existing } = await supabase
          .from("calendar_events")
          .select(`
            id,
            calendar_event_offices!inner(office_id)
          `)
          .eq("organization_id", organizationId)
          .eq("title", holiday.title)
          .eq("start_date", startDate)
          .eq("event_type", "holiday")
          .eq("calendar_event_offices.office_id", office.id)
          .maybeSingle();

        if (existing) {
          console.log(`Holiday "${holiday.title}" already exists for office ${office.id}, skipping`);
          continue;
        }

        // Create the calendar event
        const { data: event, error: eventError } = await supabase
          .from("calendar_events")
          .insert({
            organization_id: organizationId,
            title: holiday.title,
            start_date: startDate,
            end_date: startDate, // Same day event
            event_type: "holiday",
            is_recurring: true,
            applies_to_all_offices: false, // Only for specific office
            created_by: createdBy,
          })
          .select("id")
          .single();

        if (eventError) {
          console.error(`Error creating holiday "${holiday.title}":`, eventError);
          continue;
        }

        // Link event to the specific office
        const { error: linkError } = await supabase
          .from("calendar_event_offices")
          .insert({
            calendar_event_id: event.id,
            office_id: office.id,
          });

        if (linkError) {
          console.error(`Error linking holiday to office:`, linkError);
          // Clean up the created event
          await supabase.from("calendar_events").delete().eq("id", event.id);
          continue;
        }

        createdEvents.push(`${holiday.title} (${countryCode})`);
      }
    }

    console.log(`Created ${createdEvents.length} holiday events, skipped ${skippedOffices.length} offices`);

    return new Response(
      JSON.stringify({
        success: true,
        created: createdEvents.length,
        skippedOffices: skippedOffices.length,
        holidays: createdEvents,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in setup-public-holidays:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
