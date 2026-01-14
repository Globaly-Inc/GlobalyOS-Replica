-- Phase 1: Fix RLS Recursion on chat_space_members

-- 1.1 Drop and recreate SELECT policy without is_space_member() to prevent recursion
DROP POLICY IF EXISTS "chat_space_members_select" ON public.chat_space_members;
DROP POLICY IF EXISTS "Users can view space members" ON public.chat_space_members;
DROP POLICY IF EXISTS "Space members can view other members" ON public.chat_space_members;

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
  -- Members can see other members of spaces they belong to (direct check, no function call)
  EXISTS (
    SELECT 1 FROM chat_space_members csm2
    JOIN employees e ON e.id = csm2.employee_id
    WHERE e.user_id = auth.uid()
      AND csm2.space_id = chat_space_members.space_id
  )
);

-- 1.2 Drop and recreate INSERT policy without self-referential check
DROP POLICY IF EXISTS "chat_space_members_insert" ON public.chat_space_members;
DROP POLICY IF EXISTS "Space admins can add members" ON public.chat_space_members;
DROP POLICY IF EXISTS "Users can join public spaces" ON public.chat_space_members;
DROP POLICY IF EXISTS "Owners and admins can add themselves to any space" ON public.chat_space_members;

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
  -- Space creator can add members (critical for initial setup)
  EXISTS (
    SELECT 1 FROM chat_spaces cs
    JOIN employees e ON e.id = cs.created_by
    WHERE e.user_id = auth.uid()
      AND cs.id = chat_space_members.space_id
  )
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

-- Phase 2: Clean up orphan spaces (spaces with 0 members)
DELETE FROM chat_spaces
WHERE id IN (
  SELECT cs.id 
  FROM chat_spaces cs
  LEFT JOIN chat_space_members csm ON csm.space_id = cs.id
  WHERE csm.id IS NULL
);