import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Auto-reindex check starting...");

    // Fetch organizations with auto-reindex enabled
    const { data: orgsWithSettings, error: fetchError } = await supabase
      .from("ai_knowledge_settings")
      .select(`
        organization_id,
        auto_reindex_hour,
        last_auto_reindex_at
      `)
      .eq("auto_reindex_enabled", true);

    if (fetchError) {
      console.error("Error fetching settings:", fetchError);
      throw fetchError;
    }

    if (!orgsWithSettings || orgsWithSettings.length === 0) {
      console.log("No organizations with auto-reindex enabled");
      return new Response(
        JSON.stringify({ checked: 0, triggered: 0, organizations: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get organization timezones
    const orgIds = orgsWithSettings.map(o => o.organization_id);
    const { data: orgs, error: orgsError } = await supabase
      .from("organizations")
      .select("id, timezone")
      .in("id", orgIds);

    if (orgsError) {
      console.error("Error fetching organizations:", orgsError);
      throw orgsError;
    }

    const orgTimezones = new Map(orgs?.map(o => [o.id, o.timezone || "UTC"]) || []);

    const now = new Date();
    const triggered: string[] = [];

    for (const orgSetting of orgsWithSettings) {
      const orgTimezone = orgTimezones.get(orgSetting.organization_id) || "UTC";
      
      // Get current hour in org's timezone
      const orgNowStr = now.toLocaleString("en-US", { timeZone: orgTimezone });
      const orgNow = new Date(orgNowStr);
      const currentHour = orgNow.getHours();

      console.log(`Org ${orgSetting.organization_id}: timezone=${orgTimezone}, currentHour=${currentHour}, scheduledHour=${orgSetting.auto_reindex_hour}`);

      // Check if it's the right hour
      if (currentHour !== orgSetting.auto_reindex_hour) {
        continue;
      }

      // Check if already ran today (in org's timezone)
      if (orgSetting.last_auto_reindex_at) {
        const lastRun = new Date(orgSetting.last_auto_reindex_at);
        const lastRunStr = lastRun.toLocaleDateString("en-US", { timeZone: orgTimezone });
        const todayStr = orgNow.toLocaleDateString("en-US", { timeZone: orgTimezone });
        
        if (lastRunStr === todayStr) {
          console.log(`Org ${orgSetting.organization_id}: Already ran today, skipping`);
          continue;
        }
      }

      console.log(`Triggering reindex for org ${orgSetting.organization_id}`);

      // Trigger re-index for this org by calling the index-ai-content function
      const { error: invokeError } = await supabase.functions.invoke("index-ai-content", {
        body: { organization_id: orgSetting.organization_id }
      });

      if (invokeError) {
        console.error(`Error triggering reindex for org ${orgSetting.organization_id}:`, invokeError);
        continue;
      }

      // Update last_auto_reindex_at
      const { error: updateError } = await supabase
        .from("ai_knowledge_settings")
        .update({ last_auto_reindex_at: now.toISOString() })
        .eq("organization_id", orgSetting.organization_id);

      if (updateError) {
        console.error(`Error updating last_auto_reindex_at for org ${orgSetting.organization_id}:`, updateError);
      }

      triggered.push(orgSetting.organization_id);
    }

    console.log(`Auto-reindex complete: checked=${orgsWithSettings.length}, triggered=${triggered.length}`);

    return new Response(
      JSON.stringify({
        checked: orgsWithSettings.length,
        triggered: triggered.length,
        organizations: triggered
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Auto-reindex error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
