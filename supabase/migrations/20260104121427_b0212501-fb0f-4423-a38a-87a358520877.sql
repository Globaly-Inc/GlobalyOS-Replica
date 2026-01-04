-- Create a secure server-side function for creating wiki pages
-- This bypasses RLS issues by using SECURITY DEFINER and validating permissions explicitly

CREATE OR REPLACE FUNCTION public.create_wiki_page(
  _organization_id uuid,
  _folder_id uuid DEFAULT NULL,
  _title text DEFAULT 'Untitled'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _employee_id uuid;
  _new_page_id uuid;
  _next_sort_order integer;
  _folder_org_id uuid;
BEGIN
  -- Get the current employee ID for this organization
  _employee_id := get_current_employee_id_for_org(_organization_id);
  
  IF _employee_id IS NULL THEN
    RAISE EXCEPTION 'No active employee record found for your user in this organization';
  END IF;
  
  -- Verify user is an org member
  IF NOT is_org_member(auth.uid(), _organization_id) THEN
    RAISE EXCEPTION 'You are not a member of this organization';
  END IF;
  
  -- If folder_id is provided, verify it exists and belongs to the same org
  IF _folder_id IS NOT NULL THEN
    SELECT organization_id INTO _folder_org_id
    FROM wiki_folders
    WHERE id = _folder_id;
    
    IF _folder_org_id IS NULL THEN
      RAISE EXCEPTION 'Folder not found';
    END IF;
    
    IF _folder_org_id != _organization_id THEN
      RAISE EXCEPTION 'Folder does not belong to this organization';
    END IF;
    
    -- Check if user can edit the folder (has permission to add pages)
    IF NOT can_edit_wiki_item('folder', _folder_id, auth.uid()) THEN
      RAISE EXCEPTION 'You do not have permission to add pages to this folder';
    END IF;
  END IF;
  
  -- Calculate the next sort order
  SELECT COALESCE(MAX(sort_order), 0) + 1 INTO _next_sort_order
  FROM wiki_pages
  WHERE organization_id = _organization_id
    AND folder_id IS NOT DISTINCT FROM _folder_id;
  
  -- Insert the new page
  INSERT INTO wiki_pages (
    organization_id,
    folder_id,
    title,
    content,
    sort_order,
    created_by,
    updated_by
  ) VALUES (
    _organization_id,
    _folder_id,
    COALESCE(NULLIF(TRIM(_title), ''), 'Untitled'),
    '',
    _next_sort_order,
    _employee_id,
    _employee_id
  )
  RETURNING id INTO _new_page_id;
  
  RETURN _new_page_id;
END;
$$;