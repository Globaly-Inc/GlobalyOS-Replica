
-- Allow employees to read their own candidate record
-- This is needed for the internal vacancies "applied" state to work
CREATE POLICY "Employees can view their own candidate record"
ON public.candidates
FOR SELECT
USING (
  employee_id IS NOT NULL
  AND employee_id IN (
    SELECT id FROM employees
    WHERE user_id = auth.uid()
      AND organization_id = candidates.organization_id
  )
);

-- Also allow employees to read their own candidate_applications
CREATE POLICY "Employees can view their own applications"
ON public.candidate_applications
FOR SELECT
USING (
  candidate_id IN (
    SELECT c.id FROM candidates c
    JOIN employees e ON e.id = c.employee_id
    WHERE e.user_id = auth.uid()
      AND c.organization_id = candidate_applications.organization_id
  )
);
