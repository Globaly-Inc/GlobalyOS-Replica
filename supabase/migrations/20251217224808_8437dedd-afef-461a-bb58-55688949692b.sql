-- Add schedules JSONB column to store multiple schedule entries
ALTER TABLE public.attendance_report_schedules
ADD COLUMN IF NOT EXISTS schedules jsonb DEFAULT '[]'::jsonb;

-- Migrate existing single schedule data to new array format
UPDATE public.attendance_report_schedules
SET schedules = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'frequency', COALESCE(frequency, 'weekly'),
    'day_of_week', day_of_week,
    'day_of_month', day_of_month,
    'quarter_month', 1,
    'month_of_year', 1,
    'time_of_day', COALESCE(time_of_day::text, '09:00')
  )
)
WHERE (schedules IS NULL OR schedules = '[]'::jsonb) AND frequency IS NOT NULL;