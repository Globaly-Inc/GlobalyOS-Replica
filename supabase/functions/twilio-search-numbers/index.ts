import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { country = "US", area_code, contains, capabilities, limit = 20 } = await req.json();

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");

    if (!accountSid || !authToken) {
      return new Response(
        JSON.stringify({ error: "Twilio credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build Twilio AvailablePhoneNumbers URL
    const params = new URLSearchParams();
    if (area_code) params.set("AreaCode", area_code);
    if (contains) params.set("Contains", contains);
    if (capabilities?.sms) params.set("SmsEnabled", "true");
    if (capabilities?.voice) params.set("VoiceEnabled", "true");
    params.set("PageSize", String(Math.min(limit, 30)));

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/${country}/Local.json?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      // Try toll-free if local fails
      const tfUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/${country}/TollFree.json?${params.toString()}`;
      const tfResponse = await fetch(tfUrl, {
        headers: {
          Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
        },
      });
      const tfData = await tfResponse.json();

      if (!tfResponse.ok) {
        return new Response(
          JSON.stringify({ error: data.message || tfData.message || "Failed to search numbers" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const numbers = (tfData.available_phone_numbers || []).map((n: any) => ({
        phone_number: n.phone_number,
        friendly_name: n.friendly_name,
        country_code: country,
        capabilities: {
          sms: n.capabilities?.sms || false,
          voice: n.capabilities?.voice || false,
          mms: n.capabilities?.mms || false,
        },
        monthly_cost: 2.00, // Default Twilio pricing
        type: "toll_free",
      }));

      return new Response(
        JSON.stringify({ numbers }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const numbers = (data.available_phone_numbers || []).map((n: any) => ({
      phone_number: n.phone_number,
      friendly_name: n.friendly_name,
      country_code: country,
      capabilities: {
        sms: n.capabilities?.sms || false,
        voice: n.capabilities?.voice || false,
        mms: n.capabilities?.mms || false,
      },
      monthly_cost: 1.15, // Default Twilio local pricing
      type: "local",
    }));

    return new Response(
      JSON.stringify({ numbers }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("twilio-search-numbers error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
