/**
 * create-scheduler-booking
 * Public edge function — creates a booking from the public booking page
 * No auth required (external invitees)
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CreateBookingRequest {
  org_code: string;
  event_type_slug: string;
  invitee_name: string;
  invitee_email: string;
  invitee_timezone: string;
  start_at_utc: string;
  answers_json?: Record<string, string>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: CreateBookingRequest = await req.json();
    const {
      org_code,
      event_type_slug,
      invitee_name,
      invitee_email,
      invitee_timezone,
      start_at_utc,
      answers_json,
    } = body;

    // Validate required fields
    if (!org_code || !event_type_slug || !invitee_name || !invitee_email || !start_at_utc) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invitee_email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve org
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, slug")
      .eq("slug", org_code)
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get event type + hosts
    const { data: eventType, error: etError } = await supabase
      .from("scheduler_event_types")
      .select(`
        *,
        hosts:scheduler_event_hosts(
          *,
          employee:employees(id, first_name, last_name, user_id)
        )
      `)
      .eq("organization_id", org.id)
      .eq("slug", event_type_slug)
      .eq("is_active", true)
      .single();

    if (etError || !eventType) {
      return new Response(
        JSON.stringify({ error: "Event type not found or inactive" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate start time is in the future
    const startTime = new Date(start_at_utc);
    if (startTime <= new Date()) {
      return new Response(
        JSON.stringify({ error: "Selected time is in the past" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate end time
    const endTime = new Date(startTime.getTime() + eventType.duration_minutes * 60 * 1000);

    // Check slot availability — no conflicts
    const { data: conflicts } = await supabase
      .from("scheduler_bookings")
      .select("id")
      .eq("event_type_id", eventType.id)
      .neq("status", "canceled")
      .lt("start_at_utc", endTime.toISOString())
      .gt("end_at_utc", start_at_utc);

    if (conflicts && conflicts.length > 0) {
      return new Response(
        JSON.stringify({ error: "This time slot is no longer available" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Assign host (primary host or first available)
    const hosts = eventType.hosts || [];
    const primaryHost = hosts.find((h: any) => h.is_primary) || hosts[0];
    const hostEmployeeId = primaryHost?.employee_id || null;

    // Find or create CRM contact
    let contactId: string | null = null;
    const { data: existingContact } = await supabase
      .from("crm_contacts")
      .select("id")
      .eq("organization_id", org.id)
      .eq("email", invitee_email.toLowerCase())
      .single();

    if (existingContact) {
      contactId = existingContact.id;
    } else {
      // Create new CRM contact
      const nameParts = invitee_name.trim().split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ") || null;

      const { data: newContact } = await supabase
        .from("crm_contacts")
        .insert({
          organization_id: org.id,
          first_name: firstName,
          last_name: lastName,
          email: invitee_email.toLowerCase(),
          source: "scheduler",
          is_archived: false,
        })
        .select("id")
        .single();

      contactId = newContact?.id || null;
    }

    // Create the booking
    const { data: booking, error: bookingError } = await supabase
      .from("scheduler_bookings")
      .insert({
        organization_id: org.id,
        event_type_id: eventType.id,
        host_employee_id: hostEmployeeId,
        invitee_contact_id: contactId,
        invitee_name: invitee_name.trim(),
        invitee_email: invitee_email.toLowerCase(),
        invitee_timezone: invitee_timezone || "UTC",
        start_at_utc: start_at_utc,
        end_at_utc: endTime.toISOString(),
        status: "scheduled",
        answers_json: answers_json || {},
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    // Log activity in CRM (if contact exists)
    if (contactId && hostEmployeeId) {
      await supabase.from("crm_activity_log").insert({
        organization_id: org.id,
        contact_id: contactId,
        employee_id: hostEmployeeId,
        type: "meeting",
        content: `Meeting scheduled: ${eventType.name} on ${new Date(start_at_utc).toLocaleString()}`,
      });
    }

    // Send confirmation emails
    const siteUrl = Deno.env.get("SITE_URL") || "https://globalyos.lovable.app";
    const cancelLink = `${siteUrl}/s/${org.slug}/scheduler/cancel/${booking.cancel_token}`;
    const rescheduleLink = `${siteUrl}/s/${org.slug}/scheduler/reschedule/${booking.cancel_token}`;

    // Send notifications via send-scheduler-notification function
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const fnUrl = `${supabaseUrl}/functions/v1/send-scheduler-notification`;
      await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          booking_id: booking.id,
          org_id: org.id,
          org_name: org.name,
          org_slug: org.slug,
          event_name: eventType.name,
          invitee_name: invitee_name,
          invitee_email: invitee_email,
          host_employee: primaryHost?.employee,
          start_at_utc: start_at_utc,
          duration_minutes: eventType.duration_minutes,
          location_type: eventType.location_type,
          location_value: eventType.location_value,
          cancel_link: cancelLink,
          reschedule_link: rescheduleLink,
        }),
      });
    } catch (notifyErr) {
      console.warn("Failed to send notifications:", notifyErr);
      // Don't fail the booking creation if notifications fail
    }

    return new Response(
      JSON.stringify({
        success: true,
        booking: {
          id: booking.id,
          cancel_token: booking.cancel_token,
          invitee_name: booking.invitee_name,
          invitee_email: booking.invitee_email,
          start_at_utc: booking.start_at_utc,
          end_at_utc: booking.end_at_utc,
          status: booking.status,
        },
        event_type: {
          name: eventType.name,
          duration_minutes: eventType.duration_minutes,
          location_type: eventType.location_type,
          location_value: eventType.location_value,
        },
        host: primaryHost?.employee
          ? {
              name: `${primaryHost.employee.first_name} ${primaryHost.employee.last_name}`,
            }
          : null,
        org_name: org.name,
        cancel_link: cancelLink,
        reschedule_link: rescheduleLink,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error creating booking:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to create booking" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
