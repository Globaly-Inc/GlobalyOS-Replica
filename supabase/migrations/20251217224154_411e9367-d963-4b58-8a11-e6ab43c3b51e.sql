-- Add include_summary_cards column to attendance_report_schedules
ALTER TABLE public.attendance_report_schedules
ADD COLUMN IF NOT EXISTS include_summary_cards boolean DEFAULT true;