import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      title, 
      slug, 
      content, 
      focusKeyword, 
      metaDescription, 
      failedChecks 
    } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!content || !focusKeyword) {
      throw new Error('Content and focus keyword are required');
    }

    console.log('Fixing SEO issues for:', title);
    console.log('Failed checks:', failedChecks);

    const prompt = `You are an expert SEO content editor. I have a blog post that needs SEO optimization fixes.

CURRENT BLOG POST:
Title: ${title}
Slug: ${slug}
Focus Keyword: "${focusKeyword}"
Meta Description: ${metaDescription || '(none)'}

Content:
${content}

FAILED SEO CHECKS TO FIX:
${failedChecks.map((c: { label: string; info: string }) => `- ${c.label}: ${c.info}`).join('\n')}

YOUR TASK:
Revise the content to fix ALL the failed SEO checks while maintaining the original meaning and quality.

SPECIFIC REQUIREMENTS:
1. If "Focus keyword in title" failed: Naturally incorporate "${focusKeyword}" into the title (keep title 30-60 chars)
2. If "Keyword in introduction" failed: Add "${focusKeyword}" to the first paragraph within first 300 characters
3. If "Keyword density" failed: Adjust keyword usage to achieve 0.5-2.5% density (about 1-2 mentions per 100 words)
4. If "Meta description length" failed: Write a compelling meta description between 120-160 characters that includes the keyword
5. If "Content length" failed: Expand content to at least 800 words with valuable, relevant information
6. If "Subheadings used" failed: Add 3-5 H2 or H3 headings that break up the content logically
7. If "Images included" failed: Add image placeholder suggestions with alt text containing the keyword

IMPORTANT:
- Preserve all existing images and their URLs
- Keep the same HTML structure and formatting style
- Maintain the same tone and voice
- Only fix what's broken, don't rewrite sections that are already good

Output format (JSON only, no markdown code blocks):
{
  "title": "Optimized title with keyword (30-60 chars)",
  "slug": "keyword-optimized-slug",
  "metaDescription": "Compelling meta description 120-160 chars with keyword",
  "content": "Full revised HTML content with all fixes applied"
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || "";

    console.log('AI response received, parsing...');

    // Parse JSON from AI response
    let fixedData;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : aiContent.trim();
      fixedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw AI content:', aiContent);
      throw new Error('Failed to parse AI response');
    }

    console.log('Successfully fixed SEO issues');

    return new Response(
      JSON.stringify({ 
        success: true,
        title: fixedData.title,
        slug: fixedData.slug,
        metaDescription: fixedData.metaDescription,
        content: fixedData.content,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in fix-blog-seo:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
