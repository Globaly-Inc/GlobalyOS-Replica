-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view org member profiles" ON public.profiles;
DROP POLICY IF EXISTS "Require authentication for profiles" ON public.profiles;

-- Create a properly restricted SELECT policy using can_view_profile function
CREATE POLICY "Users can view profiles in same organization"
ON public.profiles
FOR SELECT
TO authenticated
USING (can_view_profile(id));

-- Ensure authentication is required for all operations (PERMISSIVE for base access)
CREATE POLICY "Require authentication for all profile operations"
ON public.profiles
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);