-- Add checkin_exempt column to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS checkin_exempt boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.employees.checkin_exempt IS 
  'When true, employee is exempt from check-in requirements and will not appear in not-checked-in reports';