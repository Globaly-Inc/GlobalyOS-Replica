-- Function to get all items requiring transfer before offboarding
CREATE OR REPLACE FUNCTION public.get_employee_offboard_data(
  p_employee_id UUID,
  p_organization_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'wiki_pages', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', wp.id,
        'title', wp.title,
        'folder_id', wp.folder_id
      )), '[]'::jsonb)
      FROM wiki_pages wp
      WHERE wp.created_by = p_employee_id 
        AND wp.organization_id = p_organization_id
    ),
    'wiki_folders', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', wf.id,
        'name', wf.name,
        'parent_id', wf.parent_id
      )), '[]'::jsonb)
      FROM wiki_folders wf
      WHERE wf.created_by = p_employee_id 
        AND wf.organization_id = p_organization_id
    ),
    'pending_tasks', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', ewt.id,
        'title', ewt.title,
        'status', ewt.status,
        'workflow_id', ewt.workflow_id,
        'due_date', ewt.due_date
      )), '[]'::jsonb)
      FROM employee_workflow_tasks ewt
      WHERE ewt.assignee_id = p_employee_id 
        AND ewt.organization_id = p_organization_id
        AND ewt.status IN ('pending', 'in_progress')
    ),
    'direct_reports', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', e.id,
        'full_name', p.full_name,
        'position', e.position,
        'avatar_url', p.avatar_url
      )), '[]'::jsonb)
      FROM employees e
      JOIN profiles p ON p.id = e.user_id
      WHERE e.manager_id = p_employee_id 
        AND e.organization_id = p_organization_id
        AND e.status = 'active'
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Function to bulk transfer wiki items to a new owner
CREATE OR REPLACE FUNCTION public.bulk_transfer_wiki_items(
  p_page_ids UUID[],
  p_folder_ids UUID[],
  p_new_owner_id UUID,
  p_organization_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Transfer wiki pages
  IF p_page_ids IS NOT NULL AND array_length(p_page_ids, 1) > 0 THEN
    UPDATE wiki_pages
    SET created_by = p_new_owner_id, updated_at = NOW()
    WHERE id = ANY(p_page_ids) AND organization_id = p_organization_id;
  END IF;
  
  -- Transfer wiki folders
  IF p_folder_ids IS NOT NULL AND array_length(p_folder_ids, 1) > 0 THEN
    UPDATE wiki_folders
    SET created_by = p_new_owner_id, updated_at = NOW()
    WHERE id = ANY(p_folder_ids) AND organization_id = p_organization_id;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Function to bulk reassign workflow tasks
CREATE OR REPLACE FUNCTION public.bulk_reassign_tasks(
  p_task_ids UUID[],
  p_new_assignee_id UUID,
  p_organization_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE employee_workflow_tasks
  SET assignee_id = p_new_assignee_id, updated_at = NOW()
  WHERE id = ANY(p_task_ids) AND organization_id = p_organization_id;
  
  RETURN TRUE;
END;
$$;

-- Function to bulk reassign direct reports
CREATE OR REPLACE FUNCTION public.bulk_reassign_direct_reports(
  p_employee_ids UUID[],
  p_new_manager_id UUID,
  p_organization_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE employees
  SET manager_id = p_new_manager_id
  WHERE id = ANY(p_employee_ids) AND organization_id = p_organization_id;
  
  RETURN TRUE;
END;
$$;