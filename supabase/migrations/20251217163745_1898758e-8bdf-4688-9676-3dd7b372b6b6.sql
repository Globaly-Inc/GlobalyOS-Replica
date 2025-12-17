-- Add break time columns to employee_schedules
ALTER TABLE employee_schedules
ADD COLUMN break_start_time TIME DEFAULT '12:00:00',
ADD COLUMN break_end_time TIME DEFAULT '13:00:00';

-- Add break time columns to office_schedules
ALTER TABLE office_schedules
ADD COLUMN break_start_time TIME DEFAULT '12:00:00',
ADD COLUMN break_end_time TIME DEFAULT '13:00:00';