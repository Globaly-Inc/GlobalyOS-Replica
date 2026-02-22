
-- Drop the overly permissive anon policy on departments
DROP POLICY "Public can view departments for careers" ON public.departments;

-- Create a minimal public view for careers job listing joins
CREATE VIEW public.departments_public
WITH (security_barrier = on) AS
  SELECT id, name, organization_id
  FROM public.departments;

GRANT SELECT ON public.departments_public TO anon;
GRANT SELECT ON public.departments_public TO authenticated;
