import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const PEXELS_API_KEY = Deno.env.get('PEXELS_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Track used Pexels image IDs to prevent duplicates across blog posts
const usedImageIds = new Set<number>();

// Search for stock images on Pexels, avoiding already-used images
async function searchPexelsImage(query: string): Promise<{ url: string; attribution: string; photographerUrl: string; photoId: number } | null> {
  if (!PEXELS_API_KEY) {
    console.log('Pexels API key not configured');
    return null;
  }

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15&orientation=landscape`,
      { headers: { Authorization: PEXELS_API_KEY } }
    );

    if (!response.ok) {
      console.error('Pexels API error:', response.status);
      return null;
    }

    const data = await response.json();
    if (data.photos?.length > 0) {
      // Find first photo not already used
      const availablePhoto = data.photos.find((p: any) => !usedImageIds.has(p.id));
      
      if (!availablePhoto) {
        console.log('All Pexels results already used, using first result');
        const photo = data.photos[0];
        return {
          url: photo.src.large,
          attribution: `Photo by ${photo.photographer} on Pexels`,
          photographerUrl: photo.photographer_url || 'https://www.pexels.com',
          photoId: photo.id
        };
      }
      
      // Mark this image as used
      usedImageIds.add(availablePhoto.id);
      
      // Use 'large' size (max 940x627) to stay well under 1920x1280 limit
      return {
        url: availablePhoto.src.large,
        attribution: `Photo by ${availablePhoto.photographer} on Pexels`,
        photographerUrl: availablePhoto.photographer_url || 'https://www.pexels.com',
        photoId: availablePhoto.id
      };
    }
  } catch (error) {
    console.error('Pexels search error:', error);
  }

  return null;
}

// Download image from URL and upload to Supabase storage
async function downloadAndUploadImage(
  supabase: any,
  imageUrl: string,
  fileName: string
): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;

    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const extension = contentType.includes('png') ? 'png' : 'jpg';
    const finalFileName = `${fileName}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from('blog-images')
      .upload(finalFileName, buffer, {
        contentType,
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('blog-images')
      .getPublicUrl(finalFileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Download/upload error:', error);
    return null;
  }
}

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

2. META DESCRIPTION (STRICT 160 characters max):
   - MUST include "${keyword}" in first half
   - Compelling call-to-action
   - MUST be exactly 140-160 characters (strict maximum 160)
   - Count characters carefully - this is critical for SEO

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
   - CRITICAL: Add proper spacing between paragraphs using CSS margin - wrap each paragraph in <p style="margin-bottom: 1.5rem;"> or use <p class="mb-6"> for Tailwind

6. IMAGES (with search queries for stock photos):
   - Include 2-3 image placeholders using this EXACT format:
     <figure data-image-query="specific search query for stock photo"><img src="[STOCK_IMAGE]" alt="descriptive alt text" /><figcaption>Caption describing the image</figcaption></figure>
   - The data-image-query should be specific (e.g., "team meeting office", "employee onboarding laptop", "performance review discussion")
   - Alt text MUST describe the expected image AND include keyword naturally

7. INTERNAL LINKING (suggestions):
   - Add 2-3 internal link placeholders: [INTERNAL_LINK: suggested topic]
   - These will be replaced with actual links

8. CALL TO ACTION:
   - End with clear CTA related to GlobalyOS features
   - Make it actionable and relevant

=== OUTPUT FORMAT (JSON only, no code blocks) ===
{
  "title": "SEO-optimized title with keyword (30-60 chars)",
  "meta_description": "CRITICAL: Must be 140-160 chars exactly, keyword in first half",
  "slug": "keyword-in-url-slug",
  "excerpt": "2-3 sentence summary with keyword for previews",
  "content": "<article>Full HTML content with h2/h3 headings, paragraphs, lists, image placeholders with data-image-query</article>",
  "category": "HR Technology|Employee Management|Workplace Culture|Remote Work|Leadership|Performance",
  "focus_keyword": "${keyword}",
  "reading_time_minutes": estimated_reading_time_number,
  "cover_image_query": "specific search query for cover image related to the topic"
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
        
        // Enforce meta_description max 160 characters
        if (postData.meta_description && postData.meta_description.length > 160) {
          console.log(`Meta description too long (${postData.meta_description.length} chars), truncating to 160`);
          postData.meta_description = postData.meta_description.substring(0, 157) + '...';
        }
      } catch (parseError) {
        console.error(`Failed to parse AI response for post ${i + 1}:`, parseError);
        continue;
      }

      // Search for cover image on Pexels
      let coverImageUrl = null;
      let imageAttribution: { cover?: string; content?: { query: string; attribution: string }[] } = {};
      
      const coverQuery = postData.cover_image_query || keyword;
      console.log(`Searching Pexels for cover image: "${coverQuery}"`);
      
      const coverImage = await searchPexelsImage(coverQuery);
      if (coverImage) {
        const fileName = `${postData.slug}-cover-${Date.now()}`;
        const uploadedUrl = await downloadAndUploadImage(supabase, coverImage.url, fileName);
        if (uploadedUrl) {
          coverImageUrl = uploadedUrl;
          imageAttribution.cover = coverImage.attribution;
          console.log(`Cover image uploaded: ${coverImage.attribution}`);
        }
      }

      // If Pexels fails, fallback to AI-generated image
      if (!coverImageUrl) {
        console.log('Pexels cover image failed, falling back to AI generation');
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
              const fileName = `${postData.slug}-cover-ai-${Date.now()}`;
              const uploadedUrl = await downloadAndUploadImage(supabase, imageData.data[0].url, fileName);
              if (uploadedUrl) {
                coverImageUrl = uploadedUrl;
                imageAttribution.cover = 'AI Generated';
              }
            }
          }
        } catch (imgError) {
          console.error(`Failed to generate AI image for post ${i + 1}:`, imgError);
        }
      }

      // Process content images - find all data-image-query placeholders
      let processedContent = postData.content;
      const imageQueryRegex = /<figure\s+data-image-query="([^"]+)"[^>]*>\s*<img\s+src="\[STOCK_IMAGE\]"([^>]*)\/?>(\s*<figcaption>([^<]*)<\/figcaption>)?\s*<\/figure>/gi;
      const contentImageMatches = [...postData.content.matchAll(imageQueryRegex)];
      
      imageAttribution.content = [];
      
      for (const match of contentImageMatches) {
        const [fullMatch, query, imgAttrs, captionBlock, captionText] = match;
        console.log(`Searching Pexels for content image: "${query}"`);
        
        const stockImage = await searchPexelsImage(query);
        if (stockImage) {
          const fileName = `${postData.slug}-content-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const uploadedUrl = await downloadAndUploadImage(supabase, stockImage.url, fileName);
          
          if (uploadedUrl) {
            const newCaption = captionText 
              ? `${captionText} (${stockImage.attribution})`
              : stockImage.attribution;
            
            const replacement = `<figure><img src="${uploadedUrl}"${imgAttrs}/><figcaption>${newCaption}</figcaption></figure>`;
            processedContent = processedContent.replace(fullMatch, replacement);
            
            imageAttribution.content.push({
              query,
              attribution: stockImage.attribution
            });
            console.log(`Content image uploaded: ${stockImage.attribution}`);
          }
        } else {
          // Remove the placeholder if no image found
          const fallbackCaption = captionText || 'Image';
          const replacement = `<figure><figcaption>${fallbackCaption}</figcaption></figure>`;
          processedContent = processedContent.replace(fullMatch, replacement);
        }
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
          content: processedContent,
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
            generated_at: new Date().toISOString(),
            image_attribution: imageAttribution
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
