-- Create secure RPC for position history that hides salary for unauthorized viewers
CREATE OR REPLACE FUNCTION get_position_history_for_viewer(target_employee_id uuid)
RETURNS TABLE (
  ph_id uuid,
  ph_position text,
  ph_department text,
  ph_salary numeric,
  ph_manager_id uuid,
  ph_effective_date date,
  ph_end_date date,
  ph_change_type text,
  ph_notes text,
  ph_employment_type text,
  ph_is_current boolean,
  ph_manager_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer_id uuid := auth.uid();
  target_user_id uuid;
  is_self boolean;
  is_hr_or_admin boolean;
  is_owner boolean;
  can_view_salary boolean;
BEGIN
  -- Get the user_id of the target employee
  SELECT e.user_id INTO target_user_id
  FROM employees e
  WHERE e.id = target_employee_id;
  
  -- Determine viewer permissions
  is_self := target_user_id = viewer_id;
  is_hr_or_admin := has_role(viewer_id, 'hr'::app_role) OR has_role(viewer_id, 'admin'::app_role);
  is_owner := has_role(viewer_id, 'owner'::app_role);
  can_view_salary := is_self OR is_hr_or_admin OR is_owner;
  
  RETURN QUERY
  SELECT
    ph.id,
    ph.position,
    ph.department,
    CASE WHEN can_view_salary THEN ph.salary ELSE NULL END,
    ph.manager_id,
    ph.effective_date,
    ph.end_date,
    ph.change_type,
    ph.notes,
    ph.employment_type,
    ph.is_current,
    p.full_name
  FROM position_history ph
  LEFT JOIN employees m ON m.id = ph.manager_id
  LEFT JOIN profiles p ON p.id = m.user_id
  WHERE ph.employee_id = target_employee_id
  ORDER BY ph.effective_date DESC;
END;
$$;

-- Add security documentation to employees table
COMMENT ON TABLE employees IS 
'Employee records with sensitive PII. 
SECURITY: Always use get_employee_for_viewer() RPC for profile views.
Direct table queries should only select non-sensitive columns.';