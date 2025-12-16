-- Fix employee_directory view to use SECURITY INVOKER instead of SECURITY DEFINER
-- This ensures RLS policies of the querying user are enforced, not the view creator's

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
  p.full_name,
  p.email,
  p.avatar_url,
  o.name AS office_name,
  e.city,
  e.country
FROM employees e
LEFT JOIN profiles p ON p.id = e.user_id
LEFT JOIN offices o ON o.id = e.office_id
WHERE is_org_member(auth.uid(), e.organization_id);