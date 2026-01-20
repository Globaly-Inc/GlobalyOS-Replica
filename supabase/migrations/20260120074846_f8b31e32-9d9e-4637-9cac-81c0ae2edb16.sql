-- Drop and recreate view with new columns
DROP VIEW IF EXISTS public.employee_directory;

CREATE VIEW public.employee_directory AS
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