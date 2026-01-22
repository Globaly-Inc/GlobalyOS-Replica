import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HoroscopeAspect {
  key: 'career' | 'relationships' | 'wellbeing' | 'money';
  label: string;
  text: string;
}

interface StructuredHoroscope {
  title: string;
  aspects: HoroscopeAspect[];
  summary_paragraph: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { zodiacSign, forceRefresh } = await req.json();

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

    // Delete existing cache if forceRefresh is true
    if (forceRefresh) {
      await supabase
        .from('daily_horoscopes')
        .delete()
        .eq('zodiac_sign', zodiacSign)
        .eq('horoscope_date', today);
    }

    // Check cache first - include new structured fields (skip if forceRefresh)
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from('daily_horoscopes')
        .select('content, title, summary_paragraph, aspects, provider')
        .eq('zodiac_sign', zodiacSign)
        .eq('horoscope_date', today)
        .maybeSingle();

      // Return cached structured data if available
      if (cached && cached.aspects && cached.summary_paragraph) {
        console.log(`Returning cached structured horoscope for ${zodiacSign}`);
        return new Response(
          JSON.stringify({ 
            horoscope: cached.content,
            title: cached.title,
            summaryParagraph: cached.summary_paragraph,
            aspects: cached.aspects,
            cached: true 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Return cached legacy data if no structured data but content exists
      if (cached && cached.content && !cached.aspects) {
        console.log(`Returning cached legacy horoscope for ${zodiacSign}`);
        return new Response(
          JSON.stringify({ horoscope: cached.content, cached: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generate new structured horoscope using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are a professional horoscope writer creating daily work and life horoscopes.

Your horoscopes should be:
- Positive and encouraging
- Focused on work, career, relationships, wellbeing, and financial growth
- Actionable with subtle guidance
- Not overly mystical or superstitious
- Work-friendly and professional

You MUST respond with valid JSON matching this exact structure:
{
  "title": "Short 3-5 word tagline for the day",
  "aspects": [
    { 
      "key": "career", 
      "label": "EXACTLY 12 WORDS: A motivational headline. Example: 'Great opportunities await as you collaborate with teammates on exciting innovative projects.'",
      "text": "5-8 word action tip"
    },
    { 
      "key": "relationships", 
      "label": "EXACTLY 12 WORDS: A motivational headline for relationships and connections.",
      "text": "5-8 word action tip"
    },
    { 
      "key": "wellbeing", 
      "label": "EXACTLY 12 WORDS: A motivational headline for health and mental wellness.",
      "text": "5-8 word action tip"
    },
    { 
      "key": "money", 
      "label": "EXACTLY 12 WORDS: A motivational headline for finances and prosperity.",
      "text": "5-8 word action tip"
    }
  ],
  "summary_paragraph": "EXACTLY 12 WORDS summarizing the overall vibe for today in one concise sentence."
}

CRITICAL REQUIREMENTS:
1. Each "label" MUST be EXACTLY 12 words - count carefully!
2. Each "text" should be 5-8 words
3. The "summary_paragraph" MUST be EXACTLY 12 words - no more, no less!

Respond ONLY with the JSON object, no markdown code blocks or additional text.`;

    const userPrompt = `Generate today's horoscope for ${zodiacSign}.`;

    console.log(`Generating structured horoscope for ${zodiacSign}`);
    
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout
    
    try {
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
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

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
      const rawContent = aiData.choices?.[0]?.message?.content?.trim();

      if (!rawContent) {
        throw new Error('Failed to generate horoscope content');
      }

      // Parse the JSON response
      let structuredHoroscope: StructuredHoroscope;
      try {
        // Remove potential markdown code block wrappers
        let jsonContent = rawContent;
        if (jsonContent.startsWith('```json')) {
          jsonContent = jsonContent.slice(7);
        }
        if (jsonContent.startsWith('```')) {
          jsonContent = jsonContent.slice(3);
        }
        if (jsonContent.endsWith('```')) {
          jsonContent = jsonContent.slice(0, -3);
        }
        jsonContent = jsonContent.trim();
        
        structuredHoroscope = JSON.parse(jsonContent);
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', parseError, rawContent);
        // Fallback: use raw content as legacy format
        const { error: insertError } = await supabase
          .from('daily_horoscopes')
          .upsert({
            zodiac_sign: zodiacSign,
            horoscope_date: today,
            content: rawContent,
            provider: 'ai'
          }, {
            onConflict: 'zodiac_sign,horoscope_date'
          });

        if (insertError) {
          console.error('Failed to cache horoscope:', insertError);
        }

        return new Response(
          JSON.stringify({ horoscope: rawContent, cached: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate structured response
      if (!structuredHoroscope.title || !structuredHoroscope.aspects || !structuredHoroscope.summary_paragraph) {
        throw new Error('Invalid structured horoscope format');
      }

      // Create legacy content from summary for backward compatibility
      const legacyContent = structuredHoroscope.summary_paragraph;

      // Cache the structured horoscope
      const { error: insertError } = await supabase
        .from('daily_horoscopes')
        .upsert({
          zodiac_sign: zodiacSign,
          horoscope_date: today,
          content: legacyContent,
          title: structuredHoroscope.title,
          summary_paragraph: structuredHoroscope.summary_paragraph,
          aspects: structuredHoroscope.aspects,
          provider: 'ai'
        }, {
          onConflict: 'zodiac_sign,horoscope_date'
        });

      if (insertError) {
        console.error('Failed to cache horoscope:', insertError);
      } else {
        console.log(`Cached structured horoscope for ${zodiacSign}`);
      }

      return new Response(
        JSON.stringify({ 
          horoscope: legacyContent,
          title: structuredHoroscope.title,
          summaryParagraph: structuredHoroscope.summary_paragraph,
          aspects: structuredHoroscope.aspects,
          cached: false 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('AI request timed out');
        return new Response(
          JSON.stringify({ error: 'Request timed out. Please try again.' }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw fetchError;
    }

  } catch (error) {
    console.error('Error in daily-horoscope function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
