import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { zodiacSign } = await req.json();

    if (!zodiacSign) {
      return new Response(
        JSON.stringify({ error: 'Zodiac sign is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split('T')[0];

    // Check cache first
    const { data: cached } = await supabase
      .from('daily_horoscopes')
      .select('content')
      .eq('zodiac_sign', zodiacSign)
      .eq('horoscope_date', today)
      .maybeSingle();

    if (cached) {
      console.log(`Returning cached horoscope for ${zodiacSign}`);
      return new Response(
        JSON.stringify({ horoscope: cached.content, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate new horoscope using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are a professional horoscope writer creating daily work and productivity horoscopes. 
Your horoscopes should be:
- Positive and encouraging
- Focused on work, career, and professional growth
- 2-3 sentences long
- Actionable with subtle guidance
- Not overly mystical or superstitious

Write in second person ("You will..." or "Today brings...").`;

    const userPrompt = `Write today's horoscope for ${zodiacSign}. Focus on work, productivity, and professional relationships.`;

    console.log(`Generating horoscope for ${zodiacSign}`);
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        console.error('Rate limit exceeded');
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        console.error('Payment required');
        return new Response(
          JSON.stringify({ error: 'AI service quota exceeded.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const horoscope = aiData.choices?.[0]?.message?.content?.trim();

    if (!horoscope) {
      throw new Error('Failed to generate horoscope content');
    }

    // Cache the horoscope
    const { error: insertError } = await supabase
      .from('daily_horoscopes')
      .upsert({
        zodiac_sign: zodiacSign,
        horoscope_date: today,
        content: horoscope,
      }, {
        onConflict: 'zodiac_sign,horoscope_date'
      });

    if (insertError) {
      console.error('Failed to cache horoscope:', insertError);
    } else {
      console.log(`Cached horoscope for ${zodiacSign}`);
    }

    return new Response(
      JSON.stringify({ horoscope, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in daily-horoscope function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
