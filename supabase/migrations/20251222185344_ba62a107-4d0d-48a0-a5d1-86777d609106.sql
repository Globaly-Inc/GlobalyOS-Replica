-- Add columns for employee-specific role description
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS role_description TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS role_description_generated_at TIMESTAMPTZ;