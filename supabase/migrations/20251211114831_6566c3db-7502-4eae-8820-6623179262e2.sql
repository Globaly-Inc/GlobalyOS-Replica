-- Drop any existing SELECT policies on profiles that might be too permissive
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view org member profiles" ON public.profiles;

-- Create proper organization-scoped SELECT policy
CREATE POLICY "Users can view org member profiles"
ON public.profiles FOR SELECT
USING (
  -- User can always view their own profile
  id = auth.uid()
  OR
  -- User can view profiles of employees in the same organization
  id IN (
    SELECT e.user_id 
    FROM public.employees e
    WHERE e.organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  )
);