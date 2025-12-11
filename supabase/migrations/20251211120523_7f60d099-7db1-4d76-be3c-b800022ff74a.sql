-- Update the employee_directory view to include profile and office data
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
  e.updated_at,
  -- Include profile data for display
  p.full_name,
  p.email,
  p.avatar_url,
  -- Include office data
  o.name as office_name,
  -- Only show city/country (not full address) for directory
  e.city,
  e.country
FROM public.employees e
LEFT JOIN public.profiles p ON p.id = e.user_id
LEFT JOIN public.offices o ON o.id = e.office_id
WHERE is_org_member(auth.uid(), e.organization_id);

-- Grant access to the view for authenticated users
GRANT SELECT ON public.employee_directory TO authenticated;