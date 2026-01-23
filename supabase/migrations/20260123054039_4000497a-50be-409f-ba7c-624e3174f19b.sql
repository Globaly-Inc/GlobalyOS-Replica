-- Allow employees to update their own record (needed for onboarding completion)
CREATE POLICY "Employees can update own record"
ON employees
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Fix Simrita's stuck onboarding status
UPDATE employees 
SET employee_onboarding_completed = true,
    employee_onboarding_step = 9
WHERE id = '8bdfe871-1784-459a-953e-415ac63d6cbf';