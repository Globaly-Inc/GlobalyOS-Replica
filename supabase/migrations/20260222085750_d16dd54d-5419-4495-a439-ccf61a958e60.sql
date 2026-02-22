
-- Fix organizations_public: switch from security_barrier to security_invoker
DROP VIEW public.organizations_public;
CREATE VIEW public.organizations_public
WITH (security_invoker = on) AS
  SELECT id, name, slug, logo_url, website,
         careers_page_title, careers_page_subtitle, careers_header_color
  FROM public.organizations;

-- Add a scoped anon SELECT policy on organizations base table
-- Only allow reading orgs that have open public jobs (for careers pages)
CREATE POLICY "Anon can view orgs with public jobs for careers"
  ON public.organizations
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.organization_id = organizations.id
        AND j.status = 'open'
        AND j.is_public_visible = true
    )
  );

-- Fix departments_public: switch from security_barrier to security_invoker
DROP VIEW public.departments_public;
CREATE VIEW public.departments_public
WITH (security_invoker = on) AS
  SELECT id, name, organization_id
  FROM public.departments;
