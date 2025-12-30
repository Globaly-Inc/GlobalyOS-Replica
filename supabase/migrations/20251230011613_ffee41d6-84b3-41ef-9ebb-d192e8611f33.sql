-- Ensure RLS is enabled and grant access to public_blog_posts view only
-- The restrictive policies already exist, just need to ensure the view grants are in place

-- Grant SELECT on the view for public access to published posts only
GRANT SELECT ON public.public_blog_posts TO anon;
GRANT SELECT ON public.public_blog_posts TO authenticated;