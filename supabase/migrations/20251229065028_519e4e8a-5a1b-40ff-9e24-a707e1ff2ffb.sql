-- First drop the existing constraint that has different values
ALTER TABLE public.employees 
DROP CONSTRAINT IF EXISTS employees_employment_type_check;

-- Add employment type filtering column to leave_types table
ALTER TABLE public.leave_types 
ADD COLUMN IF NOT EXISTS applies_to_employment_types text[] DEFAULT ARRAY['trainee', 'intern', 'contract', 'employee'];

-- Add comment for documentation
COMMENT ON COLUMN public.leave_types.applies_to_employment_types IS 'Employment types that can use this leave type. NULL or empty array means all types allowed.';

-- Update ALL employees to have valid employment type (handles any invalid values)
UPDATE public.employees 
SET employment_type = 'employee' 
WHERE employment_type NOT IN ('trainee', 'intern', 'contract', 'employee') 
   OR employment_type IS NULL;

-- Add the new check constraint for valid employment types
ALTER TABLE public.employees 
ADD CONSTRAINT employees_employment_type_check 
CHECK (employment_type IN ('trainee', 'intern', 'contract', 'employee'));

-- Update the leave balance allocation trigger to include employment type filtering
CREATE OR REPLACE FUNCTION public.allocate_default_leave_balances()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.leave_type_balances (employee_id, leave_type_id, organization_id, balance, year)
  SELECT 
    NEW.id,
    lt.id,
    NEW.organization_id,
    COALESCE(lt.default_days, 0),
    EXTRACT(year FROM CURRENT_DATE)::integer
  FROM public.leave_types lt
  WHERE lt.organization_id = NEW.organization_id
    AND lt.is_active = true
    -- Office filter
    AND (lt.applies_to_all_offices = true OR EXISTS (
      SELECT 1 FROM public.leave_type_offices lto 
      WHERE lto.leave_type_id = lt.id AND lto.office_id = NEW.office_id
    ))
    -- Gender filter
    AND (lt.applies_to_gender = 'all' OR lt.applies_to_gender IS NULL OR lt.applies_to_gender = NEW.gender)
    -- Employment type filter
    AND (lt.applies_to_employment_types IS NULL 
         OR array_length(lt.applies_to_employment_types, 1) IS NULL
         OR NEW.employment_type = ANY(lt.applies_to_employment_types))
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;