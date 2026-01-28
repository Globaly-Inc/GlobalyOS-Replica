-- Fix sync_project_space_members function to use profiles.full_name instead of non-existent employees.first_name/last_name
CREATE OR REPLACE FUNCTION public.sync_project_space_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space_id uuid;
  v_employee_name text;
  v_system_employee_id uuid;
BEGIN
  -- Get the space linked to this project
  SELECT space_id INTO v_space_id
  FROM chat_space_projects
  WHERE project_id = NEW.project_id
  AND organization_id = NEW.organization_id;
  
  -- If no space exists for this project, exit
  IF v_space_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get employee name from profiles table (correct schema)
  SELECT COALESCE(p.full_name, 'Team member')
  INTO v_employee_name
  FROM employees e
  LEFT JOIN profiles p ON p.id = e.user_id
  WHERE e.id = NEW.employee_id;
  
  -- Get system employee for notifications
  SELECT id INTO v_system_employee_id
  FROM employees
  WHERE organization_id = NEW.organization_id
  AND role = 'admin'
  LIMIT 1;
  
  -- Add employee to space if not already a member
  INSERT INTO chat_space_members (
    space_id,
    employee_id,
    organization_id,
    role,
    source
  )
  VALUES (
    v_space_id,
    NEW.employee_id,
    NEW.organization_id,
    'member',
    'auto_sync'
  )
  ON CONFLICT (space_id, employee_id) DO NOTHING;
  
  -- Log the action
  INSERT INTO chat_space_member_logs (
    space_id,
    employee_id,
    organization_id,
    action_type,
    source
  )
  VALUES (
    v_space_id,
    NEW.employee_id,
    NEW.organization_id,
    'added',
    'auto_sync'
  );
  
  -- Send system message about new member
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
      v_employee_name || ' was added to the project',
      'system',
      jsonb_build_object(
        'event_type', 'member_added',
        'employee_id', NEW.employee_id,
        'employee_name', v_employee_name
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;