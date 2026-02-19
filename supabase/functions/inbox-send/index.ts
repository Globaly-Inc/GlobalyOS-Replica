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
    const {
      conversation_id,
      organization_id,
      content,
      msg_type = "text",
    } = await req.json();

    if (!conversation_id || !organization_id) {
      return new Response(
        JSON.stringify({ error: "conversation_id and organization_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get conversation to determine channel
    const { data: conversation, error: convError } = await supabase
      .from("inbox_conversations")
      .select("*, inbox_channels(*), inbox_contacts(*)")
      .eq("id", conversation_id)
      .eq("organization_id", organization_id)
      .single();

    if (convError || !conversation) {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the auth user
    const authHeader = req.headers.get("Authorization");
    let createdBy: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claims } = await anonClient.auth.getClaims(token);
      createdBy = claims?.claims?.sub as string || null;
    }

    // Insert the message
    const isNote = msg_type === "note";
    const { data: message, error: msgError } = await supabase
      .from("inbox_messages")
      .insert({
        organization_id,
        conversation_id,
        direction: isNote ? "outbound" : "outbound",
        msg_type: isNote ? "note" : msg_type,
        content: content,
        delivery_status: isNote ? "delivered" : "pending",
        created_by: createdBy,
        created_by_type: "agent",
      })
      .select()
      .single();

    if (msgError) {
      console.error("Failed to insert message:", msgError);
      return new Response(
        JSON.stringify({ error: "Failed to save message" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update conversation
    const convUpdate: Record<string, unknown> = {
      last_message_at: new Date().toISOString(),
      last_outbound_at: new Date().toISOString(),
    };
    if (!isNote && conversation.status === "open" && !conversation.first_response_at) {
      convUpdate.first_response_at = new Date().toISOString();
    }

    await supabase
      .from("inbox_conversations")
      .update(convUpdate)
      .eq("id", conversation_id);

    // TODO: For non-note messages, dispatch to the appropriate channel connector
    // based on conversation.channel_type (whatsapp, telegram, etc.)
    // For now, messages are stored locally and marked as sent
    if (!isNote) {
      // Simulate delivery - in production, the connector would update this
      await supabase
        .from("inbox_messages")
        .update({ delivery_status: "sent" })
        .eq("id", message.id);
    }

    return new Response(
      JSON.stringify({ success: true, message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("inbox-send error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
