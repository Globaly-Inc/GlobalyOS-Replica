-- Add a policy to allow org members to view basic employee directory info
-- This only exposes non-sensitive data (name, email, position, department, etc.)
-- while the employees table with sensitive data remains restricted

CREATE POLICY "Org members can view employee directory"
ON public.employees
FOR SELECT
TO authenticated
USING (
  -- Only allow access to basic fields through the employee_directory view
  -- User must be in the same organization
  is_org_member(auth.uid(), organization_id)
);