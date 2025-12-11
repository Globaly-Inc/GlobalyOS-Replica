-- Drop and recreate attendance_summary view with security_invoker=true
-- This ensures the view respects RLS policies of the querying user
DROP VIEW IF EXISTS public.attendance_summary;

CREATE VIEW public.attendance_summary
WITH (security_invoker = true)
AS
SELECT 
  employee_id,
  date_trunc('month'::text, date::timestamp with time zone) AS month,
  count(*) AS total_days,
  count(*) FILTER (WHERE status = 'present'::text) AS present_days,
  count(*) FILTER (WHERE status = 'absent'::text) AS absent_days,
  count(*) FILTER (WHERE status = 'late'::text) AS late_days,
  count(*) FILTER (WHERE status = 'half_day'::text) AS half_days,
  round(avg(work_hours), 2) AS avg_work_hours,
  round(sum(work_hours), 2) AS total_work_hours
FROM attendance_records
WHERE check_in_time IS NOT NULL
GROUP BY employee_id, date_trunc('month'::text, date::timestamp with time zone);