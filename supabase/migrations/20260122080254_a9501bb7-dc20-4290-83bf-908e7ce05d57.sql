-- Fix Security Definer View issue for employee_directory
-- The view is missing security_invoker=true, causing it to bypass RLS

-- First, drop and recreate the view with security_invoker = true
DROP VIEW IF EXISTS public.employee_directory;

CREATE OR REPLACE VIEW public.employee_directory
WITH (security_invoker = true)
AS
SELECT 
    e.id,
    e.user_id,
    e.organization_id,
    e."position",
    e.department,
    e.join_date,
    e.city,
    e.country,
    e.manager_id,
    e.status,
    e.office_id,
    e.created_at,
    e.is_new_hire,
    e.employee_onboarding_completed,
    p.full_name,
    p.email,
    p.avatar_url,
    o.name AS office_name,
    es.work_location
FROM employees e
JOIN profiles p ON p.id = e.user_id
LEFT JOIN offices o ON o.id = e.office_id
LEFT JOIN employee_schedules es ON es.employee_id = e.id;

-- Grant appropriate permissions
GRANT SELECT ON public.employee_directory TO anon;
GRANT SELECT ON public.employee_directory TO authenticated;
GRANT ALL ON public.employee_directory TO service_role;

-- Add comment explaining the security setting
COMMENT ON VIEW public.employee_directory IS 'Employee directory view with security_invoker=true to respect RLS policies on underlying tables';