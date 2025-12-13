-- Add toggle to enable/disable automatic attendance adjustments
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS auto_attendance_adjustments_enabled boolean NOT NULL DEFAULT false;