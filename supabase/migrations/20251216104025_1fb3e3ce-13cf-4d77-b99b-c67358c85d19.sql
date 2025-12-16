-- Fix: Replace self-referential RLS policy with security definer function approach
-- The previous policy caused infinite recursion because it queried employees from within employees RLS

-- Drop the problematic policy
DROP POLICY IF EXISTS "Org members can view employees in same org" ON public.employees;

-- Create a security definer function that checks org membership without recursion
CREATE OR REPLACE FUNCTION public.is_employee_in_same_org(_employee_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = auth.uid()
    AND e.organization_id = _employee_org_id
  )
$$;

-- Create the fixed policy using the security definer function
CREATE POLICY "Org members can view employees in same org"
ON public.employees
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND is_employee_in_same_org(organization_id)
);