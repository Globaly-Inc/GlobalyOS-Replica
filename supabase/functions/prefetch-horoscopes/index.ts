import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ZODIAC_SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer', 
  'leo', 'virgo', 'libra', 'scorpio', 
  'sagittarius', 'capricorn', 'aquarius', 'pisces'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    console.log('Starting horoscope pre-fetch for all 12 zodiac signs...');
    
    const results: { sign: string; success: boolean; error?: string }[] = [];
    
    // Process signs sequentially to avoid rate limiting
    for (const sign of ZODIAC_SIGNS) {
      try {
        console.log(`Fetching horoscope for ${sign}...`);
        
        const response = await fetch(`${supabaseUrl}/functions/v1/daily-horoscope`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ 
            zodiacSign: sign,
            forceRefresh: true  // Force new generation for today
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`Successfully pre-fetched horoscope for ${sign} (provider: ${data.provider || 'unknown'})`);
          results.push({ sign, success: true });
        } else {
          const errorText = await response.text();
          console.error(`Failed to fetch ${sign}: ${response.status} - ${errorText}`);
          results.push({ sign, success: false, error: errorText });
        }
        
        // Add delay between requests to avoid rate limiting (2 seconds)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`Error fetching ${sign}:`, error);
        results.push({ 
          sign, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`Pre-fetch complete: ${successful} succeeded, ${failed} failed`);
    
    return new Response(
      JSON.stringify({ 
        message: `Pre-fetched ${successful}/12 horoscopes`,
        results,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in prefetch-horoscopes:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
