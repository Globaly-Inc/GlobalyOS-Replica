-- Fix the is_org_admin_or_owner function to correctly query organization_members table
-- instead of the non-existent employees.role column

CREATE OR REPLACE FUNCTION public.is_org_admin_or_owner(
  p_org_id uuid, 
  p_employee_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get user_id from employee
  SELECT user_id INTO v_user_id
  FROM employees
  WHERE id = p_employee_id
    AND organization_id = p_org_id;

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check role in organization_members (correct table)
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = v_user_id
      AND organization_id = p_org_id
      AND role IN ('owner', 'admin')
  );
END;
$$;

-- Remove duplicate RLS policy if it exists
DROP POLICY IF EXISTS "Org members can create spaces" ON chat_spaces;