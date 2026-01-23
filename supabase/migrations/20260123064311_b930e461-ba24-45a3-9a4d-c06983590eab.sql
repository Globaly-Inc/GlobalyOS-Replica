-- Phase 1: Fix data inconsistencies and create sync trigger

-- 1. Repair 50 employees where employee_onboarding_completed = true but completed_at IS NULL
UPDATE employee_onboarding_data eod
SET 
  completed_at = '2026-01-15T00:00:00Z'::timestamptz,
  current_step = 9
FROM employees e
WHERE eod.employee_id = e.id
  AND e.employee_onboarding_completed = true
  AND eod.completed_at IS NULL;

-- 2. Create sync trigger function to prevent future drift
CREATE OR REPLACE FUNCTION public.sync_employee_onboarding_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- When completed_at is set, mark employee as completed
  IF NEW.completed_at IS NOT NULL AND (OLD.completed_at IS NULL OR OLD.completed_at IS DISTINCT FROM NEW.completed_at) THEN
    UPDATE employees
    SET 
      employee_onboarding_completed = true,
      employee_onboarding_step = NEW.current_step
    WHERE id = NEW.employee_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Create trigger on employee_onboarding_data
DROP TRIGGER IF EXISTS trigger_sync_employee_onboarding_complete ON employee_onboarding_data;
CREATE TRIGGER trigger_sync_employee_onboarding_complete
AFTER INSERT OR UPDATE OF completed_at ON employee_onboarding_data
FOR EACH ROW
EXECUTE FUNCTION public.sync_employee_onboarding_complete();

-- 4. Add RLS policy to allow members to update their own onboarding status fields
-- First check if policy exists and drop it
DROP POLICY IF EXISTS "employees_update_own_onboarding" ON employees;

-- Create policy allowing users to update their own employee record's onboarding fields
CREATE POLICY "employees_update_own_onboarding" ON employees
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());