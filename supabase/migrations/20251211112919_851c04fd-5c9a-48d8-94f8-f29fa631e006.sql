-- Drop all SELECT policies on employees and recreate them properly
DROP POLICY IF EXISTS "Users can view own employee record" ON public.employees;
DROP POLICY IF EXISTS "HR and admins can view all employees" ON public.employees;
DROP POLICY IF EXISTS "Managers can view direct reports" ON public.employees;
DROP POLICY IF EXISTS "Org members can view employees in their organization" ON public.employees;

-- Create/update the security definer function to get current user's employee id
CREATE OR REPLACE FUNCTION public.get_current_employee_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.employees WHERE user_id = auth.uid() LIMIT 1
$$;

-- Recreate all SELECT policies without recursion

-- Users can view their own record (no recursion - direct comparison)
CREATE POLICY "Users can view own employee record"
ON public.employees FOR SELECT
USING (user_id = auth.uid());

-- HR and admins can view all employees in their org (uses security definer functions)
CREATE POLICY "HR and admins can view all employees"
ON public.employees FOR SELECT
USING (
  (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'))
  AND is_org_member(auth.uid(), organization_id)
);

-- Managers can view direct reports (uses security definer function)
CREATE POLICY "Managers can view direct reports"
ON public.employees FOR SELECT
USING (manager_id = public.get_current_employee_id());

-- Org members can view employees in their organization (uses security definer function)
CREATE POLICY "Org members can view employees in their organization"
ON public.employees FOR SELECT
USING (is_org_member(auth.uid(), organization_id));