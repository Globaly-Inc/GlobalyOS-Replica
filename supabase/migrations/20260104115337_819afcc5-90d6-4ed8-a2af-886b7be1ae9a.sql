-- 1. Add unique constraint for folder names (case-insensitive, per parent folder)
CREATE UNIQUE INDEX IF NOT EXISTS idx_wiki_folders_unique_name 
ON wiki_folders (organization_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), LOWER(TRIM(name)));

-- 2. Drop conflicting/redundant RLS INSERT policies on wiki_pages
DROP POLICY IF EXISTS "Org members can create wiki pages" ON wiki_pages;

-- 3. Drop conflicting/redundant RLS INSERT policies on wiki_folders
DROP POLICY IF EXISTS "Org members can create wiki folders" ON wiki_folders;

-- 4. Fix the can_edit_wiki_item function to handle folders separately (they don't have inherit_from_folder)
CREATE OR REPLACE FUNCTION public.can_edit_wiki_item(_item_type text, _item_id uuid, _user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _employee record;
  _folder_item record;
  _page_item record;
  _permission_level text;
  _created_by uuid;
  _inherit_from_folder boolean;
  _folder_id uuid;
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
  
  -- Get item details - handle folder and page separately
  IF _item_type = 'folder' THEN
    SELECT f.permission_level, f.created_by
    INTO _permission_level, _created_by
    FROM wiki_folders f WHERE f.id = _item_id;
    
    _inherit_from_folder := false;
    _folder_id := NULL;
  ELSE
    SELECT p.permission_level, p.created_by, p.inherit_from_folder, p.folder_id
    INTO _permission_level, _created_by, _inherit_from_folder, _folder_id
    FROM wiki_pages p WHERE p.id = _item_id;
  END IF;
  
  -- Creator can always edit
  IF _created_by = _employee.id THEN
    RETURN true;
  END IF;
  
  -- For pages inheriting from folder, check folder's permission level
  IF _item_type = 'page' AND _inherit_from_folder = true AND _folder_id IS NOT NULL THEN
    RETURN can_edit_wiki_item('folder', _folder_id, _user_id);
  END IF;
  
  -- Check if general permission_level is 'edit'
  IF _permission_level = 'edit' THEN
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
$function$;