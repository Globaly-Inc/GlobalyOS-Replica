-- Add per-day schedule support to employee_schedules
ALTER TABLE public.employee_schedules 
ADD COLUMN IF NOT EXISTS day_schedules JSONB DEFAULT NULL;

-- Add comment explaining the structure
COMMENT ON COLUMN public.employee_schedules.day_schedules IS 'Per-day schedule configuration. Structure: { "0": { "enabled": true, "start": "09:00", "end": "17:00" }, "1": { ... }, ... } where keys are day numbers (0=Sun, 1=Mon, etc.)';

-- The existing work_start_time, work_end_time, and work_days columns will serve as defaults
-- when day_schedules is null or for days not specified in day_schedules