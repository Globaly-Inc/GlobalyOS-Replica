-- Add new columns to leave_types table
ALTER TABLE public.leave_types 
ADD COLUMN IF NOT EXISTS max_negative_days numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS applies_to_gender text DEFAULT 'all';

-- Add check constraint for applies_to_gender
ALTER TABLE public.leave_types 
DROP CONSTRAINT IF EXISTS leave_types_applies_to_gender_check;

ALTER TABLE public.leave_types 
ADD CONSTRAINT leave_types_applies_to_gender_check 
CHECK (applies_to_gender IN ('all', 'male', 'female'));

-- Add gender column to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS gender text DEFAULT NULL;

-- Add check constraint for gender
ALTER TABLE public.employees 
DROP CONSTRAINT IF EXISTS employees_gender_check;

ALTER TABLE public.employees 
ADD CONSTRAINT employees_gender_check 
CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say') OR gender IS NULL);

-- Add comment for documentation
COMMENT ON COLUMN public.leave_types.max_negative_days IS 'Maximum negative balance allowed. 0 means no negative balance allowed.';
COMMENT ON COLUMN public.leave_types.applies_to_gender IS 'Gender restriction for this leave type: all, male, or female';
COMMENT ON COLUMN public.employees.gender IS 'Employee gender for leave type filtering';