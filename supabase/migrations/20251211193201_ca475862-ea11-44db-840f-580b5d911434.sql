
-- Fix employees RLS policies - ensure SELECT policies target authenticated role
-- The RESTRICTIVE policy requires auth.uid() IS NOT NULL but some policies target public role

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view own employee record" ON public.employees;
DROP POLICY IF EXISTS "HR and admins can view all employees" ON public.employees;
DROP POLICY IF EXISTS "Managers can view direct reports" ON public.employees;

-- Recreate policies targeting authenticated role
CREATE POLICY "Users can view own employee record"
ON public.employees
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "HR and admins can view all employees"
ON public.employees
FOR SELECT
TO authenticated
USING (
  (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  AND is_org_member(auth.uid(), organization_id)
);

CREATE POLICY "Managers can view direct reports"
ON public.employees
FOR SELECT
TO authenticated
USING (manager_id = get_current_employee_id());

-- Also add a policy for org members to view basic employee info (for org chart, team page, etc.)
CREATE POLICY "Org members can view employees in same org"
ON public.employees
FOR SELECT
TO authenticated
USING (is_org_member(auth.uid(), organization_id));
