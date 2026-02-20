import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const url = new URL(req.url);
    const phoneId = url.searchParams.get("phone_id");

    const formData = await req.formData();
    const digits = String(formData.get("Digits") || "");
    const callSid = String(formData.get("CallSid") || "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!phoneId) {
      return new Response(
        `<Response><Say>An error occurred.</Say><Hangup/></Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    const { data: phoneRecord } = await supabase
      .from("org_phone_numbers")
      .select("ivr_config, organization_id")
      .eq("id", phoneId)
      .single();

    if (!phoneRecord) {
      return new Response(
        `<Response><Say>An error occurred.</Say><Hangup/></Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    const ivrConfig = (phoneRecord.ivr_config || {}) as {
      menu_options?: { digit: string; label: string; action: string; message?: string }[];
      voicemail_enabled?: boolean;
    };

    const menuOptions = ivrConfig.menu_options || [];
    const selected = menuOptions.find((opt) => opt.digit === digits);

    if (!selected) {
      const ivrActionUrl = `${supabaseUrl}/functions/v1/twilio-ivr-action?phone_id=${phoneId}`;
      const menuPrompt = menuOptions
        .map((opt) => `Press ${opt.digit} for ${opt.label}.`)
        .join(" ");
      return new Response(
        `<Response>
          <Say>Invalid selection. ${menuPrompt}</Say>
          <Gather input="dtmf" numDigits="1" action="${ivrActionUrl}" method="POST" timeout="10">
            <Say>Please try again.</Say>
          </Gather>
          <Say>Goodbye.</Say>
          <Hangup/>
        </Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Handle different actions
    switch (selected.action) {
      case "voicemail":
        return new Response(
          `<Response>
            <Say>${selected.message || "Please leave a message after the beep."}</Say>
            <Record maxLength="120" transcribe="true" playBeep="true" action="${supabaseUrl}/functions/v1/twilio-recording-webhook" method="POST" />
            <Say>Thank you. Goodbye.</Say>
            <Hangup/>
          </Response>`,
          { headers: { "Content-Type": "text/xml" } }
        );

      case "forward":
        if (selected.message) {
          return new Response(
            `<Response>
              <Say>Connecting you now. Please hold.</Say>
              <Dial callerId="${supabaseUrl}">${selected.message}</Dial>
              <Say>The call could not be completed. Goodbye.</Say>
              <Hangup/>
            </Response>`,
            { headers: { "Content-Type": "text/xml" } }
          );
        }
        return new Response(
          `<Response><Say>No forwarding number configured. Goodbye.</Say><Hangup/></Response>`,
          { headers: { "Content-Type": "text/xml" } }
        );

      case "message":
        return new Response(
          `<Response>
            <Say>${selected.message || "Thank you for calling."}</Say>
            <Hangup/>
          </Response>`,
          { headers: { "Content-Type": "text/xml" } }
        );

      default:
        return new Response(
          `<Response>
            <Say>${selected.message || `You selected ${selected.label}. An agent will be with you shortly.`}</Say>
            <Hangup/>
          </Response>`,
          { headers: { "Content-Type": "text/xml" } }
        );
    }
  } catch (err) {
    console.error("twilio-ivr-action error:", err);
    return new Response(
      `<Response><Say>An error occurred. Please try again later.</Say><Hangup/></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  }
});
