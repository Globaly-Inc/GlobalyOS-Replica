import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatPushPayload {
  message_id: string;
  sender_employee_id: string;
  conversation_id?: string;
  space_id?: string;
  content: string;
  content_type: string;
  organization_slug?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { 
      message_id, 
      sender_employee_id, 
      conversation_id, 
      space_id, 
      content,
      content_type,
      organization_slug
    }: ChatPushPayload = await req.json();

    console.log(`Chat push notification request: message=${message_id}, sender=${sender_employee_id}`);

    // Get sender info
    const { data: sender } = await supabase
      .from("employees")
      .select("id, user_id, organization_id, profiles:user_id(full_name, avatar_url)")
      .eq("id", sender_employee_id)
      .single();

    if (!sender) {
      console.error("Sender not found:", sender_employee_id);
      return new Response(
        JSON.stringify({ success: false, error: "Sender not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const senderName = (sender.profiles as any)?.full_name || "Someone";

    // Get organization slug if not provided
    let orgSlug = organization_slug;
    if (!orgSlug && sender.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("slug")
        .eq("id", sender.organization_id)
        .single();
      orgSlug = org?.slug;
    }

    // Determine recipients based on conversation or space
    let recipientUserIds: string[] = [];
    let chatName = "";
    let chatUrl = "";

    if (conversation_id) {
      // Get other participants in the conversation
      const { data: participants } = await supabase
        .from("chat_participants")
        .select("employee_id, is_muted, employees:employee_id(user_id)")
        .eq("conversation_id", conversation_id)
        .neq("employee_id", sender_employee_id);

      // Filter out muted participants
      recipientUserIds = (participants || [])
        .filter(p => !p.is_muted && (p.employees as any)?.user_id)
        .map(p => (p.employees as any).user_id);

      chatName = senderName;
      chatUrl = orgSlug ? `/org/${orgSlug}/chat?conversation=${conversation_id}` : `/chat?conversation=${conversation_id}`;
    } else if (space_id) {
      // Get space info
      const { data: space } = await supabase
        .from("chat_spaces")
        .select("name")
        .eq("id", space_id)
        .single();

      // Get space members (excluding sender and muted members)
      const { data: members } = await supabase
        .from("chat_space_members")
        .select("employee_id, notification_setting, employees:employee_id(user_id)")
        .eq("space_id", space_id)
        .neq("employee_id", sender_employee_id);

      // Filter out muted members
      recipientUserIds = (members || [])
        .filter(m => m.notification_setting !== "mute" && (m.employees as any)?.user_id)
        .map(m => (m.employees as any).user_id);

      chatName = space?.name || "Space";
      chatUrl = orgSlug ? `/org/${orgSlug}/chat?space=${space_id}` : `/chat?space=${space_id}`;
    }

    if (recipientUserIds.length === 0) {
      console.log("No recipients to notify");
      return new Response(
        JSON.stringify({ success: true, message: "No recipients", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending push to ${recipientUserIds.length} recipients`);

    // Prepare notification content
    const title = conversation_id ? senderName : `${senderName} in ${chatName}`;
    let body = content;
    if (content_type === "file") {
      body = "📎 Sent an attachment";
    } else if (content_type === "voice") {
      body = "🎤 Sent a voice message";
    } else if (content_type === "system") {
      body = content; // System messages show as-is
    } else if (content.length > 100) {
      body = content.substring(0, 97) + "...";
    }

    // Send push to each recipient
    let sentCount = 0;
    const errors: string[] = [];

    for (const userId of recipientUserIds) {
      try {
        const { error } = await supabase.functions.invoke("send-push-notification", {
          body: {
            user_id: userId,
            title,
            body,
            url: chatUrl,
            tag: `chat-${conversation_id || space_id}`,
            data: {
              type: "chat_message",
              message_id,
              conversation_id,
              space_id,
            },
          },
        });

        if (error) {
          console.error(`Failed to invoke push for user ${userId}:`, error);
          errors.push(userId);
        } else {
          sentCount++;
        }
      } catch (err) {
        console.error(`Exception sending push to user ${userId}:`, err);
        errors.push(userId);
      }
    }

    console.log(`Chat push complete: ${sentCount} sent, ${errors.length} failed`);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, failed: errors.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-chat-push-notification:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
