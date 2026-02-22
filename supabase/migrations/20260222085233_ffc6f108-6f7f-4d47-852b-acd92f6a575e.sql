
-- Step 1: Create a public-safe view for careers pages (excludes sensitive fields)
CREATE VIEW public.organizations_public
WITH (security_invoker = on) AS
  SELECT id, name, slug, logo_url, website,
         careers_page_title, careers_page_subtitle, careers_header_color
  FROM public.organizations;

-- Step 2: Drop the overly permissive anon policy that exposes ALL columns
DROP POLICY "Public can view organizations by slug for careers" ON public.organizations;

-- Step 3: Create a new anon SELECT policy on the view
-- Views with security_invoker inherit the caller's role, so we need a
-- scoped policy on the base table that only allows anon to read the columns
-- exposed by the view. However, since views with security_invoker check
-- policies on the base table, we need a restricted anon policy.
-- Instead, let's use a different approach: create the anon policy but
-- restrict it to only work for slug-based lookups (can't really restrict columns via RLS).
-- The better approach: make the view security_barrier and grant anon access to the view only.

-- Actually, the cleanest approach: Drop security_invoker, use a SECURITY DEFINER function
-- or simply grant anon SELECT on the view and ensure no anon policy exists on the base table.

-- Let's drop and recreate the view without security_invoker (default is security_invoker=off,
-- which means it runs as the view owner i.e. postgres, bypassing RLS)
DROP VIEW public.organizations_public;

CREATE VIEW public.organizations_public
WITH (security_barrier = on) AS
  SELECT id, name, slug, logo_url, website,
         careers_page_title, careers_page_subtitle, careers_header_color
  FROM public.organizations;

-- Grant anon and authenticated roles SELECT on the view
GRANT SELECT ON public.organizations_public TO anon;
GRANT SELECT ON public.organizations_public TO authenticated;
