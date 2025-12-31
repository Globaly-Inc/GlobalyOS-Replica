import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recording_id } = await req.json();

    if (!recording_id) {
      throw new Error("recording_id is required");
    }

    console.log(`Generating summary for recording: ${recording_id}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get recording with transcript
    const { data: recording, error: recordingError } = await supabase
      .from("call_recordings")
      .select("*, call_sessions(*)")
      .eq("id", recording_id)
      .single();

    if (recordingError || !recording) {
      throw new Error(`Recording not found: ${recordingError?.message}`);
    }

    if (!recording.transcript) {
      console.log("No transcript available yet, skipping summarization");
      return new Response(
        JSON.stringify({ success: false, message: "No transcript available" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate summary using AI
    // In production, integrate with OpenAI or another AI provider
    // const response = await fetch('https://api.openai.com/v1/chat/completions', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     model: 'gpt-4o-mini',
    //     messages: [
    //       {
    //         role: 'system',
    //         content: 'You are a helpful assistant that summarizes call transcripts. Provide a concise summary including key topics discussed, decisions made, and action items.'
    //       },
    //       {
    //         role: 'user',
    //         content: `Please summarize this call transcript:\n\n${recording.transcript}`
    //       }
    //     ],
    //   }),
    // });

    // Placeholder summary
    const ai_summary = `Call Summary:
• Duration: ${recording.duration_seconds ? Math.floor(recording.duration_seconds / 60) : 'Unknown'} minutes
• Type: ${recording.call_sessions?.call_type || 'Unknown'} call
• Status: Recording processed successfully

[Full AI summary will be available when OpenAI integration is configured]`;

    // Update recording with summary
    const { error: updateError } = await supabase
      .from("call_recordings")
      .update({ ai_summary })
      .eq("id", recording_id);

    if (updateError) {
      throw new Error(`Failed to update summary: ${updateError.message}`);
    }

    console.log(`Summary generated for recording: ${recording_id}`);

    return new Response(
      JSON.stringify({ success: true, ai_summary }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error summarizing call:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
