-- Fix organization_members RLS policies - make SELECT policies PERMISSIVE instead of RESTRICTIVE
-- The issue is that all policies were RESTRICTIVE, but PostgreSQL requires at least one PERMISSIVE policy to pass

-- Drop the current policies
DROP POLICY IF EXISTS "Users can view own memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Org members can view other members" ON public.organization_members;
DROP POLICY IF EXISTS "Owners can manage org members" ON public.organization_members;

-- Create PERMISSIVE SELECT policies (default is PERMISSIVE)
CREATE POLICY "Users can view own memberships"
ON public.organization_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Org members can view other members"
ON public.organization_members
FOR SELECT
TO authenticated
USING (organization_id IN (SELECT get_user_organizations(auth.uid())));

-- Create policy for managing members (INSERT, UPDATE, DELETE)
CREATE POLICY "Owners can manage org members"
ON public.organization_members
FOR ALL
TO authenticated
USING (
  user_id = auth.uid() 
  OR 
  is_org_owner(auth.uid(), organization_id)
)
WITH CHECK (
  user_id = auth.uid() 
  OR 
  is_org_owner(auth.uid(), organization_id)
);