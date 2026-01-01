import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { call_id } = await req.json();
    
    if (!call_id) {
      return new Response(
        JSON.stringify({ error: "call_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Declining call ${call_id} from notification`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Update call participants to declined status
    const { error: participantError } = await supabase
      .from('call_participants')
      .update({ status: 'declined', left_at: new Date().toISOString() })
      .eq('call_id', call_id)
      .eq('status', 'ringing');
    
    if (participantError) {
      console.error('Error updating participants:', participantError);
    }
    
    // Check if all participants have declined
    const { data: participants } = await supabase
      .from('call_participants')
      .select('status')
      .eq('call_id', call_id);
    
    const allDeclined = participants?.every(p => 
      p.status === 'declined' || p.status === 'missed' || p.status === 'left'
    );
    
    if (allDeclined) {
      // End the call session
      await supabase
        .from('call_sessions')
        .update({ 
          status: 'declined', 
          ended_at: new Date().toISOString() 
        })
        .eq('id', call_id);
      
      console.log('Call session ended - all participants declined');
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Call declined",
        call_id
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error declining call:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
