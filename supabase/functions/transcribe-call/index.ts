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

    console.log(`Processing transcription for recording: ${recording_id}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get recording details
    const { data: recording, error: recordingError } = await supabase
      .from("call_recordings")
      .select("*")
      .eq("id", recording_id)
      .single();

    if (recordingError || !recording) {
      throw new Error(`Recording not found: ${recordingError?.message}`);
    }

    // Update status to processing
    await supabase
      .from("call_recordings")
      .update({ status: "processing" })
      .eq("id", recording_id);

    // Download the recording file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("call-recordings")
      .download(recording.storage_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download recording: ${downloadError?.message}`);
    }

    // For now, we'll use a placeholder transcription
    // In production, you would integrate with OpenAI Whisper or ElevenLabs
    // const formData = new FormData();
    // formData.append('file', fileData, 'recording.webm');
    // formData.append('model', 'whisper-1');
    // 
    // const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
    //   },
    //   body: formData,
    // });

    // Placeholder transcript
    const transcript = `[Transcription pending - audio file received, ${fileData.size} bytes]`;

    // Update recording with transcript
    const { error: updateError } = await supabase
      .from("call_recordings")
      .update({
        transcript,
        status: "ready",
      })
      .eq("id", recording_id);

    if (updateError) {
      throw new Error(`Failed to update transcript: ${updateError.message}`);
    }

    // Trigger summarization
    await fetch(`${supabaseUrl}/functions/v1/summarize-call`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ recording_id }),
    }).catch(console.error);

    console.log(`Transcription completed for recording: ${recording_id}`);

    return new Response(
      JSON.stringify({ success: true, transcript }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error transcribing call:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
