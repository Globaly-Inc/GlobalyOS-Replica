-- Remove location column from employees table as we now have detailed address fields
ALTER TABLE public.employees DROP COLUMN location;