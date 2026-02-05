
-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "HR and admins can create employees" ON public.employees;

-- Create updated INSERT policy that also allows owners and self-insert during onboarding
CREATE POLICY "HR admins owners can create employees"
  ON public.employees
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'hr'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'owner'::app_role)
    OR (user_id = auth.uid() AND is_org_member(auth.uid(), organization_id))
  );
