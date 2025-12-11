-- Drop the problematic RLS policies on organization_members
DROP POLICY IF EXISTS "Org members can view other members" ON public.organization_members;
DROP POLICY IF EXISTS "Owners can manage org members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.organization_members;

-- Create fixed RLS policies that don't cause infinite recursion
-- Users can always view their own memberships
CREATE POLICY "Users can view own memberships"
ON public.organization_members
FOR SELECT
USING (user_id = auth.uid());

-- Users can view other members in their organizations (using security definer function)
CREATE POLICY "Org members can view other members"
ON public.organization_members
FOR SELECT
USING (
  user_id = auth.uid() 
  OR 
  organization_id IN (SELECT get_user_organizations(auth.uid()))
);

-- Owners can manage org members
CREATE POLICY "Owners can manage org members"
ON public.organization_members
FOR ALL
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