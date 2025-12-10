-- Add personal_email column to employees table
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS personal_email text;