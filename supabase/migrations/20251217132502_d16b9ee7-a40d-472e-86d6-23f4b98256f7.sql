-- Fix security definer view issue by using SECURITY INVOKER
DROP VIEW IF EXISTS public.employee_directory;

CREATE VIEW public.employee_directory 
WITH (security_invoker = true) AS
SELECT 
  e.id,
  e.user_id,
  e.organization_id,
  e.position,
  e.department,
  e.join_date,
  e.city,
  e.country,
  e.manager_id,
  e.status,
  e.office_id,
  e.created_at,
  p.full_name,
  p.email,
  p.avatar_url,
  o.name as office_name,
  es.work_location
FROM employees e
JOIN profiles p ON p.id = e.user_id
LEFT JOIN offices o ON o.id = e.office_id
LEFT JOIN employee_schedules es ON es.employee_id = e.id;