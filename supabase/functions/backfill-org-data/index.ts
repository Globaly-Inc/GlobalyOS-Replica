import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all onboarding data with organization_info
    const { data: onboardingRecords, error: fetchError } = await supabaseAdmin
      .from("org_onboarding_data")
      .select("organization_id, organization_info")
      .not("organization_info", "is", null);

    if (fetchError) throw fetchError;

    let updated = 0;
    let skipped = 0;

    for (const record of onboardingRecords || []) {
      const orgInfo = record.organization_info as Record<string, unknown>;
      if (!orgInfo) {
        skipped++;
        continue;
      }

      const addressComponents = orgInfo.business_address_components as Record<string, unknown> | null;

      const { error: updateError } = await supabaseAdmin
        .from("organizations")
        .update({
          name: orgInfo.name || undefined,
          logo_url: orgInfo.logo_url || null,
          legal_business_name: orgInfo.legal_business_name || null,
          business_address: orgInfo.business_address || null,
          business_address_components: orgInfo.business_address_components || null,
          business_registration_number: orgInfo.business_registration_number || null,
          website: orgInfo.website || null,
          industry: orgInfo.industry || null,
          country: addressComponents?.country || null,
        })
        .eq("id", record.organization_id);

      if (updateError) {
        console.error(`Failed to update org ${record.organization_id}:`, updateError);
        skipped++;
      } else {
        updated++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Backfill complete. Updated: ${updated}, Skipped: ${skipped}` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
