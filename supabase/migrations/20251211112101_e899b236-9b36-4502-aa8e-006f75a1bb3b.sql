-- Drop the overly permissive policy
DROP POLICY IF EXISTS "All authenticated users can view employees" ON public.employees;

-- Create policy for users to view their own employee record (full access)
CREATE POLICY "Users can view own employee record"
ON public.employees
FOR SELECT
USING (user_id = auth.uid());

-- Create policy for HR and admins to view all employees in their organization
CREATE POLICY "HR and admins can view all employees"
ON public.employees
FOR SELECT
USING (
  (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'))
  AND is_org_member(auth.uid(), organization_id)
);

-- Create policy for managers to view their direct reports
CREATE POLICY "Managers can view direct reports"
ON public.employees
FOR SELECT
USING (
  manager_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
);

-- Create policy for org members to view basic employee info (needed for team directory, org chart, kudos)
-- This allows viewing employees in same organization for directory purposes
CREATE POLICY "Org members can view employees in their organization"
ON public.employees
FOR SELECT
USING (is_org_member(auth.uid(), organization_id));