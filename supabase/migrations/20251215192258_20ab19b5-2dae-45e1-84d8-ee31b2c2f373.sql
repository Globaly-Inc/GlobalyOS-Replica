-- Function to get folder contents count recursively
CREATE OR REPLACE FUNCTION public.get_wiki_folder_contents_count(_folder_id uuid)
RETURNS TABLE(
  folder_count integer,
  page_count integer,
  file_count integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _folders integer := 0;
  _pages integer := 0;
  _files integer := 0;
BEGIN
  -- Recursive CTE to get all descendant folders
  WITH RECURSIVE folder_tree AS (
    SELECT id FROM wiki_folders WHERE id = _folder_id
    UNION ALL
    SELECT f.id FROM wiki_folders f
    INNER JOIN folder_tree ft ON f.parent_id = ft.id
  )
  SELECT COUNT(*) - 1 INTO _folders FROM folder_tree; -- Subtract 1 to exclude the folder itself
  
  -- Count pages (non-files) in all folders
  WITH RECURSIVE folder_tree AS (
    SELECT id FROM wiki_folders WHERE id = _folder_id
    UNION ALL
    SELECT f.id FROM wiki_folders f
    INNER JOIN folder_tree ft ON f.parent_id = ft.id
  )
  SELECT COUNT(*) INTO _pages 
  FROM wiki_pages p
  WHERE p.folder_id IN (SELECT id FROM folder_tree)
  AND (p.is_file = false OR p.is_file IS NULL);
  
  -- Count files in all folders
  WITH RECURSIVE folder_tree AS (
    SELECT id FROM wiki_folders WHERE id = _folder_id
    UNION ALL
    SELECT f.id FROM wiki_folders f
    INNER JOIN folder_tree ft ON f.parent_id = ft.id
  )
  SELECT COUNT(*) INTO _files 
  FROM wiki_pages p
  WHERE p.folder_id IN (SELECT id FROM folder_tree)
  AND p.is_file = true;
  
  RETURN QUERY SELECT _folders, _pages, _files;
END;
$$;

-- Function to recursively delete folder and all contents
CREATE OR REPLACE FUNCTION public.delete_wiki_folder_recursive(_folder_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _employee_id uuid;
BEGIN
  -- Get current employee ID
  _employee_id := get_current_employee_id();
  
  IF _employee_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Delete all pages in folder and subfolders (including files)
  WITH RECURSIVE folder_tree AS (
    SELECT id FROM wiki_folders WHERE id = _folder_id
    UNION ALL
    SELECT f.id FROM wiki_folders f
    INNER JOIN folder_tree ft ON f.parent_id = ft.id
  )
  DELETE FROM wiki_pages WHERE folder_id IN (SELECT id FROM folder_tree);
  
  -- Delete all subfolders (children first due to parent_id constraint)
  WITH RECURSIVE folder_tree AS (
    SELECT id, 1 as level FROM wiki_folders WHERE id = _folder_id
    UNION ALL
    SELECT f.id, ft.level + 1 FROM wiki_folders f
    INNER JOIN folder_tree ft ON f.parent_id = ft.id
  )
  DELETE FROM wiki_folders 
  WHERE id IN (SELECT id FROM folder_tree ORDER BY level DESC);
  
  RETURN true;
END;
$$;