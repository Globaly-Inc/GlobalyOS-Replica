/**
 * reschedule-scheduler-booking
 * Validates cancel token, checks new slot availability, updates booking time
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { token, new_start_at_utc } = body;

    if (!token || !new_start_at_utc) {
      return new Response(
        JSON.stringify({ error: "token and new_start_at_utc are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find booking by cancel_token
    const { data: booking, error: bookingError } = await supabase
      .from("scheduler_bookings")
      .select(`
        *,
        event_type:scheduler_event_types(
          id, name, duration_minutes, location_type, location_value,
          config_json, organization_id
        )
      `)
      .eq("cancel_token", token)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found or already cancelled" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (booking.status === "canceled") {
      return new Response(
        JSON.stringify({ error: "This booking has been cancelled and cannot be rescheduled" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const eventType = booking.event_type;
    const durationMs = eventType.duration_minutes * 60 * 1000;
    const newStart = new Date(new_start_at_utc);
    const newEnd = new Date(newStart.getTime() + durationMs);

    // Check the new slot is not already booked (conflict check)
    const { data: conflicts } = await supabase
      .from("scheduler_bookings")
      .select("id")
      .eq("event_type_id", eventType.id)
      .eq("status", "scheduled")
      .neq("id", booking.id)
      .lt("start_at_utc", newEnd.toISOString())
      .gt("end_at_utc", newStart.toISOString());

    if (conflicts && conflicts.length > 0) {
      return new Response(
        JSON.stringify({ error: "This time slot is no longer available. Please choose another." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update booking with new times (keep same cancel_token)
    const { error: updateError } = await supabase
      .from("scheduler_bookings")
      .update({
        start_at_utc: newStart.toISOString(),
        end_at_utc: newEnd.toISOString(),
        status: "scheduled",
      })
      .eq("id", booking.id);

    if (updateError) throw updateError;

    // Get org name
    const { data: org } = await supabase
      .from("organizations")
      .select("name, slug")
      .eq("id", eventType.organization_id)
      .single();

    const siteUrl = Deno.env.get("SITE_URL") || "https://globalyos.lovable.app";
    const cancelLink = `${siteUrl}/s/${org?.slug}/scheduler/cancel/${token}`;
    const rescheduleLink = `${siteUrl}/s/${org?.slug}/scheduler/reschedule/${token}`;

    // Send reschedule notification email
    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-scheduler-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": Deno.env.get("SUPABASE_ANON_KEY")!,
        },
        body: JSON.stringify({
          org_name: org?.name || "Your Host",
          org_slug: org?.slug,
          event_name: `${eventType.name} (Rescheduled)`,
          invitee_name: booking.invitee_name,
          invitee_email: booking.invitee_email,
          host_employee: null,
          start_at_utc: newStart.toISOString(),
          duration_minutes: eventType.duration_minutes,
          location_type: eventType.location_type,
          location_value: eventType.location_value,
          cancel_link: cancelLink,
          reschedule_link: rescheduleLink,
        }),
      });
    } catch {
      // Non-fatal — booking already updated
    }

    return new Response(
      JSON.stringify({
        success: true,
        booking: {
          id: booking.id,
          start_at_utc: newStart.toISOString(),
          end_at_utc: newEnd.toISOString(),
          invitee_name: booking.invitee_name,
          invitee_email: booking.invitee_email,
        },
        event_type: { name: eventType.name, duration_minutes: eventType.duration_minutes },
        cancel_link: cancelLink,
        reschedule_link: rescheduleLink,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error rescheduling booking:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
