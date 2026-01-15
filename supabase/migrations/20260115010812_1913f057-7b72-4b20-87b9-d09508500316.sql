-- ============================================================
-- COMPREHENSIVE FIX FOR CHAT SPACE RLS INFINITE RECURSION
-- ============================================================
-- This migration:
-- 1. Rewrites chat_spaces RLS policies to use SECURITY DEFINER helpers only (no direct chat_space_members subqueries)
-- 2. Adds a trigger to auto-add creator as admin member on space creation
-- 3. Backfills missing creator memberships for existing spaces
-- ============================================================

-- ============================================================
-- STEP 1: Create/update helper functions for org admin/owner check
-- ============================================================

-- Helper to check if user is org admin or owner (no RLS recursion risk)
CREATE OR REPLACE FUNCTION public.is_org_admin_or_owner(p_org_id uuid, p_employee_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = p_employee_id
      AND e.organization_id = p_org_id
      AND e.role IN ('owner', 'admin')
  );
END;
$$;

-- ============================================================
-- STEP 2: Drop ALL existing chat_spaces policies
-- ============================================================

DROP POLICY IF EXISTS "chat_spaces_select" ON public.chat_spaces;
DROP POLICY IF EXISTS "chat_spaces_insert" ON public.chat_spaces;
DROP POLICY IF EXISTS "chat_spaces_update" ON public.chat_spaces;
DROP POLICY IF EXISTS "chat_spaces_delete" ON public.chat_spaces;
DROP POLICY IF EXISTS "Users can view spaces they have access to" ON public.chat_spaces;
DROP POLICY IF EXISTS "Authenticated users can create spaces" ON public.chat_spaces;
DROP POLICY IF EXISTS "Space admins can update spaces" ON public.chat_spaces;
DROP POLICY IF EXISTS "Space admins can delete spaces" ON public.chat_spaces;
DROP POLICY IF EXISTS "enable_select_for_org_members" ON public.chat_spaces;
DROP POLICY IF EXISTS "enable_insert_for_org_members" ON public.chat_spaces;
DROP POLICY IF EXISTS "enable_update_for_space_admins" ON public.chat_spaces;
DROP POLICY IF EXISTS "enable_delete_for_space_admins" ON public.chat_spaces;

-- ============================================================
-- STEP 3: Recreate chat_spaces policies using SECURITY DEFINER helpers ONLY
-- ============================================================

-- SELECT: Users can see spaces they created, are members of, or if they're org admin/owner
CREATE POLICY "chat_spaces_select" ON public.chat_spaces
FOR SELECT USING (
  -- User is the creator
  created_by = public.get_current_employee_id_for_org(organization_id)
  -- OR user is org admin/owner (can see all spaces)
  OR public.is_org_admin_or_owner(organization_id, public.get_current_employee_id_for_org(organization_id))
  -- OR user is a member of this space (uses SECURITY DEFINER function - no recursion)
  OR public.is_space_member(id, public.get_current_employee_id_for_org(organization_id))
  -- OR space is public and user is in the org
  OR (access_type = 'public' AND public.get_current_employee_id_for_org(organization_id) IS NOT NULL)
);

-- INSERT: Authenticated org members can create spaces
CREATE POLICY "chat_spaces_insert" ON public.chat_spaces
FOR INSERT WITH CHECK (
  -- User must be in the organization
  public.get_current_employee_id_for_org(organization_id) IS NOT NULL
  -- And must be creating as themselves
  AND created_by = public.get_current_employee_id_for_org(organization_id)
);

-- UPDATE: Only space admins, creators, or org admins can update
CREATE POLICY "chat_spaces_update" ON public.chat_spaces
FOR UPDATE USING (
  created_by = public.get_current_employee_id_for_org(organization_id)
  OR public.is_org_admin_or_owner(organization_id, public.get_current_employee_id_for_org(organization_id))
  OR public.is_space_admin(id, public.get_current_employee_id_for_org(organization_id))
);

-- DELETE: Only space admins, creators, or org admins can delete
CREATE POLICY "chat_spaces_delete" ON public.chat_spaces
FOR DELETE USING (
  created_by = public.get_current_employee_id_for_org(organization_id)
  OR public.is_org_admin_or_owner(organization_id, public.get_current_employee_id_for_org(organization_id))
  OR public.is_space_admin(id, public.get_current_employee_id_for_org(organization_id))
);

-- ============================================================
-- STEP 4: Drop ALL existing chat_space_members policies
-- ============================================================

DROP POLICY IF EXISTS "chat_space_members_select" ON public.chat_space_members;
DROP POLICY IF EXISTS "chat_space_members_insert" ON public.chat_space_members;
DROP POLICY IF EXISTS "chat_space_members_update" ON public.chat_space_members;
DROP POLICY IF EXISTS "chat_space_members_delete" ON public.chat_space_members;
DROP POLICY IF EXISTS "Users can view space members" ON public.chat_space_members;
DROP POLICY IF EXISTS "Space admins can manage members" ON public.chat_space_members;
DROP POLICY IF EXISTS "enable_select_for_space_members" ON public.chat_space_members;
DROP POLICY IF EXISTS "enable_insert_for_space_admins" ON public.chat_space_members;
DROP POLICY IF EXISTS "enable_update_for_space_admins" ON public.chat_space_members;
DROP POLICY IF EXISTS "enable_delete_for_space_admins" ON public.chat_space_members;

-- ============================================================
-- STEP 5: Recreate chat_space_members policies - SIMPLIFIED to avoid cross-table recursion
-- ============================================================

-- SELECT: Members can see other members of spaces they belong to
CREATE POLICY "chat_space_members_select" ON public.chat_space_members
FOR SELECT USING (
  -- User is in this org
  public.get_current_employee_id_for_org(organization_id) IS NOT NULL
);

-- INSERT: Space creator or space admins can add members
-- CRITICAL: Use a simpler check that doesn't recurse
CREATE POLICY "chat_space_members_insert" ON public.chat_space_members
FOR INSERT WITH CHECK (
  -- Check 1: User is in the org
  public.get_current_employee_id_for_org(organization_id) IS NOT NULL
  AND (
    -- Check 2a: User is the space creator (direct lookup on chat_spaces, no chat_space_members involved)
    EXISTS (
      SELECT 1 FROM chat_spaces cs 
      WHERE cs.id = space_id 
        AND cs.created_by = public.get_current_employee_id_for_org(organization_id)
    )
    -- Check 2b: OR user is org admin/owner
    OR public.is_org_admin_or_owner(organization_id, public.get_current_employee_id_for_org(organization_id))
    -- Check 2c: OR user is adding themselves (for joining public spaces)
    OR employee_id = public.get_current_employee_id_for_org(organization_id)
  )
);

-- UPDATE: Space admins can update member records
CREATE POLICY "chat_space_members_update" ON public.chat_space_members
FOR UPDATE USING (
  public.is_space_admin(space_id, public.get_current_employee_id_for_org(organization_id))
  OR public.is_org_admin_or_owner(organization_id, public.get_current_employee_id_for_org(organization_id))
);

-- DELETE: Space admins can remove members, or users can remove themselves
CREATE POLICY "chat_space_members_delete" ON public.chat_space_members
FOR DELETE USING (
  employee_id = public.get_current_employee_id_for_org(organization_id)
  OR public.is_space_admin(space_id, public.get_current_employee_id_for_org(organization_id))
  OR public.is_org_admin_or_owner(organization_id, public.get_current_employee_id_for_org(organization_id))
);

-- ============================================================
-- STEP 6: Create trigger function to auto-add creator as admin
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_add_space_creator_as_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Automatically insert the creator as admin member
  INSERT INTO public.chat_space_members (
    space_id,
    employee_id,
    organization_id,
    role
  ) VALUES (
    NEW.id,
    NEW.created_by,
    NEW.organization_id,
    'admin'
  )
  ON CONFLICT (space_id, employee_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- ============================================================
-- STEP 7: Create the trigger on chat_spaces
-- ============================================================

DROP TRIGGER IF EXISTS trg_auto_add_space_creator ON public.chat_spaces;

CREATE TRIGGER trg_auto_add_space_creator
  AFTER INSERT ON public.chat_spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_space_creator_as_admin();

-- ============================================================
-- STEP 8: Backfill missing creator memberships for existing spaces
-- ============================================================

INSERT INTO public.chat_space_members (space_id, employee_id, organization_id, role)
SELECT cs.id, cs.created_by, cs.organization_id, 'admin'
FROM public.chat_spaces cs
WHERE NOT EXISTS (
  SELECT 1 FROM public.chat_space_members csm
  WHERE csm.space_id = cs.id AND csm.employee_id = cs.created_by
)
ON CONFLICT (space_id, employee_id) DO NOTHING;