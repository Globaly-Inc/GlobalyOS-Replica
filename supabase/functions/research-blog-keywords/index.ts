import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get existing keywords to avoid duplicates
    const { data: existingKeywords } = await supabase
      .from('blog_keywords')
      .select('keyword');

    const existingList = existingKeywords?.map(k => k.keyword.toLowerCase()) || [];

    // Get recent blog posts to understand content gaps
    const { data: recentPosts } = await supabase
      .from('blog_posts')
      .select('title, category, focus_keyword')
      .order('created_at', { ascending: false })
      .limit(20);

    const prompt = `You are an SEO keyword research expert for GlobalyOS, a modern HRMS and team collaboration SaaS platform.

GlobalyOS features include:
- Employee management and directory
- Leave and attendance tracking
- Performance reviews and KPIs
- Team wiki and knowledge base
- Internal chat and collaboration
- Calendar and scheduling

Current blog topics covered:
${recentPosts?.map(p => `- ${p.title} (${p.focus_keyword || 'no keyword'})`).join('\n') || 'No posts yet'}

Keywords already in our database (DO NOT suggest these):
${existingList.slice(0, 50).join(', ') || 'None yet'}

Research and suggest 15-20 NEW high-value keywords for blog content that would:
1. Attract HR professionals, startup founders, and team leaders
2. Have good search volume in the HRMS/HR tech space
3. Be relevant to GlobalyOS features and target audience
4. Include a mix of:
   - Informational keywords (how to, what is, guide)
   - Commercial intent keywords (best, top, vs, alternative)
   - Long-tail keywords (specific problems/solutions)

For each keyword, provide:
- The keyword phrase
- Estimated difficulty (easy/medium/hard)
- Relevance score to GlobalyOS (1-10)
- Best category for content (hr-tips, product-updates, company-culture, general)

Output as JSON array:
[
  {
    "keyword": "keyword phrase",
    "difficulty": "easy|medium|hard",
    "relevance_score": 8,
    "category": "hr-tips",
    "search_volume": estimated monthly searches (number)
  }
]`;

    console.log('Researching new blog keywords...');

    const response = await fetch("https://api.lovable.dev/api/v1/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error: ${errorText}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || "";

    // Parse JSON from AI response
    let keywords;
    try {
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : aiContent.trim();
      keywords = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse keyword suggestions');
    }

    if (!Array.isArray(keywords)) {
      throw new Error('Invalid keyword format from AI');
    }

    // Filter out existing keywords and insert new ones
    const newKeywords = keywords.filter(
      (k: any) => !existingList.includes(k.keyword.toLowerCase())
    );

    const insertData = newKeywords.map((k: any) => ({
      keyword: k.keyword,
      difficulty: k.difficulty,
      relevance_score: k.relevance_score,
      category: k.category,
      search_volume: k.search_volume,
      suggested_by_ai: true,
      is_active: true,
      last_analyzed_at: new Date().toISOString(),
    }));

    if (insertData.length > 0) {
      const { error: insertError } = await supabase
        .from('blog_keywords')
        .insert(insertData);

      if (insertError) {
        console.error('Failed to insert keywords:', insertError);
        throw insertError;
      }
    }

    console.log(`Successfully added ${insertData.length} new keywords`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Added ${insertData.length} new keywords`,
        keywords: insertData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in research-blog-keywords:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
