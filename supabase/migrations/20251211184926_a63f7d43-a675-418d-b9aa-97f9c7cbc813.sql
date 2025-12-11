-- Fix the circular dependency in organization_members RLS policy
-- Users should be able to view their OWN membership records
-- regardless of whether they can see other org members

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Members can view org members" ON public.organization_members;

-- Create a policy that allows users to view their own membership first
CREATE POLICY "Users can view own memberships"
ON public.organization_members
FOR SELECT
USING (user_id = auth.uid());

-- Create a separate policy for viewing other org members (for admins/hr)
CREATE POLICY "Org members can view other members"
ON public.organization_members
FOR SELECT
USING (
  user_id != auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid() 
    AND om.organization_id = organization_members.organization_id
  )
);