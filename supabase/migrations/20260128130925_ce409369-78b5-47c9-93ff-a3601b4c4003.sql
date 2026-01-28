-- Fix sync_project_space_members() function: correct profiles JOIN from p.user_id to p.id
-- The profiles table uses 'id' as the user_id (directly references auth.users.id)

CREATE OR REPLACE FUNCTION public.sync_project_space_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space_id uuid;
  v_employee_name text;
  v_org_id uuid;
  v_creator_id uuid;
BEGIN
  -- Handle INSERT: Add employee to project-scoped spaces
  IF TG_OP = 'INSERT' THEN
    -- Get employee info
    SELECT 
      e.organization_id,
      COALESCE(p.full_name, e.first_name || ' ' || e.last_name)
    INTO v_org_id, v_employee_name
    FROM employees e
    LEFT JOIN profiles p ON p.id = e.user_id  -- FIXED: profiles.id = employees.user_id
    WHERE e.id = NEW.employee_id;

    -- Find all project-scoped spaces linked to this project with auto_sync enabled
    FOR v_space_id, v_creator_id IN
      SELECT cs.id, cs.created_by
      FROM chat_spaces cs
      JOIN chat_space_projects csp ON csp.space_id = cs.id
      WHERE csp.project_id = NEW.project_id
        AND cs.access_scope = 'projects'
        AND cs.auto_sync_members = true
        AND cs.archived_at IS NULL
    LOOP
      -- Add member if not already present
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
        v_org_id,
        'member',
        'auto_project',
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
        v_org_id,
        'added',
        'auto_project',
        v_creator_id
      );

      -- Post system message
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
        v_creator_id,
        v_org_id,
        v_employee_name || ' was added to this space (project assignment)',
        'system',
        jsonb_build_object(
          'type', 'member_added',
          'employee_id', NEW.employee_id,
          'employee_name', v_employee_name,
          'source', 'project_sync'
        )
      );
    END LOOP;

    RETURN NEW;

  -- Handle DELETE: Remove employee from project-scoped spaces (if no other linked projects)
  ELSIF TG_OP = 'DELETE' THEN
    -- Get employee info
    SELECT 
      e.organization_id,
      COALESCE(p.full_name, e.first_name || ' ' || e.last_name)
    INTO v_org_id, v_employee_name
    FROM employees e
    LEFT JOIN profiles p ON p.id = e.user_id  -- FIXED: profiles.id = employees.user_id
    WHERE e.id = OLD.employee_id;

    -- Find all project-scoped spaces linked to this project
    FOR v_space_id, v_creator_id IN
      SELECT cs.id, cs.created_by
      FROM chat_spaces cs
      JOIN chat_space_projects csp ON csp.space_id = cs.id
      WHERE csp.project_id = OLD.project_id
        AND cs.access_scope = 'projects'
        AND cs.auto_sync_members = true
        AND cs.archived_at IS NULL
    LOOP
      -- Only remove if employee has no other projects linked to this space
      IF NOT EXISTS (
        SELECT 1 
        FROM employee_projects ep
        JOIN chat_space_projects csp ON csp.project_id = ep.project_id
        WHERE ep.employee_id = OLD.employee_id
          AND csp.space_id = v_space_id
          AND ep.project_id != OLD.project_id
      ) THEN
        -- Remove from space members
        DELETE FROM chat_space_members
        WHERE space_id = v_space_id
          AND employee_id = OLD.employee_id
          AND source = 'auto_project';

        -- Log the removal
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
          OLD.employee_id,
          v_org_id,
          'removed',
          'auto_project',
          v_creator_id
        );

        -- Post system message
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
          v_creator_id,
          v_org_id,
          v_employee_name || ' was removed from this space (project unassigned)',
          'system',
          jsonb_build_object(
            'type', 'member_removed',
            'employee_id', OLD.employee_id,
            'employee_name', v_employee_name,
            'source', 'project_sync'
          )
        );
      END IF;
    END LOOP;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;