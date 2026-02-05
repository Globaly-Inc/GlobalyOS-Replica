ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_gender_check;
ALTER TABLE public.employees ADD CONSTRAINT employees_gender_check 
  CHECK (gender IN ('male', 'female', 'other', 'non-binary', 'prefer_not_to_say', 'prefer-not-to-say') OR gender IS NULL);