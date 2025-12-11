import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Rate limiting constants
const MAX_QUOTES_PER_IP_PER_HOUR = 30;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Get client IP from request headers
function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         req.headers.get('x-real-ip') ||
         req.headers.get('cf-connecting-ip') ||
         'unknown';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = getClientIP(req);
  console.log('Quote request from IP:', clientIP);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // IP-based rate limiting using login_attempts table
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: ipRequestCount } = await supabase
      .from('login_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', clientIP)
      .eq('attempt_type', 'quote_gen')
      .gte('created_at', oneHourAgo);

    if (ipRequestCount !== null && ipRequestCount >= MAX_QUOTES_PER_IP_PER_HOUR) {
      console.log(`Rate limit exceeded for IP ${clientIP}: ${ipRequestCount} requests`);
      // Return fallback quote instead of error to not break UX
      return new Response(JSON.stringify({
        quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
        author: "Winston Churchill"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log the quote generation attempt
    await supabase.from('login_attempts').insert({
      email: 'system@quote-gen',
      ip_address: clientIP,
      attempt_type: 'quote_gen',
      success: true,
    });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a motivational quote generator. Generate ONE short, inspiring quote about teamwork, success, or motivation. The quote should be uplifting and suitable for a workplace. Also provide the author name (can be a famous person or 'Unknown'). Respond ONLY in this exact JSON format: {\"quote\": \"the quote text\", \"author\": \"Author Name\"}"
          },
          {
            role: "user",
            content: "Generate a motivational quote for a team."
          }
        ],
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse the JSON response
    let quoteData;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        quoteData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      // Fallback if parsing fails
      quoteData = {
        quote: "Coming together is a beginning, staying together is progress, and working together is success.",
        author: "Henry Ford"
      };
    }

    return new Response(JSON.stringify(quoteData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating quote:", error);
    return new Response(
      JSON.stringify({ 
        quote: "The strength of the team is each individual member. The strength of each member is the team.",
        author: "Phil Jackson"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
