-- Phase 1: Create security definer function to get user's space IDs (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_space_ids(_user_id uuid)
RETURNS TABLE(space_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT csm.space_id
  FROM public.chat_space_members csm
  JOIN public.employees e ON e.id = csm.employee_id
  WHERE e.user_id = _user_id
$$;

-- Phase 2: Drop and recreate SELECT policy without self-reference
DROP POLICY IF EXISTS "chat_space_members_select" ON public.chat_space_members;

CREATE POLICY "chat_space_members_select" ON public.chat_space_members
FOR SELECT TO authenticated
USING (
  -- Owner/Admin can see all members in their org
  (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
        AND e.organization_id = chat_space_members.organization_id
        AND e.status = 'active'
    )
    AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin'))
  )
  OR
  -- Members can see other members of spaces they belong to
  -- Using the security definer function to avoid recursion
  space_id IN (SELECT public.get_user_space_ids(auth.uid()))
);

-- Phase 3: Drop and recreate INSERT policy
DROP POLICY IF EXISTS "chat_space_members_insert" ON public.chat_space_members;

CREATE POLICY "chat_space_members_insert" ON public.chat_space_members
FOR INSERT TO authenticated
WITH CHECK (
  -- Owner/Admin can add members to any space in their org
  (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
        AND e.organization_id = chat_space_members.organization_id
        AND e.status = 'active'
    )
    AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin'))
  )
  OR
  -- Space creator can add members
  EXISTS (
    SELECT 1 FROM chat_spaces cs
    JOIN employees e ON e.id = cs.created_by
    WHERE e.user_id = auth.uid()
      AND cs.id = chat_space_members.space_id
  )
  OR
  -- Existing space admin can add members (use existing security definer function)
  public.is_space_admin(chat_space_members.space_id, (SELECT id FROM employees WHERE user_id = auth.uid()))
  OR
  -- Users can join public spaces themselves
  (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM chat_spaces cs
      WHERE cs.id = chat_space_members.space_id
        AND cs.access_type = 'public'
    )
  )
);

-- Phase 4: Clean up orphan spaces (spaces with 0 members)
DELETE FROM public.chat_spaces
WHERE id NOT IN (
  SELECT DISTINCT space_id FROM public.chat_space_members
);