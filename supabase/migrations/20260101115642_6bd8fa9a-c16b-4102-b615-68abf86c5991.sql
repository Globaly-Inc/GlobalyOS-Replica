-- Add carry_forward_mode column to leave_types
ALTER TABLE public.leave_types 
ADD COLUMN carry_forward_mode text NOT NULL DEFAULT 'none';

-- Migrate existing carry_forward boolean to new mode
UPDATE public.leave_types 
SET carry_forward_mode = CASE 
  WHEN carry_forward = true THEN 'all'
  ELSE 'none'
END;

-- Drop the old carry_forward column
ALTER TABLE public.leave_types DROP COLUMN carry_forward;