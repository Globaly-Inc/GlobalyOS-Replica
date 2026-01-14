-- =============================================
-- Update RLS policies for chat_spaces to allow Owner/Admin org-wide access
-- =============================================

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "chat_spaces_select" ON public.chat_spaces;
DROP POLICY IF EXISTS "Org members can view public spaces" ON public.chat_spaces;
DROP POLICY IF EXISTS "Space members can view private spaces" ON public.chat_spaces;
DROP POLICY IF EXISTS "Users can view public spaces in their org" ON public.chat_spaces;
DROP POLICY IF EXISTS "Space creators can view their own spaces" ON public.chat_spaces;

-- Create unified SELECT policy with owner/admin org-wide access
CREATE POLICY "chat_spaces_select" ON public.chat_spaces
FOR SELECT TO authenticated
USING (
  -- Owner/Admin can see ALL spaces in their org
  (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
        AND e.organization_id = chat_spaces.organization_id
        AND e.status = 'active'
    )
    AND (
      has_role(auth.uid(), 'owner') 
      OR has_role(auth.uid(), 'admin')
    )
  )
  OR
  -- Regular members: public spaces + spaces they're members of + their own created spaces
  (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
        AND e.organization_id = chat_spaces.organization_id
        AND e.status = 'active'
    )
    AND (
      access_type = 'public'
      OR EXISTS (
        SELECT 1 FROM chat_space_members csm
        JOIN employees e2 ON e2.id = csm.employee_id
        WHERE e2.user_id = auth.uid()
          AND csm.space_id = chat_spaces.id
      )
      OR created_by IN (
        SELECT id FROM employees WHERE user_id = auth.uid()
      )
    )
  )
);

-- Drop existing DELETE policies
DROP POLICY IF EXISTS "Space admins can delete spaces" ON public.chat_spaces;
DROP POLICY IF EXISTS "Space creators can delete spaces" ON public.chat_spaces;
DROP POLICY IF EXISTS "chat_spaces_delete" ON public.chat_spaces;

-- Create unified DELETE policy with owner/admin org-wide access
CREATE POLICY "chat_spaces_delete" ON public.chat_spaces
FOR DELETE TO authenticated
USING (
  -- Owner/Admin can delete ANY space in their org
  (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
        AND e.organization_id = chat_spaces.organization_id
        AND e.status = 'active'
    )
    AND (
      has_role(auth.uid(), 'owner') 
      OR has_role(auth.uid(), 'admin')
    )
  )
  OR
  -- Space creator can delete their own space
  created_by IN (SELECT id FROM employees WHERE user_id = auth.uid())
  OR
  -- Space admin can delete the space
  id IN (
    SELECT csm.space_id 
    FROM chat_space_members csm
    JOIN employees e ON e.id = csm.employee_id
    WHERE e.user_id = auth.uid()
      AND csm.role = 'admin'
  )
);

-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "Space admins can update spaces" ON public.chat_spaces;
DROP POLICY IF EXISTS "chat_spaces_update" ON public.chat_spaces;

-- Create unified UPDATE policy with owner/admin org-wide access
CREATE POLICY "chat_spaces_update" ON public.chat_spaces
FOR UPDATE TO authenticated
USING (
  -- Owner/Admin can update ANY space in their org
  (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
        AND e.organization_id = chat_spaces.organization_id
        AND e.status = 'active'
    )
    AND (
      has_role(auth.uid(), 'owner') 
      OR has_role(auth.uid(), 'admin')
    )
  )
  OR
  -- Space admin can update the space
  id IN (
    SELECT csm.space_id 
    FROM chat_space_members csm
    JOIN employees e ON e.id = csm.employee_id
    WHERE e.user_id = auth.uid()
      AND csm.role = 'admin'
  )
);

-- =============================================
-- Update RLS policy for chat_space_members to allow Owner/Admin to add themselves
-- =============================================

-- Drop existing INSERT policies
DROP POLICY IF EXISTS "chat_space_members_insert" ON public.chat_space_members;
DROP POLICY IF EXISTS "Space admins can add members" ON public.chat_space_members;

-- Create unified INSERT policy
CREATE POLICY "chat_space_members_insert" ON public.chat_space_members
FOR INSERT TO authenticated
WITH CHECK (
  -- Owner/Admin can add themselves to any space in their org
  (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
        AND e.organization_id = chat_space_members.organization_id
        AND e.status = 'active'
    )
    AND (
      has_role(auth.uid(), 'owner') 
      OR has_role(auth.uid(), 'admin')
    )
  )
  OR
  -- Space admins can add members
  EXISTS (
    SELECT 1 FROM chat_space_members csm
    JOIN employees e ON e.id = csm.employee_id
    WHERE e.user_id = auth.uid()
      AND csm.space_id = chat_space_members.space_id
      AND csm.role = 'admin'
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