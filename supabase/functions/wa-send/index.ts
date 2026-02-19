import { createClient } from "npm:@supabase/supabase-js@2";

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
    // Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const body = await req.json();
    const {
      organization_id,
      conversation_id,
      wa_contact_id,
      message_type = "text",
      content,
      template_id,
      access_token,
    } = body;

    if (!organization_id || !conversation_id) {
      return new Response(
        JSON.stringify({ error: "organization_id and conversation_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Get account
    const { data: account } = await adminClient
      .from("wa_accounts")
      .select("*")
      .eq("organization_id", organization_id)
      .eq("status", "connected")
      .maybeSingle();

    if (!account) {
      return new Response(
        JSON.stringify({ error: "No connected WhatsApp account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get conversation + contact
    const { data: conversation } = await adminClient
      .from("wa_conversations")
      .select("*, wa_contacts(*)")
      .eq("id", conversation_id)
      .eq("organization_id", organization_id)
      .single();

    if (!conversation) {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contact = conversation.wa_contacts;

    // === COMPLIANCE CHECKS ===

    // 1. Opt-out check
    if (contact.opt_in_status === "opted_out") {
      await adminClient.from("wa_audit_log").insert({
        organization_id,
        actor_id: userId,
        action: "send_blocked_opted_out",
        entity_type: "wa_contact",
        entity_id: contact.id,
        details: { reason: "Contact opted out" },
      });
      return new Response(
        JSON.stringify({ error: "Contact has opted out of messaging" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Window check
    const windowOpen =
      conversation.window_open_until &&
      new Date(conversation.window_open_until) > new Date();

    if (!windowOpen && message_type !== "template") {
      return new Response(
        JSON.stringify({
          error: "24h service window closed. Only template messages allowed.",
          window_open_until: conversation.window_open_until,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Frequency cap
    const today = new Date().toISOString().split("T")[0];
    const { count: todayCount } = await adminClient
      .from("wa_messages")
      .select("*", { count: "exact", head: true })
      .eq("conversation_id", conversation_id)
      .eq("direction", "outbound")
      .gte("created_at", `${today}T00:00:00Z`);

    const cap = account.frequency_cap_per_day || 10;
    if ((todayCount ?? 0) >= cap) {
      await adminClient.from("wa_audit_log").insert({
        organization_id,
        actor_id: userId,
        action: "send_blocked_frequency_cap",
        entity_type: "wa_conversation",
        entity_id: conversation_id,
        details: { daily_count: todayCount, cap },
      });
      return new Response(
        JSON.stringify({ error: "Daily frequency cap reached", cap, sent_today: todayCount }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === SEND MESSAGE via Meta API ===
    const metaToken = access_token || Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    if (!metaToken) {
      return new Response(
        JSON.stringify({ error: "No WhatsApp access token configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let metaPayload: Record<string, any> = {
      messaging_product: "whatsapp",
      to: contact.phone,
    };

    if (message_type === "text") {
      metaPayload.type = "text";
      metaPayload.text = { body: content?.body || content };
    } else if (message_type === "template") {
      if (!template_id) {
        return new Response(
          JSON.stringify({ error: "template_id required for template messages" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: template } = await adminClient
        .from("wa_templates")
        .select("*")
        .eq("id", template_id)
        .eq("organization_id", organization_id)
        .single();

      if (!template || template.status !== "approved") {
        return new Response(
          JSON.stringify({ error: "Template not found or not approved" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      metaPayload.type = "template";
      metaPayload.template = {
        name: template.name,
        language: { code: template.language },
        components: content?.components || [],
      };
    } else if (message_type === "interactive") {
      metaPayload.type = "interactive";
      metaPayload.interactive = content;
    }

    const metaRes = await fetch(
      `https://graph.facebook.com/v21.0/${account.phone_number_id}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${metaToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metaPayload),
      }
    );

    const metaResult = await metaRes.json();

    if (!metaRes.ok) {
      // Save failed message
      await adminClient.from("wa_messages").insert({
        organization_id,
        conversation_id,
        direction: "outbound",
        msg_type: message_type === "template" ? "template" : "text",
        content: content || {},
        template_id: template_id || null,
        status: "failed",
        error_code: metaResult?.error?.code?.toString(),
        error_message: metaResult?.error?.message,
        status_updated_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({ error: "Failed to send", details: metaResult }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const waMessageId = metaResult.messages?.[0]?.id;

    // Save sent message
    const { data: savedMsg } = await adminClient
      .from("wa_messages")
      .insert({
        organization_id,
        conversation_id,
        direction: "outbound",
        msg_type: message_type === "template" ? "template" : "text",
        content: content || {},
        wa_message_id: waMessageId,
        template_id: template_id || null,
        status: "sent",
        status_updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    // Update conversation
    await adminClient
      .from("wa_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversation_id);

    // Update contact last_outbound_at
    await adminClient
      .from("wa_contacts")
      .update({ last_outbound_at: new Date().toISOString() })
      .eq("id", contact.id);

    // Audit log
    await adminClient.from("wa_audit_log").insert({
      organization_id,
      actor_id: userId,
      action: "message_sent",
      entity_type: "wa_message",
      entity_id: savedMsg?.id,
      details: {
        conversation_id,
        message_type,
        wa_message_id: waMessageId,
        window_open: windowOpen,
      },
    });

    return new Response(
      JSON.stringify({ success: true, message: savedMsg }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("wa-send error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
