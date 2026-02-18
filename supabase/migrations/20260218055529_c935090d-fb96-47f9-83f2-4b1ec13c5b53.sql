
-- Allow anonymous (unauthenticated) users to read organizations by slug
-- needed for: career site header, job lookup
CREATE POLICY "Public can view organizations by slug for careers"
  ON public.organizations
  FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to read open jobs (public career board)
CREATE POLICY "Public can view open jobs for careers"
  ON public.jobs
  FOR SELECT
  TO anon
  USING (status = 'open');

-- Allow anonymous users to read departments (needed for job listings)
CREATE POLICY "Public can view departments for careers"
  ON public.departments
  FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to read offices (needed for job location display)
CREATE POLICY "Public can view offices for careers"
  ON public.offices
  FOR SELECT
  TO anon
  USING (true);
