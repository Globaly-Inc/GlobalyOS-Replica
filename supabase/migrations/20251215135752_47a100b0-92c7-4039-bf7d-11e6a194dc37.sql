
-- Phase 1: Wiki Security Functions & RLS Updates

-- Step 1: Add added_by column to wiki_folder_members for audit trail
ALTER TABLE public.wiki_folder_members 
ADD COLUMN IF NOT EXISTS added_by uuid REFERENCES employees(id);

-- Step 2: Add added_by column to wiki_page_members for audit trail
ALTER TABLE public.wiki_page_members 
ADD COLUMN IF NOT EXISTS added_by uuid REFERENCES employees(id);

-- Step 3: Create can_view_wiki_item() security definer function
CREATE OR REPLACE FUNCTION public.can_view_wiki_item(
  _item_type text,
  _item_id uuid,
  _user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _employee record;
  _item record;
  _folder_id uuid;
BEGIN
  -- Super admin can view everything
  IF is_super_admin(_user_id) THEN
    RETURN true;
  END IF;
  
  -- Get employee info
  SELECT e.id, e.organization_id, e.office_id, e.department
  INTO _employee
  FROM employees e WHERE e.user_id = _user_id LIMIT 1;
  
  IF _employee IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get item details
  IF _item_type = 'folder' THEN
    SELECT f.organization_id, f.access_scope, f.created_by
    INTO _item
    FROM wiki_folders f WHERE f.id = _item_id;
  ELSE
    SELECT p.organization_id, p.access_scope, p.folder_id, p.inherit_from_folder, p.created_by
    INTO _item
    FROM wiki_pages p WHERE p.id = _item_id;
    _folder_id := _item.folder_id;
  END IF;
  
  IF _item IS NULL THEN
    RETURN false;
  END IF;
  
  -- Must be org member
  IF _employee.organization_id != _item.organization_id THEN
    RETURN false;
  END IF;
  
  -- Owner/Admin/HR can view everything in their org
  IF has_role(_user_id, 'owner') OR has_role(_user_id, 'admin') OR has_role(_user_id, 'hr') THEN
    RETURN true;
  END IF;
  
  -- Creator can always view their own items
  IF _item.created_by = _employee.id THEN
    RETURN true;
  END IF;
  
  -- For pages with inherit_from_folder, check parent folder access
  IF _item_type = 'page' AND _item.inherit_from_folder = true AND _folder_id IS NOT NULL THEN
    RETURN can_view_wiki_item('folder', _folder_id, _user_id);
  END IF;
  
  -- Check access_scope
  CASE _item.access_scope
    WHEN 'company' THEN
      RETURN true;
    WHEN 'public' THEN
      RETURN true;
    WHEN 'offices' THEN
      IF _item_type = 'folder' THEN
        RETURN EXISTS (
          SELECT 1 FROM wiki_folder_offices wfo
          WHERE wfo.folder_id = _item_id AND wfo.office_id = _employee.office_id
        );
      ELSE
        RETURN EXISTS (
          SELECT 1 FROM wiki_page_offices wpo
          WHERE wpo.page_id = _item_id AND wpo.office_id = _employee.office_id
        );
      END IF;
    WHEN 'departments' THEN
      IF _item_type = 'folder' THEN
        RETURN EXISTS (
          SELECT 1 FROM wiki_folder_departments wfd
          WHERE wfd.folder_id = _item_id AND wfd.department = _employee.department
        );
      ELSE
        RETURN EXISTS (
          SELECT 1 FROM wiki_page_departments wpd
          WHERE wpd.page_id = _item_id AND wpd.department = _employee.department
        );
      END IF;
    WHEN 'projects' THEN
      IF _item_type = 'folder' THEN
        RETURN EXISTS (
          SELECT 1 FROM wiki_folder_projects wfp
          JOIN employee_projects ep ON ep.project_id = wfp.project_id
          WHERE wfp.folder_id = _item_id AND ep.employee_id = _employee.id
        );
      ELSE
        RETURN EXISTS (
          SELECT 1 FROM wiki_page_projects wpp
          JOIN employee_projects ep ON ep.project_id = wpp.project_id
          WHERE wpp.page_id = _item_id AND ep.employee_id = _employee.id
        );
      END IF;
    WHEN 'members' THEN
      IF _item_type = 'folder' THEN
        RETURN EXISTS (
          SELECT 1 FROM wiki_folder_members wfm
          WHERE wfm.folder_id = _item_id AND wfm.employee_id = _employee.id
        );
      ELSE
        RETURN EXISTS (
          SELECT 1 FROM wiki_page_members wpm
          WHERE wpm.page_id = _item_id AND wpm.employee_id = _employee.id
        );
      END IF;
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- Step 4: Create can_edit_wiki_item() security definer function
CREATE OR REPLACE FUNCTION public.can_edit_wiki_item(
  _item_type text,
  _item_id uuid,
  _user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _employee record;
  _item record;
BEGIN
  -- Must be able to view first
  IF NOT can_view_wiki_item(_item_type, _item_id, _user_id) THEN
    RETURN false;
  END IF;
  
  -- Super admin can edit everything
  IF is_super_admin(_user_id) THEN
    RETURN true;
  END IF;
  
  -- Get employee info
  SELECT e.id, e.organization_id
  INTO _employee
  FROM employees e WHERE e.user_id = _user_id LIMIT 1;
  
  -- Owner/Admin/HR can edit everything in their org
  IF has_role(_user_id, 'owner') OR has_role(_user_id, 'admin') OR has_role(_user_id, 'hr') THEN
    RETURN true;
  END IF;
  
  -- Get item details
  IF _item_type = 'folder' THEN
    SELECT f.permission_level, f.created_by
    INTO _item
    FROM wiki_folders f WHERE f.id = _item_id;
  ELSE
    SELECT p.permission_level, p.created_by, p.inherit_from_folder, p.folder_id
    INTO _item
    FROM wiki_pages p WHERE p.id = _item_id;
  END IF;
  
  -- Creator can always edit
  IF _item.created_by = _employee.id THEN
    RETURN true;
  END IF;
  
  -- For pages inheriting from folder, check folder's permission level
  IF _item_type = 'page' AND _item.inherit_from_folder = true AND _item.folder_id IS NOT NULL THEN
    RETURN can_edit_wiki_item('folder', _item.folder_id, _user_id);
  END IF;
  
  -- Check if general permission_level is 'edit'
  IF _item.permission_level = 'edit' THEN
    RETURN true;
  END IF;
  
  -- Check member-specific edit permission
  IF _item_type = 'folder' THEN
    RETURN EXISTS (
      SELECT 1 FROM wiki_folder_members wfm
      WHERE wfm.folder_id = _item_id 
      AND wfm.employee_id = _employee.id 
      AND wfm.permission = 'edit'
    );
  ELSE
    RETURN EXISTS (
      SELECT 1 FROM wiki_page_members wpm
      WHERE wpm.page_id = _item_id 
      AND wpm.employee_id = _employee.id 
      AND wpm.permission = 'edit'
    );
  END IF;
END;
$$;

-- Step 5: Create get_wiki_item_members() helper function
CREATE OR REPLACE FUNCTION public.get_wiki_item_members(
  _item_type text,
  _item_id uuid
)
RETURNS TABLE (
  employee_id uuid,
  user_id uuid,
  full_name text,
  avatar_url text,
  email text,
  permission text,
  added_at timestamptz,
  added_by_name text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _item_type = 'folder' THEN
    RETURN QUERY
    SELECT 
      wfm.employee_id,
      e.user_id,
      p.full_name,
      p.avatar_url,
      p.email,
      wfm.permission,
      wfm.created_at as added_at,
      adder_p.full_name as added_by_name
    FROM wiki_folder_members wfm
    JOIN employees e ON e.id = wfm.employee_id
    JOIN profiles p ON p.id = e.user_id
    LEFT JOIN employees adder_e ON adder_e.id = wfm.added_by
    LEFT JOIN profiles adder_p ON adder_p.id = adder_e.user_id
    WHERE wfm.folder_id = _item_id;
  ELSE
    RETURN QUERY
    SELECT 
      wpm.employee_id,
      e.user_id,
      p.full_name,
      p.avatar_url,
      p.email,
      wpm.permission,
      wpm.created_at as added_at,
      adder_p.full_name as added_by_name
    FROM wiki_page_members wpm
    JOIN employees e ON e.id = wpm.employee_id
    JOIN profiles p ON p.id = e.user_id
    LEFT JOIN employees adder_e ON adder_e.id = wpm.added_by
    LEFT JOIN profiles adder_p ON adder_p.id = adder_e.user_id
    WHERE wpm.page_id = _item_id;
  END IF;
END;
$$;

-- Step 6: Update RLS policies on wiki_folders
DROP POLICY IF EXISTS "Org members can view wiki folders" ON wiki_folders;
DROP POLICY IF EXISTS "HR and admins can manage wiki folders" ON wiki_folders;

CREATE POLICY "Users can view wiki folders they have access to"
ON wiki_folders FOR SELECT TO authenticated
USING (can_view_wiki_item('folder', id));

CREATE POLICY "Org members can create wiki folders"
ON wiki_folders FOR INSERT TO authenticated
WITH CHECK (
  is_org_member(auth.uid(), organization_id)
  AND created_by = get_current_employee_id()
);

CREATE POLICY "Users can update wiki folders they can edit"
ON wiki_folders FOR UPDATE TO authenticated
USING (can_edit_wiki_item('folder', id))
WITH CHECK (can_edit_wiki_item('folder', id));

CREATE POLICY "Authorized users can delete wiki folders"
ON wiki_folders FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'owner') 
  OR has_role(auth.uid(), 'admin') 
  OR has_role(auth.uid(), 'hr')
  OR created_by = get_current_employee_id()
);

-- Step 7: Update RLS policies on wiki_pages
DROP POLICY IF EXISTS "Org members can view wiki pages" ON wiki_pages;
DROP POLICY IF EXISTS "HR and admins can manage wiki pages" ON wiki_pages;

CREATE POLICY "Users can view wiki pages they have access to"
ON wiki_pages FOR SELECT TO authenticated
USING (can_view_wiki_item('page', id));

CREATE POLICY "Org members can create wiki pages"
ON wiki_pages FOR INSERT TO authenticated
WITH CHECK (
  is_org_member(auth.uid(), organization_id)
  AND created_by = get_current_employee_id()
);

CREATE POLICY "Users can update wiki pages they can edit"
ON wiki_pages FOR UPDATE TO authenticated
USING (can_edit_wiki_item('page', id))
WITH CHECK (can_edit_wiki_item('page', id));

CREATE POLICY "Authorized users can delete wiki pages"
ON wiki_pages FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'owner') 
  OR has_role(auth.uid(), 'admin') 
  OR has_role(auth.uid(), 'hr')
  OR created_by = get_current_employee_id()
);

-- Step 8: Update RLS policies on wiki_folder_members junction table
DROP POLICY IF EXISTS "HR and admins can manage folder members" ON wiki_folder_members;
DROP POLICY IF EXISTS "Org members can view folder members" ON wiki_folder_members;

CREATE POLICY "Users can view folder members if they can view folder"
ON wiki_folder_members FOR SELECT TO authenticated
USING (can_view_wiki_item('folder', folder_id));

CREATE POLICY "Users can manage folder members if they can edit folder"
ON wiki_folder_members FOR INSERT TO authenticated
WITH CHECK (can_edit_wiki_item('folder', folder_id));

CREATE POLICY "Users can update folder members if they can edit folder"
ON wiki_folder_members FOR UPDATE TO authenticated
USING (can_edit_wiki_item('folder', folder_id));

CREATE POLICY "Users can delete folder members if they can edit folder"
ON wiki_folder_members FOR DELETE TO authenticated
USING (can_edit_wiki_item('folder', folder_id));

-- Step 9: Update RLS policies on wiki_page_members junction table
DROP POLICY IF EXISTS "HR and admins can manage page members" ON wiki_page_members;
DROP POLICY IF EXISTS "Org members can view page members" ON wiki_page_members;

CREATE POLICY "Users can view page members if they can view page"
ON wiki_page_members FOR SELECT TO authenticated
USING (can_view_wiki_item('page', page_id));

CREATE POLICY "Users can manage page members if they can edit page"
ON wiki_page_members FOR INSERT TO authenticated
WITH CHECK (can_edit_wiki_item('page', page_id));

CREATE POLICY "Users can update page members if they can edit page"
ON wiki_page_members FOR UPDATE TO authenticated
USING (can_edit_wiki_item('page', page_id));

CREATE POLICY "Users can delete page members if they can edit page"
ON wiki_page_members FOR DELETE TO authenticated
USING (can_edit_wiki_item('page', page_id));

-- Step 10: Update RLS policies on wiki_folder_offices
DROP POLICY IF EXISTS "HR and admins can manage folder offices" ON wiki_folder_offices;
DROP POLICY IF EXISTS "Org members can view folder offices" ON wiki_folder_offices;

CREATE POLICY "Users can view folder offices if they can view folder"
ON wiki_folder_offices FOR SELECT TO authenticated
USING (can_view_wiki_item('folder', folder_id));

CREATE POLICY "Users can manage folder offices if they can edit folder"
ON wiki_folder_offices FOR ALL TO authenticated
USING (can_edit_wiki_item('folder', folder_id))
WITH CHECK (can_edit_wiki_item('folder', folder_id));

-- Step 11: Update RLS policies on wiki_page_offices
DROP POLICY IF EXISTS "HR and admins can manage page offices" ON wiki_page_offices;
DROP POLICY IF EXISTS "Org members can view page offices" ON wiki_page_offices;

CREATE POLICY "Users can view page offices if they can view page"
ON wiki_page_offices FOR SELECT TO authenticated
USING (can_view_wiki_item('page', page_id));

CREATE POLICY "Users can manage page offices if they can edit page"
ON wiki_page_offices FOR ALL TO authenticated
USING (can_edit_wiki_item('page', page_id))
WITH CHECK (can_edit_wiki_item('page', page_id));

-- Step 12: Update RLS policies on wiki_folder_departments
DROP POLICY IF EXISTS "HR and admins can manage folder departments" ON wiki_folder_departments;
DROP POLICY IF EXISTS "Org members can view folder departments" ON wiki_folder_departments;

CREATE POLICY "Users can view folder departments if they can view folder"
ON wiki_folder_departments FOR SELECT TO authenticated
USING (can_view_wiki_item('folder', folder_id));

CREATE POLICY "Users can manage folder departments if they can edit folder"
ON wiki_folder_departments FOR ALL TO authenticated
USING (can_edit_wiki_item('folder', folder_id))
WITH CHECK (can_edit_wiki_item('folder', folder_id));

-- Step 13: Update RLS policies on wiki_page_departments
DROP POLICY IF EXISTS "HR and admins can manage page departments" ON wiki_page_departments;
DROP POLICY IF EXISTS "Org members can view page departments" ON wiki_page_departments;

CREATE POLICY "Users can view page departments if they can view page"
ON wiki_page_departments FOR SELECT TO authenticated
USING (can_view_wiki_item('page', page_id));

CREATE POLICY "Users can manage page departments if they can edit page"
ON wiki_page_departments FOR ALL TO authenticated
USING (can_edit_wiki_item('page', page_id))
WITH CHECK (can_edit_wiki_item('page', page_id));

-- Step 14: Update RLS policies on wiki_folder_projects
DROP POLICY IF EXISTS "HR and admins can manage folder projects" ON wiki_folder_projects;
DROP POLICY IF EXISTS "Org members can view folder projects" ON wiki_folder_projects;

CREATE POLICY "Users can view folder projects if they can view folder"
ON wiki_folder_projects FOR SELECT TO authenticated
USING (can_view_wiki_item('folder', folder_id));

CREATE POLICY "Users can manage folder projects if they can edit folder"
ON wiki_folder_projects FOR ALL TO authenticated
USING (can_edit_wiki_item('folder', folder_id))
WITH CHECK (can_edit_wiki_item('folder', folder_id));

-- Step 15: Update RLS policies on wiki_page_projects
DROP POLICY IF EXISTS "HR and admins can manage page projects" ON wiki_page_projects;
DROP POLICY IF EXISTS "Org members can view page projects" ON wiki_page_projects;

CREATE POLICY "Users can view page projects if they can view page"
ON wiki_page_projects FOR SELECT TO authenticated
USING (can_view_wiki_item('page', page_id));

CREATE POLICY "Users can manage page projects if they can edit page"
ON wiki_page_projects FOR ALL TO authenticated
USING (can_edit_wiki_item('page', page_id))
WITH CHECK (can_edit_wiki_item('page', page_id));
