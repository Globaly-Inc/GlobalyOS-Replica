import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SENDBIRD_APP_ID = Deno.env.get("SENDBIRD_APP_ID");
    const SENDBIRD_API_TOKEN = Deno.env.get("SENDBIRD_API_TOKEN");

    if (!SENDBIRD_APP_ID || !SENDBIRD_API_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Sendbird credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticate the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get employee details
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("id, organization_id, user_id")
      .eq("user_id", user.id)
      .single();

    if (empError || !employee) {
      return new Response(
        JSON.stringify({ error: "Employee not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if calls feature is enabled for this org
    const { data: feature } = await supabase
      .from("organization_features")
      .select("is_enabled")
      .eq("organization_id", employee.organization_id)
      .eq("feature_name", "calls")
      .single();

    if (!feature?.is_enabled) {
      return new Response(
        JSON.stringify({ error: "Calls feature is not enabled for this organization" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get profile info
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .single();

    const sendbirdUserId = employee.id;
    const nickname = profile?.full_name || "User";
    const profileUrl = profile?.avatar_url || "";

    // Create or update Sendbird user
    const baseUrl = `https://api-${SENDBIRD_APP_ID}.sendbird.com/v3`;

    // Try to get existing user first
    const getUserResp = await fetch(`${baseUrl}/users/${sendbirdUserId}`, {
      headers: { "Api-Token": SENDBIRD_API_TOKEN },
    });

    if (getUserResp.status === 404) {
      // Create user
      const createResp = await fetch(`${baseUrl}/users`, {
        method: "POST",
        headers: {
          "Api-Token": SENDBIRD_API_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: sendbirdUserId,
          nickname,
          profile_url: profileUrl,
          issue_session_token: true,
        }),
      });

      if (!createResp.ok) {
        const err = await createResp.text();
        console.error("Sendbird create user error:", err);
        return new Response(
          JSON.stringify({ error: "Failed to create Sendbird user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userData = await createResp.json();
      return new Response(
        JSON.stringify({
          app_id: SENDBIRD_APP_ID,
          user_id: sendbirdUserId,
          session_token: userData.session_tokens?.[0]?.session_token,
          expires_at: userData.session_tokens?.[0]?.expires_at,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!getUserResp.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to check Sendbird user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update user metadata and issue new session token
    const updateResp = await fetch(`${baseUrl}/users/${sendbirdUserId}`, {
      method: "PUT",
      headers: {
        "Api-Token": SENDBIRD_API_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nickname,
        profile_url: profileUrl,
      }),
    });

    if (!updateResp.ok) {
      console.error("Sendbird update user error:", await updateResp.text());
    }

    // Issue a new session token
    const tokenResp = await fetch(`${baseUrl}/users/${sendbirdUserId}/token`, {
      method: "POST",
      headers: {
        "Api-Token": SENDBIRD_API_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expires_at: Math.floor(Date.now() / 1000) + 86400 }),
    });

    if (!tokenResp.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to issue session token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenResp.json();

    return new Response(
      JSON.stringify({
        app_id: SENDBIRD_APP_ID,
        user_id: sendbirdUserId,
        session_token: tokenData.token,
        expires_at: tokenData.expires_at,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("sb-auth error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
