/**
 * get-scheduler-slots
 * Public edge function — returns available time slots for a given event type and date
 * No auth required (public booking page)
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DAY_MAP: Record<string, string> = {
  "0": "sunday",
  "1": "monday",
  "2": "tuesday",
  "3": "wednesday",
  "4": "thursday",
  "5": "friday",
  "6": "saturday",
};

function generateSlots(
  dateStr: string,
  startTime: string,
  endTime: string,
  durationMinutes: number,
  bufferBefore: number,
  bufferAfter: number,
  existingBookings: Array<{ start_at_utc: string; end_at_utc: string }>,
  minNoticeHours: number,
  inviteeTimezone: string
): string[] {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);

  // Work in invitee's local date
  const slots: string[] = [];
  const now = new Date();
  const minNoticeMs = minNoticeHours * 60 * 60 * 1000;

  // Build slot start times for this date (in local time, then convert to UTC)
  let slotStart = new Date(`${dateStr}T${startTime}:00`);
  const dayEnd = new Date(`${dateStr}T${endTime}:00`);

  while (slotStart < dayEnd) {
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);

    // Don't exceed end of day
    if (slotEnd > dayEnd) break;

    // Check min notice
    if (slotStart.getTime() - now.getTime() < minNoticeMs) {
      slotStart = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);
      continue;
    }

    // Check conflicts with existing bookings (including buffers)
    const slotStartWithBuffer = new Date(slotStart.getTime() - bufferBefore * 60 * 1000);
    const slotEndWithBuffer = new Date(slotEnd.getTime() + bufferAfter * 60 * 1000);

    const hasConflict = existingBookings.some((booking) => {
      const bookingStart = new Date(booking.start_at_utc);
      const bookingEnd = new Date(booking.end_at_utc);
      return slotStartWithBuffer < bookingEnd && slotEndWithBuffer > bookingStart;
    });

    if (!hasConflict) {
      slots.push(slotStart.toISOString());
    }

    slotStart = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);
  }

  return slots;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const orgCode = url.searchParams.get("orgCode");
    const slug = url.searchParams.get("slug");
    const dateStr = url.searchParams.get("date"); // YYYY-MM-DD in invitee's local
    const inviteeTimezone = url.searchParams.get("timezone") || "UTC";

    if (!orgCode || !slug || !dateStr) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: orgCode, slug, date" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Resolve org by slug
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("slug", orgCode)
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get event type
    const { data: eventType, error: etError } = await supabase
      .from("scheduler_event_types")
      .select(`
        *,
        hosts:scheduler_event_hosts(
          *,
          employee:employees(id, first_name, last_name, avatar_url, job_title)
        )
      `)
      .eq("organization_id", org.id)
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (etError || !eventType) {
      return new Response(
        JSON.stringify({ error: "Event type not found or inactive" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const config = eventType.config_json as any;
    const availability = config?.availability || {};

    // Get day of week for the requested date
    const date = new Date(`${dateStr}T12:00:00`); // noon to avoid TZ edge
    const dayOfWeek = date.getDay().toString();
    const dayName = DAY_MAP[dayOfWeek];
    const dayAvailability = availability[dayName];

    if (!dayAvailability?.enabled) {
      return new Response(
        JSON.stringify({ slots: [], event_type: eventType, org_name: org.name }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check max days in advance
    const now = new Date();
    const maxDays = availability.max_days_in_advance || 60;
    const maxDate = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);
    if (date > maxDate) {
      return new Response(
        JSON.stringify({ slots: [], event_type: eventType, org_name: org.name }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get existing bookings for that day (across all hosts)
    const dayStart = `${dateStr}T00:00:00.000Z`;
    const dayEnd = `${dateStr}T23:59:59.999Z`;

    const { data: existingBookings } = await supabase
      .from("scheduler_bookings")
      .select("start_at_utc, end_at_utc")
      .eq("event_type_id", eventType.id)
      .neq("status", "canceled")
      .gte("start_at_utc", dayStart)
      .lte("start_at_utc", dayEnd);

    const slots = generateSlots(
      dateStr,
      dayAvailability.start,
      dayAvailability.end,
      eventType.duration_minutes,
      availability.buffer_before_minutes || 0,
      availability.buffer_after_minutes || 0,
      existingBookings || [],
      availability.min_notice_hours || 2,
      inviteeTimezone
    );

    return new Response(
      JSON.stringify({
        slots,
        event_type: {
          id: eventType.id,
          name: eventType.name,
          slug: eventType.slug,
          description: eventType.description,
          duration_minutes: eventType.duration_minutes,
          location_type: eventType.location_type,
          location_value: eventType.location_value,
          type: eventType.type,
          config_json: eventType.config_json,
          hosts: eventType.hosts,
        },
        org_name: org.name,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in get-scheduler-slots:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
