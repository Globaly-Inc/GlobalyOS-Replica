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

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { employee_id, full_name, avatar_url } = await req.json();

    if (!employee_id) {
      return new Response(
        JSON.stringify({ error: "employee_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = `https://api-${SENDBIRD_APP_ID}.sendbird.com/v3`;

    const updateResp = await fetch(`${baseUrl}/users/${employee_id}`, {
      method: "PUT",
      headers: {
        "Api-Token": SENDBIRD_API_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nickname: full_name || "User",
        profile_url: avatar_url || "",
      }),
    });

    if (!updateResp.ok) {
      const err = await updateResp.text();
      console.error("Sendbird sync error:", err);
      return new Response(
        JSON.stringify({ error: "Failed to sync user to Sendbird" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("sb-sync-user error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
