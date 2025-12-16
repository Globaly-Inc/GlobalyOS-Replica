-- Remove the overly permissive policy that exposes sensitive employee data to all org members
DROP POLICY IF EXISTS "Org members can view employees in same org" ON public.employees;

-- Drop existing view first, then recreate
DROP VIEW IF EXISTS public.employee_directory;

-- Create the employee_directory view for non-sensitive listings only
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
  p.email as work_email
FROM employees e
JOIN profiles p ON p.id = e.user_id;

-- Grant access to the directory view
GRANT SELECT ON public.employee_directory TO authenticated;