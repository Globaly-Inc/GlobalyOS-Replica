ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS referred_by_employee_id UUID REFERENCES public.employees(id);