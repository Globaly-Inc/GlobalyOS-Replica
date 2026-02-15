
-- Drop policies that depend on the function
DROP POLICY IF EXISTS "Users can view wiki folders they have access to" ON wiki_folders;
DROP POLICY IF EXISTS "Users can view wiki pages they have access to" ON wiki_pages;
DROP POLICY IF EXISTS "Users can view folder members if they can view folder" ON wiki_folder_members;
DROP POLICY IF EXISTS "Users can view page members if they can view page" ON wiki_page_members;
DROP POLICY IF EXISTS "Users can view folder offices if they can view folder" ON wiki_folder_offices;
DROP POLICY IF EXISTS "Users can view page offices if they can view page" ON wiki_page_offices;
DROP POLICY IF EXISTS "Users can view folder departments if they can view folder" ON wiki_folder_departments;
DROP POLICY IF EXISTS "Users can view page departments if they can view page" ON wiki_page_departments;
DROP POLICY IF EXISTS "Users can view folder projects if they can view folder" ON wiki_folder_projects;
DROP POLICY IF EXISTS "Users can view page projects if they can view page" ON wiki_page_projects;

-- Now drop the function
DROP FUNCTION public.can_view_wiki_item(text, uuid, uuid);

-- Recreate with fix: use individual variables instead of record to avoid field-access crash on folders
CREATE FUNCTION public.can_view_wiki_item(
  _item_type text,
  _item_id uuid,
  _user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _employee record;
  _org_id uuid;
  _access_scope text;
  _created_by uuid;
  _inherit_from_folder boolean := false;
  _folder_id uuid;
BEGIN
  IF is_super_admin(_user_id) THEN RETURN true; END IF;

  SELECT e.id, e.organization_id, e.office_id, e.department
  INTO _employee
  FROM employees e WHERE e.user_id = _user_id LIMIT 1;

  IF _employee IS NULL THEN RETURN false; END IF;

  IF _item_type = 'folder' THEN
    SELECT f.organization_id, f.access_scope, f.created_by
    INTO _org_id, _access_scope, _created_by
    FROM wiki_folders f WHERE f.id = _item_id;
  ELSE
    SELECT p.organization_id, p.access_scope, p.folder_id, p.inherit_from_folder, p.created_by
    INTO _org_id, _access_scope, _folder_id, _inherit_from_folder, _created_by
    FROM wiki_pages p WHERE p.id = _item_id;
  END IF;

  IF _org_id IS NULL THEN RETURN false; END IF;
  IF _employee.organization_id != _org_id THEN RETURN false; END IF;

  IF has_role(_user_id, 'owner') OR has_role(_user_id, 'admin') OR has_role(_user_id, 'hr') THEN
    RETURN true;
  END IF;

  IF _created_by = _employee.id THEN RETURN true; END IF;

  IF _item_type = 'page' AND _inherit_from_folder = true AND _folder_id IS NOT NULL THEN
    RETURN can_view_wiki_item('folder', _folder_id, _user_id);
  END IF;

  CASE _access_scope
    WHEN 'company' THEN RETURN true;
    WHEN 'public' THEN RETURN true;
    WHEN 'offices' THEN
      IF _item_type = 'folder' THEN
        RETURN EXISTS (SELECT 1 FROM wiki_folder_offices wfo WHERE wfo.folder_id = _item_id AND wfo.office_id = _employee.office_id);
      ELSE
        RETURN EXISTS (SELECT 1 FROM wiki_page_offices wpo WHERE wpo.page_id = _item_id AND wpo.office_id = _employee.office_id);
      END IF;
    WHEN 'departments' THEN
      IF _item_type = 'folder' THEN
        RETURN EXISTS (SELECT 1 FROM wiki_folder_departments wfd WHERE wfd.folder_id = _item_id AND wfd.department = _employee.department);
      ELSE
        RETURN EXISTS (SELECT 1 FROM wiki_page_departments wpd WHERE wpd.page_id = _item_id AND wpd.department = _employee.department);
      END IF;
    WHEN 'projects' THEN
      IF _item_type = 'folder' THEN
        RETURN EXISTS (SELECT 1 FROM wiki_folder_projects wfp JOIN employee_projects ep ON ep.project_id = wfp.project_id WHERE wfp.folder_id = _item_id AND ep.employee_id = _employee.id);
      ELSE
        RETURN EXISTS (SELECT 1 FROM wiki_page_projects wpp JOIN employee_projects ep ON ep.project_id = wpp.project_id WHERE wpp.page_id = _item_id AND ep.employee_id = _employee.id);
      END IF;
    WHEN 'members' THEN
      IF _item_type = 'folder' THEN
        RETURN EXISTS (SELECT 1 FROM wiki_folder_members wfm WHERE wfm.folder_id = _item_id AND wfm.employee_id = _employee.id);
      ELSE
        RETURN EXISTS (SELECT 1 FROM wiki_page_members wpm WHERE wpm.page_id = _item_id AND wpm.employee_id = _employee.id);
      END IF;
    ELSE RETURN false;
  END CASE;
END;
$$;

-- Recreate all policies
CREATE POLICY "Users can view wiki folders they have access to" ON wiki_folders FOR SELECT USING (can_view_wiki_item('folder', id));
CREATE POLICY "Users can view wiki pages they have access to" ON wiki_pages FOR SELECT USING (can_view_wiki_item('page', id));
CREATE POLICY "Users can view folder members if they can view folder" ON wiki_folder_members FOR SELECT USING (can_view_wiki_item('folder', folder_id));
CREATE POLICY "Users can view page members if they can view page" ON wiki_page_members FOR SELECT USING (can_view_wiki_item('page', page_id));
CREATE POLICY "Users can view folder offices if they can view folder" ON wiki_folder_offices FOR SELECT USING (can_view_wiki_item('folder', folder_id));
CREATE POLICY "Users can view page offices if they can view page" ON wiki_page_offices FOR SELECT USING (can_view_wiki_item('page', page_id));
CREATE POLICY "Users can view folder departments if they can view folder" ON wiki_folder_departments FOR SELECT USING (can_view_wiki_item('folder', folder_id));
CREATE POLICY "Users can view page departments if they can view page" ON wiki_page_departments FOR SELECT USING (can_view_wiki_item('page', page_id));
CREATE POLICY "Users can view folder projects if they can view folder" ON wiki_folder_projects FOR SELECT USING (can_view_wiki_item('folder', folder_id));
CREATE POLICY "Users can view page projects if they can view page" ON wiki_page_projects FOR SELECT USING (can_view_wiki_item('page', page_id));
