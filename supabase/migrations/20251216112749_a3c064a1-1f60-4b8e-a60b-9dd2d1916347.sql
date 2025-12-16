-- Drop existing public SELECT policy if it exists
DROP POLICY IF EXISTS "Public can view published blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Anyone can view published posts" ON public.blog_posts;

-- Create restricted policy for public users - only published posts, no sensitive data access
-- Public users can only see published posts
CREATE POLICY "Public can view published blog posts"
ON public.blog_posts
FOR SELECT
TO anon
USING (is_published = true);

-- Authenticated users can also view published posts
CREATE POLICY "Authenticated users can view published blog posts"
ON public.blog_posts
FOR SELECT
TO authenticated
USING (is_published = true);

-- Create a secure view for public blog content that excludes sensitive columns
CREATE OR REPLACE VIEW public.public_blog_posts AS
SELECT 
  id,
  title,
  slug,
  content,
  excerpt,
  category,
  cover_image_url,
  author_name,
  author_avatar_url,
  published_at,
  reading_time_minutes,
  meta_title,
  meta_description,
  og_image_url,
  canonical_url,
  created_at,
  updated_at
FROM public.blog_posts
WHERE is_published = true;

-- Grant access to the view
GRANT SELECT ON public.public_blog_posts TO anon;
GRANT SELECT ON public.public_blog_posts TO authenticated;