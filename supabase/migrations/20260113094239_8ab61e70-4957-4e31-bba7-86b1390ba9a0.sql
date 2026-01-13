-- Fix employment_type column default from 'full-time' to 'employee'
-- The CHECK constraint only allows: 'trainee', 'intern', 'contract', 'employee'
ALTER TABLE public.employees 
ALTER COLUMN employment_type SET DEFAULT 'employee';