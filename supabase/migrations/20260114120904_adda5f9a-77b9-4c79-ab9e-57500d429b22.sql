-- Part 1: Convert get_user_space_ids to LANGUAGE plpgsql to prevent inlining
CREATE OR REPLACE FUNCTION public.get_user_space_ids(_user_id uuid)
RETURNS TABLE(space_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT csm.space_id
  FROM public.chat_space_members csm
  JOIN public.employees e ON e.id = csm.employee_id
  WHERE e.user_id = _user_id;
END;
$$;

-- Part 2: Simplify INSERT policy - Remove is_space_admin() call to prevent recursion
DROP POLICY IF EXISTS "chat_space_members_insert" ON public.chat_space_members;

CREATE POLICY "chat_space_members_insert" ON public.chat_space_members
FOR INSERT TO authenticated
WITH CHECK (
  -- 1. Owner/Admin can add members to any space in their org
  (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
        AND e.organization_id = chat_space_members.organization_id
        AND e.status = 'active'
    )
    AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'))
  )
  OR
  -- 2. Space creator can add members (for initial setup and ongoing management)
  EXISTS (
    SELECT 1 FROM chat_spaces cs
    JOIN employees e ON e.id = cs.created_by
    WHERE e.user_id = auth.uid()
      AND cs.id = chat_space_members.space_id
  )
  OR
  -- 3. Users can join public spaces themselves
  (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM chat_spaces cs
      WHERE cs.id = chat_space_members.space_id
        AND cs.access_type = 'public'
    )
  )
);

-- Part 3: Create Security Definer function for adding members (for space admins)
CREATE OR REPLACE FUNCTION public.add_space_member(
  _space_id uuid,
  _employee_id uuid,
  _role text DEFAULT 'member'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id uuid;
  _current_emp_id uuid;
  _member_id uuid;
BEGIN
  -- Get current user's employee ID
  SELECT id INTO _current_emp_id FROM employees WHERE user_id = auth.uid();
  
  -- Get space's organization
  SELECT organization_id INTO _org_id FROM chat_spaces WHERE id = _space_id;
  
  -- Check if current user is space admin, space creator, or org admin/owner
  IF NOT (
    public.is_space_admin(_space_id, _current_emp_id)
    OR EXISTS (SELECT 1 FROM chat_spaces WHERE id = _space_id AND created_by = _current_emp_id)
    OR public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'admin')
  ) THEN
    RAISE EXCEPTION 'Permission denied: not authorized to add members';
  END IF;
  
  -- Insert the member
  INSERT INTO chat_space_members (space_id, employee_id, organization_id, role)
  VALUES (_space_id, _employee_id, _org_id, _role)
  RETURNING id INTO _member_id;
  
  RETURN _member_id;
END;
$$;