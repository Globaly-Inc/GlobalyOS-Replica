-- Drop the security definer view and recreate with security invoker
DROP VIEW IF EXISTS public.public_blog_posts;

-- Create view with SECURITY INVOKER (default, but explicit)
CREATE VIEW public.public_blog_posts 
WITH (security_invoker = true)
AS
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