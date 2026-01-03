-- Add work_days column to employee_schedules table
-- Stores which days of the week the employee works
-- 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
-- Default to Mon-Fri (1-5)
ALTER TABLE employee_schedules 
ADD COLUMN IF NOT EXISTS work_days integer[] DEFAULT ARRAY[1,2,3,4,5];

COMMENT ON COLUMN employee_schedules.work_days IS 'Days of week employee works (0=Sun, 1=Mon, ..., 6=Sat)';