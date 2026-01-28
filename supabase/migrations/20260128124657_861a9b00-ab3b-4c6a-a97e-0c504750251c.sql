-- Fix sync_project_space_members() to use correct column references
-- The employee_projects table has: id, employee_id, project_id, organization_id, created_at
-- It does NOT have updated_by or created_by columns

CREATE OR REPLACE FUNCTION sync_project_space_members()
RETURNS TRIGGER AS $$
DECLARE
  v_space_id UUID;
  v_employee_name TEXT;
  v_system_employee_id UUID;
BEGIN
  -- Find the space linked to this project
  SELECT s.id INTO v_space_id
  FROM chat_spaces s
  JOIN chat_space_projects csp ON csp.space_id = s.id
  WHERE csp.project_id = NEW.project_id
    AND s.organization_id = NEW.organization_id
    AND s.auto_sync_members = true
  LIMIT 1;

  IF v_space_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the employee name for the system message
  SELECT COALESCE(e.first_name || ' ' || e.last_name, e.first_name, 'Team member')
  INTO v_employee_name
  FROM employees e
  WHERE e.id = NEW.employee_id;

  -- Get or create a system employee for the organization
  SELECT id INTO v_system_employee_id
  FROM employees
  WHERE organization_id = NEW.organization_id
  LIMIT 1;

  -- Add employee to space if not already a member
  INSERT INTO chat_space_members (
    space_id,
    employee_id,
    organization_id,
    role,
    source,
    notification_setting
  )
  VALUES (
    v_space_id,
    NEW.employee_id,
    NEW.organization_id,
    'member',
    'auto_sync',
    'all'
  )
  ON CONFLICT (space_id, employee_id) DO NOTHING;

  -- Log the addition
  INSERT INTO chat_space_member_logs (
    space_id,
    employee_id,
    organization_id,
    action_type,
    source,
    performed_by
  )
  VALUES (
    v_space_id,
    NEW.employee_id,
    NEW.organization_id,
    'added',
    'auto_sync',
    NULL
  );

  -- Create system message about the addition
  IF v_system_employee_id IS NOT NULL THEN
    INSERT INTO chat_messages (
      space_id,
      sender_id,
      organization_id,
      content,
      content_type,
      system_event_data
    )
    VALUES (
      v_space_id,
      v_system_employee_id,
      NEW.organization_id,
      v_employee_name || ' was added by Auto-Sync',
      'system',
      jsonb_build_object(
        'event_type', 'member_added',
        'employee_id', NEW.employee_id,
        'employee_name', v_employee_name,
        'added_by_name', 'Auto-Sync',
        'source', 'project_assignment'
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;