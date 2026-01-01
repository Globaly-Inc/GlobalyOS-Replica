-- Add carry_forward column to leave_types table
ALTER TABLE public.leave_types 
ADD COLUMN carry_forward boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.leave_types.carry_forward IS 'If true, remaining balance (including negatives) is carried forward to the next year';