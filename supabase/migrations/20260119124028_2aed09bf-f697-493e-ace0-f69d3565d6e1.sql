-- Add day_schedules JSONB column to office_schedules for per-day work hours
ALTER TABLE office_schedules 
ADD COLUMN IF NOT EXISTS day_schedules JSONB DEFAULT '{}';