/**
 * google-calendar-auth
 * Handles Google Calendar OAuth flow: initiate + callback
 * Auth required for initiate; callback is public (Google redirects here)
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
].join(" ");

function getRedirectUri(): string {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  return `${supabaseUrl}/functions/v1/google-calendar-auth?action=callback`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientId = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    return new Response(
      JSON.stringify({ error: "Google Calendar credentials not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  // Parse body once upfront (used by initiate, disconnect, and body-based action routing)
  let parsedBody: Record<string, unknown> = {};
  if (req.method === "POST") {
    try { parsedBody = await req.json(); } catch { parsedBody = {}; }
  }

  // Support action from body when not in query params (supabase.functions.invoke)
  const resolvedAction = action || (parsedBody.action as string | null);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // ── ACTION: initiate ──
  if (resolvedAction === "initiate") {
    // Verify the user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Read org_id from parsed body
    const orgId = parsedBody.organization_id as string;
    const source = (parsedBody.source as string) || 'scheduler'; // 'scheduler' or 'inbox'
    if (!orgId) {
      return new Response(JSON.stringify({ error: "organization_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build state param: userId|orgId|source (we'll verify on callback)
    const state = btoa(JSON.stringify({ userId, orgId, source }));

    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", getRedirectUri());
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", SCOPES);
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", state);

    return new Response(
      JSON.stringify({ auth_url: authUrl.toString() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── ACTION: callback ──
  if (action === "callback") {
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    const siteUrl = Deno.env.get("SITE_URL") || "https://globalyos.lovable.app";

    if (error) {
      return Response.redirect(`${siteUrl}?gcal_error=${error}`, 302);
    }

    if (!code || !stateParam) {
      return Response.redirect(`${siteUrl}?gcal_error=missing_params`, 302);
    }

    let state: { userId: string; orgId: string; source?: string };
    try {
      state = JSON.parse(atob(stateParam));
    } catch {
      return Response.redirect(`${siteUrl}?gcal_error=invalid_state`, 302);
    }

    // Exchange code for tokens
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: getRedirectUri(),
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Token exchange failed:", tokenData);
      return Response.redirect(`${siteUrl}?gcal_error=token_exchange_failed`, 302);
    }

    // Get Google email
    let googleEmail = "";
    try {
      const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userInfo = await userInfoRes.json();
      googleEmail = userInfo.email || "";
    } catch (e) {
      console.warn("Failed to fetch Google email:", e);
    }

    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

    // Upsert integration settings
    const { data: existing } = await supabase
      .from("scheduler_integration_settings")
      .select("id")
      .eq("organization_id", state.orgId)
      .eq("user_id", state.userId)
      .maybeSingle();

    const updates = {
      google_access_token: tokenData.access_token,
      google_refresh_token: tokenData.refresh_token || null,
      google_token_expires_at: expiresAt,
      google_calendar_connected: true,
      google_email: googleEmail,
    };

    if (existing) {
      await supabase
        .from("scheduler_integration_settings")
        .update(updates)
        .eq("id", existing.id);
    } else {
      await supabase
        .from("scheduler_integration_settings")
        .insert({
          organization_id: state.orgId,
          user_id: state.userId,
          provider: "google",
          is_google_meet_enabled: true,
          availability_calendar_ids: [],
          ...updates,
        });
    }

    // If source is 'inbox', auto-create Gmail inbox channel
    if (state.source === 'inbox') {
      // Check if a Gmail channel already exists for this org
      const { data: existingChannel } = await supabase
        .from("inbox_channels")
        .select("id")
        .eq("organization_id", state.orgId)
        .eq("channel_type", "gmail")
        .maybeSingle();

      if (!existingChannel) {
        await supabase.from("inbox_channels").insert({
          organization_id: state.orgId,
          channel_type: "gmail",
          display_name: `Gmail - ${googleEmail || "Connected"}`,
          credentials: { google_email: googleEmail, user_id: state.userId },
          webhook_status: "connected",
          is_active: true,
          config: {},
        });
      }

      // Trigger initial sync
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/gmail-sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            organization_id: state.orgId,
            user_id: state.userId,
            max_results: 20,
          }),
        });
      } catch (e) {
        console.warn("Initial Gmail sync trigger failed:", e);
      }

      // Parse orgCode from siteUrl or use a generic redirect
      return Response.redirect(`${siteUrl}/crm/inbox/channels?gmail=connected`, 302);
    }

    // Redirect back to scheduler integrations tab
    return Response.redirect(`${siteUrl}/crm/scheduler?tab=integrations&gcal=connected`, 302);
  }

  // ── ACTION: disconnect ──
  if (action === "disconnect") {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const body = await req.json().catch(() => ({}));
    const orgId = body.organization_id;

    // Revoke token if possible
    const { data: settings } = await supabase
      .from("scheduler_integration_settings")
      .select("google_access_token")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .maybeSingle();

    if (settings?.google_access_token) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${settings.google_access_token}`, {
          method: "POST",
        });
      } catch {
        // Best effort
      }
    }

    await supabase
      .from("scheduler_integration_settings")
      .update({
        google_access_token: null,
        google_refresh_token: null,
        google_token_expires_at: null,
        google_calendar_connected: false,
        google_email: null,
      })
      .eq("organization_id", orgId)
      .eq("user_id", userId);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ error: "Invalid action. Use: initiate, callback, disconnect" }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
