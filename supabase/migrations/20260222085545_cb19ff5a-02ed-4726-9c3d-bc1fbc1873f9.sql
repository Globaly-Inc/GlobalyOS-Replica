
-- Add a minimal anon SELECT policy for departments 
-- Only exposes department data for orgs that have public open jobs
-- This is needed because the jobs query joins department:departments(id, name)
CREATE POLICY "Anon can view departments for public job listings"
  ON public.departments
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.department_id = departments.id
        AND j.status = 'open'
        AND j.is_public_visible = true
    )
  );
