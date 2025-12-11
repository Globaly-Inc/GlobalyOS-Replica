-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Service role can manage login attempts" ON public.login_attempts;

-- Create a restrictive policy that only allows service role access
-- Regular authenticated users should NOT be able to read login attempts
-- The service role bypasses RLS, so this policy effectively blocks all client access
CREATE POLICY "No public access to login attempts"
ON public.login_attempts
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);