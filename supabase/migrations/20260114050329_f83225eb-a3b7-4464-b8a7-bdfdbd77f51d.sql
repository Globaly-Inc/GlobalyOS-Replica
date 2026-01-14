-- Extend get_employee_offboard_data to include project leadership and KPIs
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
      WHERE wp.created_by = p_employee_id AND wp.organization_id = p_organization_id
    ),
    'wiki_folders', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', wf.id, 
        'name', wf.name, 
        'parent_id', wf.parent_id
      )), '[]'::jsonb)
      FROM wiki_folders wf
      WHERE wf.created_by = p_employee_id AND wf.organization_id = p_organization_id
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
    ),
    'led_projects', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', proj.id, 
        'name', proj.name, 
        'icon', proj.icon, 
        'color', proj.color,
        'role', CASE 
          WHEN proj.project_lead_id = p_employee_id THEN 'lead'
          ELSE 'secondary'
        END
      )), '[]'::jsonb)
      FROM projects proj
      WHERE (proj.project_lead_id = p_employee_id OR proj.secondary_lead_id = p_employee_id)
        AND proj.organization_id = p_organization_id
    ),
    'individual_kpis', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', k.id, 
        'title', k.title, 
        'status', k.status,
        'quarter', k.quarter, 
        'year', k.year
      )), '[]'::jsonb)
      FROM kpis k
      WHERE k.employee_id = p_employee_id 
        AND k.organization_id = p_organization_id
        AND k.scope_type = 'individual'
    ),
    'owned_kpis', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', k.id, 
        'title', k.title, 
        'status', k.status,
        'scope_type', k.scope_type, 
        'is_primary', ko.is_primary,
        'quarter', k.quarter, 
        'year', k.year
      )), '[]'::jsonb)
      FROM kpi_owners ko
      JOIN kpis k ON k.id = ko.kpi_id
      WHERE ko.employee_id = p_employee_id 
        AND ko.organization_id = p_organization_id
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Create function to bulk transfer project leads
CREATE OR REPLACE FUNCTION public.bulk_transfer_project_leads(
  p_project_ids UUID[],
  p_role TEXT,
  p_new_lead_id UUID,
  p_organization_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_role = 'lead' THEN
    UPDATE projects
    SET project_lead_id = p_new_lead_id, updated_at = NOW()
    WHERE id = ANY(p_project_ids) AND organization_id = p_organization_id;
  ELSIF p_role = 'secondary' THEN
    UPDATE projects
    SET secondary_lead_id = p_new_lead_id, updated_at = NOW()
    WHERE id = ANY(p_project_ids) AND organization_id = p_organization_id;
  END IF;
  RETURN TRUE;
END;
$$;

-- Create function to bulk transfer individual KPIs
CREATE OR REPLACE FUNCTION public.bulk_transfer_individual_kpis(
  p_kpi_ids UUID[],
  p_new_owner_id UUID,
  p_organization_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE kpis
  SET employee_id = p_new_owner_id, updated_at = NOW()
  WHERE id = ANY(p_kpi_ids) AND organization_id = p_organization_id;
  RETURN TRUE;
END;
$$;

-- Create function to bulk transfer KPI ownership (for group/org KPIs)
CREATE OR REPLACE FUNCTION public.bulk_transfer_kpi_ownership(
  p_kpi_ids UUID[],
  p_old_owner_id UUID,
  p_new_owner_id UUID,
  p_organization_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE kpi_owners
  SET employee_id = p_new_owner_id
  WHERE kpi_id = ANY(p_kpi_ids) 
    AND employee_id = p_old_owner_id
    AND organization_id = p_organization_id;
  RETURN TRUE;
END;
$$;