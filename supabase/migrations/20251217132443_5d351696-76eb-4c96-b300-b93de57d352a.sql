-- Add location columns to attendance_records for storing check-in location details
ALTER TABLE public.attendance_records 
ADD COLUMN IF NOT EXISTS check_in_latitude numeric,
ADD COLUMN IF NOT EXISTS check_in_longitude numeric,
ADD COLUMN IF NOT EXISTS check_in_location_name text;

-- Update employee_directory view to include work_location from employee_schedules
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
  p.full_name,
  p.email,
  p.avatar_url,
  o.name as office_name,
  es.work_location
FROM employees e
JOIN profiles p ON p.id = e.user_id
LEFT JOIN offices o ON o.id = e.office_id
LEFT JOIN employee_schedules es ON es.employee_id = e.id;