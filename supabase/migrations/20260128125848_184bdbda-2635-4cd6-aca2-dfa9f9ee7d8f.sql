-- Fix sync_project_space_members() to remove invalid 'role' column reference
-- Use NEW.employee_id as sender for system messages (matching other sync functions)

CREATE OR REPLACE FUNCTION sync_project_space_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space_id UUID;
  v_employee_name TEXT;
BEGIN
  -- Only process inserts
  IF TG_OP = 'INSERT' THEN
    -- Find the project-scoped chat space for this project
    SELECT cs.id INTO v_space_id
    FROM chat_spaces cs
    JOIN chat_space_projects csp ON csp.space_id = cs.id
    WHERE csp.project_id = NEW.project_id
    AND cs.organization_id = NEW.organization_id
    AND cs.space_type = 'project'
    AND cs.auto_sync_members = true
    LIMIT 1;

    -- If a space exists for this project, add the employee as a member
    IF v_space_id IS NOT NULL THEN
      -- Get employee name from profiles table
      SELECT COALESCE(p.full_name, 'Team member')
      INTO v_employee_name
      FROM employees e
      LEFT JOIN profiles p ON p.id = e.user_id
      WHERE e.id = NEW.employee_id;

      -- Add member to space if not already exists
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

      -- Log the member addition
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
        'joined',
        'auto_sync',
        NEW.employee_id
      );

      -- Create system message for the space using the employee being added as sender
      INSERT INTO chat_messages (
        space_id,
        sender_id,
        organization_id,
        content,
        content_type,
        status,
        system_event_data
      )
      VALUES (
        v_space_id,
        NEW.employee_id,
        NEW.organization_id,
        v_employee_name || ' was added to the project',
        'system',
        'sent',
        jsonb_build_object(
          'event_type', 'member_joined',
          'employee_id', NEW.employee_id,
          'employee_name', v_employee_name
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;