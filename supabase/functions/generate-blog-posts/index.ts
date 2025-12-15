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
    const { keywords, audience, tone, wordCount, count = 5 } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!keywords || keywords.length === 0) {
      throw new Error('At least one keyword is required');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const posts = [];

    for (let i = 0; i < count; i++) {
      const keyword = keywords[i % keywords.length];
      
      const prompt = `You are an expert SEO content writer for GlobalyOS, a modern HRMS and team collaboration SaaS platform.

Write a comprehensive, SEO-optimized blog post about: "${keyword}"

Target audience: ${audience || 'HR professionals and business leaders'}
Tone: ${tone || 'professional yet conversational'}
Word count: ${wordCount || '1000-1500'} words minimum

=== CRITICAL SEO REQUIREMENTS (ALL MUST BE MET) ===

1. TITLE (30-60 characters):
   - MUST include "${keyword}" naturally
   - Make it compelling and click-worthy
   - Character count must be between 30-60

2. META DESCRIPTION (120-160 characters):
   - MUST include "${keyword}" in first half
   - Compelling call-to-action
   - Exactly 120-160 characters (not more, not less)

3. INTRODUCTION (first 300 characters):
   - MUST include "${keyword}" within the first 2 sentences
   - Hook the reader immediately
   - Set up what the article will cover

4. KEYWORD DENSITY (1-2%):
   - Use "${keyword}" naturally throughout (approximately 1-2 times per 100 words)
   - Include variations and related terms
   - Never force or stuff keywords

5. CONTENT STRUCTURE:
   - Minimum 1000 words (aim for 1200-1500)
   - Include 4-6 H2 subheadings (at least one should contain the keyword)
   - Use H3 subheadings for sub-sections
   - Short paragraphs (2-4 sentences max)
   - Include at least 2 bullet or numbered lists

6. IMAGES (placeholders):
   - Include 2-3 image placeholders with this format:
     <figure><img src="[IMAGE_PLACEHOLDER]" alt="descriptive alt text with ${keyword}" /><figcaption>Caption here</figcaption></figure>
   - Alt text MUST describe image AND include keyword naturally

7. INTERNAL LINKING (suggestions):
   - Add 2-3 internal link placeholders: [INTERNAL_LINK: suggested topic]
   - These will be replaced with actual links

8. CALL TO ACTION:
   - End with clear CTA related to GlobalyOS features
   - Make it actionable and relevant

=== OUTPUT FORMAT (JSON only, no code blocks) ===
{
  "title": "SEO-optimized title with keyword (30-60 chars)",
  "slug": "keyword-in-url-slug",
  "meta_description": "Keyword in first half, compelling, 120-160 chars exactly",
  "excerpt": "2-3 sentence summary with keyword for previews",
  "content": "<article>Full HTML content with h2/h3 headings, paragraphs, lists, image placeholders</article>",
  "category": "HR Technology|Employee Management|Workplace Culture|Remote Work|Leadership|Performance",
  "focus_keyword": "${keyword}",
  "reading_time_minutes": estimated_reading_time_number
}`;

      console.log(`Generating blog post ${i + 1}/${count} for keyword: ${keyword}`);

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-pro',
          messages: [
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`AI API error for post ${i + 1}:`, response.status, errorText);
        continue;
      }

      const data = await response.json();
      const aiContent = data.choices?.[0]?.message?.content || "";

      // Parse JSON from AI response
      let postData;
      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonStr = jsonMatch ? jsonMatch[1].trim() : aiContent.trim();
        postData = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error(`Failed to parse AI response for post ${i + 1}:`, parseError);
        continue;
      }

      // Generate featured image using AI
      let coverImageUrl = null;
      try {
        const imagePrompt = `Professional blog header image for article about "${postData.title}". Modern, clean design with subtle tech/business elements. Abstract, professional, suitable for HRMS/business software blog. No text overlay.`;
        
        const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'google/gemini-3-pro-image-preview',
            prompt: imagePrompt,
            size: '1792x1024',
          }),
        });

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          if (imageData.data?.[0]?.url) {
            // Download and upload to Supabase storage
            const imgFetch = await fetch(imageData.data[0].url);
            const imgBlob = await imgFetch.blob();
            const imgBuffer = await imgBlob.arrayBuffer();
            
            const fileName = `${postData.slug}-${Date.now()}.png`;
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('blog-images')
              .upload(fileName, imgBuffer, {
                contentType: 'image/png',
                upsert: true
              });

            if (!uploadError) {
              const { data: urlData } = supabase.storage
                .from('blog-images')
                .getPublicUrl(fileName);
              coverImageUrl = urlData.publicUrl;
            }
          }
        }
      } catch (imgError) {
        console.error(`Failed to generate image for post ${i + 1}:`, imgError);
      }

      // Insert post into database
      const { data: insertedPost, error: insertError } = await supabase
        .from('blog_posts')
        .insert({
          title: postData.title,
          slug: `${postData.slug}-${Date.now()}`, // Ensure unique slug
          meta_title: postData.title,
          meta_description: postData.meta_description,
          excerpt: postData.excerpt,
          content: postData.content,
          category: postData.category || 'general',
          focus_keyword: postData.focus_keyword || keyword,
          reading_time_minutes: postData.reading_time_minutes || Math.ceil(postData.content.split(/\s+/).length / 200),
          cover_image_url: coverImageUrl,
          og_image_url: coverImageUrl,
          author_name: 'GlobalyOS Team',
          ai_generated: true,
          generation_status: 'pending_review',
          generation_metadata: {
            keywords: [keyword],
            audience,
            tone,
            wordCount,
            generated_at: new Date().toISOString()
          },
          is_published: false,
          seo_score: 0, // Will be calculated when editing
        })
        .select()
        .single();

      if (insertError) {
        console.error(`Failed to insert post ${i + 1}:`, insertError);
        continue;
      }

      posts.push(insertedPost);
      console.log(`Successfully created post: ${postData.title}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Generated ${posts.length} blog posts`,
        posts 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in generate-blog-posts:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
