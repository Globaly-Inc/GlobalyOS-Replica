-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a security definer function to check if a profile belongs to the same org
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
    -- Or profile belongs to an employee in the same organization
    OR EXISTS (
      SELECT 1 FROM public.employees e
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE e.user_id = _profile_id
      AND om.user_id = auth.uid()
    )
  )
$$;

-- Users can view profiles of employees in their organization
CREATE POLICY "Users can view org member profiles"
ON public.profiles FOR SELECT
USING (public.can_view_profile(id));