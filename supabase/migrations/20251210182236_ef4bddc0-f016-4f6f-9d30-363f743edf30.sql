-- Add status column to employees table
ALTER TABLE public.employees 
ADD COLUMN status text NOT NULL DEFAULT 'invited' 
CHECK (status IN ('invited', 'active', 'inactive'));