-- Drop the policy first, then the function, then recreate both
DROP POLICY IF EXISTS "Users can view org member profiles" ON public.profiles;
DROP FUNCTION IF EXISTS public.can_view_profile(uuid);

-- Create improved can_view_profile function
CREATE OR REPLACE FUNCTION public.can_view_profile(_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    -- User can view their own profile
    _profile_id = auth.uid()
    -- Or profile belongs to an employee in the same organization as the current user
    OR EXISTS (
      SELECT 1 FROM public.employees e1
      JOIN public.employees e2 ON e1.organization_id = e2.organization_id
      WHERE e1.user_id = _profile_id
      AND e2.user_id = auth.uid()
    )
  )
$$;

-- Recreate the policy
CREATE POLICY "Users can view org member profiles"
ON public.profiles FOR SELECT
USING (public.can_view_profile(id));