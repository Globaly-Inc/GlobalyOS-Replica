/**
 * google-calendar-proxy
 * Proxies Google Calendar API calls with automatic token refresh
 * Auth required
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

interface TokenResult {
  accessToken: string;
  refreshed: boolean;
}

async function getValidToken(
  supabase: any,
  settingsId: string,
  accessToken: string,
  refreshToken: string | null,
  expiresAt: string | null
): Promise<TokenResult> {
  // Check if token is still valid (with 5 min buffer)
  if (expiresAt) {
    const expiryTime = new Date(expiresAt).getTime();
    if (Date.now() < expiryTime - 5 * 60 * 1000) {
      return { accessToken, refreshed: false };
    }
  }

  // Token expired, refresh it
  if (!refreshToken) {
    throw new Error("No refresh token available. Please reconnect Google Calendar.");
  }

  const clientId = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET")!;

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    console.error("Token refresh failed:", data);
    // Mark as disconnected
    await supabase
      .from("scheduler_integration_settings")
      .update({ google_calendar_connected: false })
      .eq("id", settingsId);
    throw new Error("Failed to refresh Google token. Please reconnect.");
  }

  const newExpiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();

  await supabase
    .from("scheduler_integration_settings")
    .update({
      google_access_token: data.access_token,
      google_token_expires_at: newExpiresAt,
      ...(data.refresh_token ? { google_refresh_token: data.refresh_token } : {}),
    })
    .eq("id", settingsId);

  return { accessToken: data.access_token, refreshed: true };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, user_id, organization_id, ...params } = body;

    if (!user_id || !organization_id) {
      return new Response(
        JSON.stringify({ error: "user_id and organization_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get integration settings
    const { data: settings, error: settingsErr } = await supabase
      .from("scheduler_integration_settings")
      .select("*")
      .eq("organization_id", organization_id)
      .eq("user_id", user_id)
      .maybeSingle();

    if (settingsErr || !settings || !settings.google_calendar_connected) {
      return new Response(
        JSON.stringify({ error: "Google Calendar not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { accessToken } = await getValidToken(
      supabase,
      settings.id,
      settings.google_access_token,
      settings.google_refresh_token,
      settings.google_token_expires_at
    );

    // ── ACTION: get_busy_times ──
    if (action === "get_busy_times") {
      const { time_min, time_max, calendar_ids } = params;
      const calendars = calendar_ids?.length
        ? calendar_ids.map((id: string) => ({ id }))
        : [{ id: "primary" }];

      const freeBusyRes = await fetch(`${CALENDAR_API}/freeBusy`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeMin: time_min,
          timeMax: time_max,
          items: calendars,
        }),
      });

      const freeBusyData = await freeBusyRes.json();
      if (!freeBusyRes.ok) {
        throw new Error(`Google Calendar API error: ${JSON.stringify(freeBusyData)}`);
      }

      // Merge all busy times from all calendars
      const busyTimes: Array<{ start: string; end: string }> = [];
      for (const cal of Object.values(freeBusyData.calendars || {})) {
        const busy = (cal as any).busy || [];
        busyTimes.push(...busy);
      }

      return new Response(
        JSON.stringify({ busy_times: busyTimes }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: create_event ──
    if (action === "create_event") {
      const { summary, description, start_time, end_time, attendees, create_meet_link } = params;

      const event: any = {
        summary,
        description: description || "",
        start: { dateTime: start_time, timeZone: "UTC" },
        end: { dateTime: end_time, timeZone: "UTC" },
      };

      if (attendees?.length) {
        event.attendees = attendees.map((email: string) => ({ email }));
      }

      if (create_meet_link) {
        event.conferenceData = {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        };
      }

      const calendarId = settings.primary_calendar_id || "primary";
      const createUrl = `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events${
        create_meet_link ? "?conferenceDataVersion=1" : ""
      }`;

      const createRes = await fetch(createUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      });

      const createdEvent = await createRes.json();
      if (!createRes.ok) {
        throw new Error(`Failed to create Google Calendar event: ${JSON.stringify(createdEvent)}`);
      }

      const meetLink = createdEvent.conferenceData?.entryPoints?.find(
        (ep: any) => ep.entryPointType === "video"
      )?.uri || null;

      return new Response(
        JSON.stringify({
          google_event_id: createdEvent.id,
          google_meet_link: meetLink,
          html_link: createdEvent.htmlLink,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: delete_event ──
    if (action === "delete_event") {
      const { event_id } = params;
      const calendarId = settings.primary_calendar_id || "primary";

      await fetch(
        `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${event_id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: get_busy_times, create_event, delete_event" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in google-calendar-proxy:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
