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
Word count: ${wordCount || '800-1200'} words

Requirements:
1. Create an engaging, SEO-optimized title (50-60 characters ideal)
2. Write a compelling meta description (150-160 characters)
3. Use the focus keyword naturally in:
   - First paragraph
   - At least one H2 heading
   - Throughout the content (1-2% density)
   - Conclusion
4. Include 3-5 H2 subheadings
5. Add practical tips, examples, or statistics where relevant
6. End with a clear call-to-action related to GlobalyOS features
7. Make content scannable with short paragraphs and bullet points

Output format (JSON):
{
  "title": "SEO-optimized title",
  "slug": "url-friendly-slug",
  "meta_description": "Compelling meta description under 160 chars",
  "excerpt": "2-3 sentence summary for previews",
  "content": "<article HTML content with proper headings, paragraphs, lists>",
  "category": "hr-tips|product-updates|company-culture|general",
  "focus_keyword": "main keyword",
  "reading_time_minutes": estimated reading time
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
