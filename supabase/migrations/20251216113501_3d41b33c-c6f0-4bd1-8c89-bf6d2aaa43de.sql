-- Drop the existing permissive authentication policy and replace with RESTRICTIVE
DROP POLICY IF EXISTS "Require authentication for all profile operations" ON public.profiles;

-- Create a RESTRICTIVE policy that MUST pass for any access
-- This ensures authentication is always required regardless of other policies
CREATE POLICY "Require authentication for all profile operations"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Ensure no anon access is possible by revoking any direct grants
REVOKE ALL ON public.profiles FROM anon;

-- Grant only to authenticated users (RLS will still apply)
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;