-- Add position effective date to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS position_effective_date date DEFAULT CURRENT_DATE;

-- Update existing employees to have their join_date as the initial position_effective_date
UPDATE public.employees 
SET position_effective_date = join_date 
WHERE position_effective_date IS NULL OR position_effective_date = CURRENT_DATE;