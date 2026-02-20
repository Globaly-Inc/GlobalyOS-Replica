import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone_number_id, organization_id } = await req.json();

    if (!phone_number_id || !organization_id) {
      return new Response(
        JSON.stringify({ error: "phone_number_id and organization_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the phone record
    const { data: phoneRecord, error: fetchErr } = await supabase
      .from("org_phone_numbers")
      .select("*")
      .eq("id", phone_number_id)
      .eq("organization_id", organization_id)
      .single();

    if (fetchErr || !phoneRecord) {
      return new Response(
        JSON.stringify({ error: "Phone number not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as releasing
    await supabase
      .from("org_phone_numbers")
      .update({ status: "releasing" })
      .eq("id", phone_number_id);

    // Release from Twilio
    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${phoneRecord.twilio_sid}.json`,
      {
        method: "DELETE",
        headers: {
          Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
        },
      }
    );

    if (!twilioRes.ok && twilioRes.status !== 404) {
      const body = await twilioRes.text();
      console.error("Twilio release error:", body);
      await supabase
        .from("org_phone_numbers")
        .update({ status: "active" })
        .eq("id", phone_number_id);
      return new Response(
        JSON.stringify({ error: "Failed to release number from Twilio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      await twilioRes.text(); // consume body
    }

    // Update status to released
    await supabase
      .from("org_phone_numbers")
      .update({ status: "released" })
      .eq("id", phone_number_id);

    // Deactivate linked inbox channel
    await supabase
      .from("inbox_channels")
      .update({ is_active: false, webhook_status: "disconnected" })
      .eq("organization_id", organization_id)
      .eq("channel_type", "sms")
      .filter("config->>'phone_number_id'", "eq", phone_number_id);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("twilio-release-number error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
