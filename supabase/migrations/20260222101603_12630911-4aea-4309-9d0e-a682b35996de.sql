
-- Fix "Org members can view org employees": change TO public → TO authenticated
DROP POLICY IF EXISTS "Org members can view org employees" ON public.employees;
CREATE POLICY "Org members can view org employees"
  ON public.employees FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

-- Fix "Employees can update own record": change TO public → TO authenticated
DROP POLICY IF EXISTS "Employees can update own record" ON public.employees;
CREATE POLICY "Employees can update own record"
  ON public.employees FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Fix "HR admins owners can create employees": change TO public → TO authenticated
DROP POLICY IF EXISTS "HR admins owners can create employees" ON public.employees;
CREATE POLICY "HR admins owners can create employees"
  ON public.employees FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'hr'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'owner'::app_role)
    OR (user_id = auth.uid() AND is_org_member(auth.uid(), organization_id))
  );

-- Fix "employees_update_own_onboarding": change TO public → TO authenticated
DROP POLICY IF EXISTS "employees_update_own_onboarding" ON public.employees;
CREATE POLICY "employees_update_own_onboarding"
  ON public.employees FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Fix "Super admins can view all employees": change TO public → TO authenticated
DROP POLICY IF EXISTS "Super admins can view all employees" ON public.employees;
CREATE POLICY "Super admins can view all employees"
  ON public.employees FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Fix the RESTRICTIVE policy to also use TO authenticated
DROP POLICY IF EXISTS "Require authentication for employees" ON public.employees;
CREATE POLICY "Require authentication for employees"
  ON public.employees AS RESTRICTIVE FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add explicit deny for anonymous access
CREATE POLICY "Deny anonymous access to employees"
  ON public.employees AS RESTRICTIVE FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);
