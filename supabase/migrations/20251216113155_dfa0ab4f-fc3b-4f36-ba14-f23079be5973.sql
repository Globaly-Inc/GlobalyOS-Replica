-- Drop and recreate view with correct column name
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
  p.full_name,
  p.avatar_url,
  p.email
FROM employees e
JOIN profiles p ON p.id = e.user_id;

GRANT SELECT ON public.employee_directory TO authenticated;