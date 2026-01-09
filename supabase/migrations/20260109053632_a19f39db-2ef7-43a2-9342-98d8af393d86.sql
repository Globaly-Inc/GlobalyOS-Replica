-- Update create_workflow_from_template to set initial current_stage_id
CREATE OR REPLACE FUNCTION public.create_workflow_from_template(
  p_employee_id UUID,
  p_organization_id UUID,
  p_target_date DATE,
  p_workflow_type TEXT,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template_id UUID;
  v_workflow_id UUID;
  v_task RECORD;
  v_assignee_id UUID;
  v_due_date DATE;
  v_manager_id UUID;
  v_hr_employee_id UUID;
  v_first_stage_id UUID;
BEGIN
  -- Get default template for this workflow type
  SELECT id INTO v_template_id FROM workflow_templates
  WHERE organization_id = p_organization_id AND type = p_workflow_type AND is_default = true LIMIT 1;
  
  IF v_template_id IS NULL THEN RETURN NULL; END IF;
  
  -- Get the first stage for this template
  SELECT id INTO v_first_stage_id FROM workflow_stages
  WHERE template_id = v_template_id
  ORDER BY sort_order ASC
  LIMIT 1;
  
  -- Get the employee's manager
  SELECT manager_id INTO v_manager_id FROM employees WHERE id = p_employee_id;
  
  -- Get an HR/admin employee for HR-assigned tasks
  SELECT e.id INTO v_hr_employee_id FROM employees e
  JOIN user_roles ur ON ur.user_id = e.user_id
  WHERE e.organization_id = p_organization_id AND ur.role IN ('hr', 'admin', 'owner') AND e.status = 'active' LIMIT 1;
  
  -- Create the workflow with current_stage_id set to first stage
  INSERT INTO employee_workflows (employee_id, organization_id, template_id, type, status, start_date, target_date, created_by, current_stage_id)
  VALUES (p_employee_id, p_organization_id, v_template_id, p_workflow_type, 'active', CURRENT_DATE, p_target_date, p_created_by, v_first_stage_id)
  RETURNING id INTO v_workflow_id;
  
  -- Create tasks from template, including stage_id
  FOR v_task IN SELECT * FROM workflow_template_tasks WHERE template_id = v_template_id ORDER BY sort_order
  LOOP
    v_assignee_id := CASE v_task.assignee_type
      WHEN 'employee' THEN p_employee_id
      WHEN 'manager' THEN v_manager_id
      WHEN 'hr' THEN v_hr_employee_id
      WHEN 'it' THEN v_hr_employee_id
      WHEN 'specific_person' THEN v_task.assignee_id
      ELSE NULL
    END;
    v_due_date := p_target_date + v_task.due_days_offset;
    
    INSERT INTO employee_workflow_tasks (workflow_id, organization_id, employee_id, title, description, category, assignee_id, due_date, is_required, status, sort_order, stage_id)
    VALUES (v_workflow_id, p_organization_id, p_employee_id, v_task.title, v_task.description, v_task.category, v_assignee_id, v_due_date, v_task.is_required, 'pending', v_task.sort_order, v_task.stage_id);
  END LOOP;
  
  RETURN v_workflow_id;
END;
$$;