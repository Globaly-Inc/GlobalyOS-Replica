/**
 * cancel-scheduler-booking
 * Public edge function — cancels a booking via opaque cancel_token
 * No auth required (external invitees use token-based links)
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    const { token, action } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up booking by token
    const { data: booking, error: bookingError } = await supabase
      .from("scheduler_bookings")
      .select(`
        *,
        event_type:scheduler_event_types(name, duration_minutes, location_type)
      `)
      .eq("cancel_token", token)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (booking.status === "canceled") {
      return new Response(
        JSON.stringify({ error: "Booking is already canceled" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only allow cancellation if meeting hasn't started
    if (new Date(booking.start_at_utc) <= new Date()) {
      return new Response(
        JSON.stringify({ error: "Cannot cancel a meeting that has already started" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cancel the booking
    const { error: updateError } = await supabase
      .from("scheduler_bookings")
      .update({ status: "canceled" })
      .eq("cancel_token", token);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        booking: {
          invitee_name: booking.invitee_name,
          invitee_email: booking.invitee_email,
          start_at_utc: booking.start_at_utc,
          event_name: (booking.event_type as any)?.name,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error canceling booking:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to cancel booking" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
