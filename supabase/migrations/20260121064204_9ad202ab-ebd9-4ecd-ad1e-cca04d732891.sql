-- Add linkedin_url column to employees table
ALTER TABLE public.employees 
ADD COLUMN linkedin_url TEXT;

COMMENT ON COLUMN public.employees.linkedin_url 
IS 'Employee LinkedIn profile URL';