-- Drop the correct unique constraint that's blocking multiple check-ins per day
ALTER TABLE public.attendance_records DROP CONSTRAINT IF EXISTS attendance_records_employee_date_unique;