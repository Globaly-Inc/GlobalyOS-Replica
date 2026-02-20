import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface IvrNode {
  id: string;
  type: string;
  label: string;
  greeting_text?: string;
  menu_options?: { digit: string; label: string; target_node_id: string }[];
  timeout?: number;
  forward_number?: string;
  voicemail_prompt?: string;
  voicemail_max_length?: number;
  children?: string[];
}

interface IvrTreeConfig {
  nodes: IvrNode[];
  business_hours?: { enabled: boolean; start: string; end: string; timezone: string; after_hours_greeting: string };
  voicemail_enabled?: boolean;
}

function isTreeConfig(config: any): config is IvrTreeConfig {
  return Array.isArray(config?.nodes);
}

function findNode(nodes: IvrNode[], id: string): IvrNode | undefined {
  return nodes.find((n) => n.id === id);
}

function generateTwiMLForNode(node: IvrNode, nodes: IvrNode[], supabaseUrl: string, phoneId: string): string {
  switch (node.type) {
    case "greeting":
    case "message": {
      const sayText = node.greeting_text || "Thank you for calling.";
      const childId = node.children?.[0];
      if (childId) {
        const child = findNode(nodes, childId);
        if (child) {
          // If child is a menu, inline the gather
          if (child.type === "menu") {
            return generateTwiMLForNode(child, nodes, supabaseUrl, phoneId);
          }
          // Otherwise, say then continue to child
          return `<Say>${sayText}</Say>\n${generateTwiMLForNode(child, nodes, supabaseUrl, phoneId)}`;
        }
      }
      return `<Say>${sayText}</Say><Hangup/>`;
    }

    case "menu": {
      const actionUrl = `${supabaseUrl}/functions/v1/twilio-ivr-action?phone_id=${phoneId}&node_id=${node.id}`;
      const parentGreeting = nodes.find(
        (n) => (n.type === "greeting" || n.type === "message") && n.children?.includes(node.id)
      );
      const greetingText = parentGreeting?.greeting_text || "";
      const menuPrompt = (node.menu_options || [])
        .map((opt) => `Press ${opt.digit} for ${opt.label}.`)
        .join(" ");
      const timeout = node.timeout || 10;
      return `<Gather input="dtmf" numDigits="1" action="${actionUrl}" method="POST" timeout="${timeout}">
  <Say>${greetingText} ${menuPrompt}</Say>
</Gather>
<Say>We didn't receive any input. Goodbye.</Say>
<Hangup/>`;
    }

    case "forward": {
      const number = node.forward_number || "";
      if (!number) {
        return `<Say>No forwarding number configured. Goodbye.</Say><Hangup/>`;
      }
      return `<Say>Connecting you now. Please hold.</Say><Dial>${number}</Dial><Say>The call could not be completed. Goodbye.</Say><Hangup/>`;
    }

    case "voicemail": {
      const prompt = node.voicemail_prompt || "Please leave a message after the beep.";
      const maxLength = node.voicemail_max_length || 120;
      return `<Say>${prompt}</Say><Record maxLength="${maxLength}" transcribe="true" playBeep="true" action="${supabaseUrl}/functions/v1/twilio-recording-webhook" method="POST" /><Say>Thank you. Goodbye.</Say><Hangup/>`;
    }

    case "hangup":
      return `<Hangup/>`;

    default:
      return `<Say>Thank you for calling.</Say><Hangup/>`;
  }
}

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
    const nodeId = url.searchParams.get("node_id"); // Tree-based: which menu node we're at

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

    const ivrConfig = phoneRecord.ivr_config || {};

    // --- Tree-based IVR ---
    if (isTreeConfig(ivrConfig)) {
      const nodes = ivrConfig.nodes;
      const menuNode = nodeId ? findNode(nodes, nodeId) : null;

      if (!menuNode || menuNode.type !== "menu") {
        return new Response(
          `<Response><Say>An error occurred.</Say><Hangup/></Response>`,
          { headers: { "Content-Type": "text/xml" } }
        );
      }

      const selected = menuNode.menu_options?.find((opt) => opt.digit === digits);

      if (!selected) {
        // Invalid selection — replay menu
        const twiml = generateTwiMLForNode(menuNode, nodes, supabaseUrl, phoneId);
        return new Response(`<Response><Say>Invalid selection.</Say>${twiml}</Response>`, {
          headers: { "Content-Type": "text/xml" },
        });
      }

      const targetNode = findNode(nodes, selected.target_node_id);
      if (!targetNode) {
        return new Response(
          `<Response><Say>An error occurred.</Say><Hangup/></Response>`,
          { headers: { "Content-Type": "text/xml" } }
        );
      }

      const twiml = generateTwiMLForNode(targetNode, nodes, supabaseUrl, phoneId);
      return new Response(`<Response>${twiml}</Response>`, {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // --- Legacy flat IVR (backward compatible) ---
    const legacyConfig = ivrConfig as {
      menu_options?: { digit: string; label: string; action: string; message?: string }[];
      voicemail_enabled?: boolean;
    };

    const menuOptions = legacyConfig.menu_options || [];
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
              <Dial>${selected.message}</Dial>
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
