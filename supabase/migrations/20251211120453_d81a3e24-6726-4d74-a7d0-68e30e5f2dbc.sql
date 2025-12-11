-- Fix the view to use SECURITY INVOKER (default, but explicit for clarity)
DROP VIEW IF EXISTS public.employee_directory;

CREATE VIEW public.employee_directory 
WITH (security_invoker = true)
AS
SELECT 
  e.id,
  e.user_id,
  e.organization_id,
  e.position,
  e.department,
  e.office_id,
  e.manager_id,
  e.join_date,
  e.status,
  e.superpowers,
  e.created_at,
  e.updated_at
FROM public.employees e
WHERE is_org_member(auth.uid(), e.organization_id);

-- Grant access to the view for authenticated users
GRANT SELECT ON public.employee_directory TO authenticated;