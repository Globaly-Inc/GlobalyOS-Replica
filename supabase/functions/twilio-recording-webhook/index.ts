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
    const formData = await req.formData();
    const payload: Record<string, string> = {};
    formData.forEach((value, key) => {
      payload[key] = String(value);
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const callSid = payload.CallSid || "";
    const recordingSid = payload.RecordingSid || "";
    const recordingUrl = payload.RecordingUrl || "";
    const recordingDuration = payload.RecordingDuration || "0";
    const transcriptionText = payload.TranscriptionText || "";
    const transcriptionStatus = payload.TranscriptionStatus || "";

    if (!callSid) {
      return new Response("<Response></Response>", { headers: { "Content-Type": "text/xml" } });
    }

    // Find the usage log for this call to get org context
    const { data: usageLog } = await supabase
      .from("telephony_usage_logs")
      .select("organization_id, phone_number_id")
      .eq("twilio_sid", callSid)
      .limit(1)
      .single();

    if (!usageLog) {
      console.error("No usage log found for call:", callSid);
      return new Response("<Response></Response>", { headers: { "Content-Type": "text/xml" } });
    }

    const orgId = usageLog.organization_id;

    // Update usage log with recording info
    await supabase
      .from("telephony_usage_logs")
      .update({
        duration_seconds: parseInt(recordingDuration, 10),
        metadata: {
          recording_sid: recordingSid,
          recording_url: recordingUrl ? `${recordingUrl}.mp3` : null,
          transcription_text: transcriptionText || null,
          transcription_status: transcriptionStatus || null,
        },
      })
      .eq("twilio_sid", callSid);

    // Find the conversation for this call and add a system message with the recording
    // Look for conversations with a system message referencing this call SID
    const { data: existingMsg } = await supabase
      .from("inbox_messages")
      .select("conversation_id")
      .eq("provider_message_id", callSid)
      .eq("organization_id", orgId)
      .limit(1)
      .single();

    if (existingMsg?.conversation_id) {
      await supabase.from("inbox_messages").insert({
        organization_id: orgId,
        conversation_id: existingMsg.conversation_id,
        direction: "inbound",
        msg_type: "system",
        content: {
          body: transcriptionText
            ? `🎙️ Voicemail (${recordingDuration}s): "${transcriptionText}"`
            : `🎙️ Voicemail recording (${recordingDuration}s)`,
          recording_url: recordingUrl ? `${recordingUrl}.mp3` : null,
          recording_sid: recordingSid,
          recording_duration: parseInt(recordingDuration, 10),
          transcription: transcriptionText || null,
        },
        delivery_status: "delivered",
        created_by_type: "system",
      });
    }

    return new Response("<Response></Response>", { headers: { "Content-Type": "text/xml" } });
  } catch (err) {
    console.error("twilio-recording-webhook error:", err);
    return new Response("<Response></Response>", { headers: { "Content-Type": "text/xml" } });
  }
});
