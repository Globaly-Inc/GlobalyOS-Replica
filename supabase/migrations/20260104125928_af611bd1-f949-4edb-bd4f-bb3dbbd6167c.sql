-- Add timezone column to employee_schedules table
ALTER TABLE employee_schedules 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Kathmandu';

-- Add comment for clarity
COMMENT ON COLUMN employee_schedules.timezone IS 'IANA timezone for interpreting schedule times (e.g., Asia/Kathmandu)';