-- Fix sync_project_space_members() function with correct access_scope filter
CREATE OR REPLACE FUNCTION sync_project_space_members()
RETURNS TRIGGER AS $$
DECLARE
  v_space_id UUID;
  v_employee_name TEXT;
  v_existing_member UUID;
BEGIN
  -- Handle INSERT - add member to project-scoped spaces
  IF TG_OP = 'INSERT' THEN
    -- Find spaces linked to this project with access_scope = 'projects' and auto_sync enabled
    FOR v_space_id IN
      SELECT cs.id
      FROM chat_spaces cs
      JOIN chat_space_projects csp ON csp.space_id = cs.id
      WHERE csp.project_id = NEW.project_id
        AND cs.access_scope = 'projects'
        AND cs.auto_sync_members = true
        AND cs.archived_at IS NULL
        AND cs.organization_id = NEW.organization_id
    LOOP
      -- Check if already a member
      SELECT id INTO v_existing_member
      FROM chat_space_members
      WHERE space_id = v_space_id AND employee_id = NEW.employee_id;
      
      IF v_existing_member IS NULL THEN
        -- Get employee name from profiles
        SELECT COALESCE(p.full_name, 'Team member')
        INTO v_employee_name
        FROM employees e
        LEFT JOIN profiles p ON p.user_id = e.user_id
        WHERE e.id = NEW.employee_id;
        
        -- Add to space
        INSERT INTO chat_space_members (space_id, employee_id, organization_id, role, source)
        VALUES (v_space_id, NEW.employee_id, NEW.organization_id, 'member', 'auto_sync');
        
        -- Log the action
        INSERT INTO chat_space_member_logs (space_id, employee_id, organization_id, action_type, source)
        VALUES (v_space_id, NEW.employee_id, NEW.organization_id, 'joined', 'auto_sync');
        
        -- Create system message
        INSERT INTO chat_messages (space_id, sender_id, organization_id, content, content_type, system_event_data)
        VALUES (
          v_space_id,
          NEW.employee_id,
          NEW.organization_id,
          v_employee_name || ' was added to the project',
          'system_event',
          jsonb_build_object('event_type', 'member_joined', 'employee_id', NEW.employee_id, 'source', 'project_sync')
        );
      END IF;
    END LOOP;
    
    RETURN NEW;
  END IF;
  
  -- Handle DELETE - remove member from project-scoped spaces (only if no other projects link them)
  IF TG_OP = 'DELETE' THEN
    FOR v_space_id IN
      SELECT cs.id
      FROM chat_spaces cs
      JOIN chat_space_projects csp ON csp.space_id = cs.id
      WHERE csp.project_id = OLD.project_id
        AND cs.access_scope = 'projects'
        AND cs.auto_sync_members = true
        AND cs.archived_at IS NULL
        AND cs.organization_id = OLD.organization_id
    LOOP
      -- Only remove if not linked via another project on this space
      IF NOT EXISTS (
        SELECT 1
        FROM employee_projects ep
        JOIN chat_space_projects csp ON csp.project_id = ep.project_id
        WHERE csp.space_id = v_space_id
          AND ep.employee_id = OLD.employee_id
          AND ep.project_id != OLD.project_id
      ) THEN
        -- Get employee name
        SELECT COALESCE(p.full_name, 'Team member')
        INTO v_employee_name
        FROM employees e
        LEFT JOIN profiles p ON p.user_id = e.user_id
        WHERE e.id = OLD.employee_id;
        
        -- Remove from space (only auto_sync members)
        DELETE FROM chat_space_members
        WHERE space_id = v_space_id
          AND employee_id = OLD.employee_id
          AND source = 'auto_sync';
        
        -- Log the action
        INSERT INTO chat_space_member_logs (space_id, employee_id, organization_id, action_type, source)
        VALUES (v_space_id, OLD.employee_id, OLD.organization_id, 'left', 'auto_sync');
        
        -- Create system message
        INSERT INTO chat_messages (space_id, sender_id, organization_id, content, content_type, system_event_data)
        VALUES (
          v_space_id,
          OLD.employee_id,
          OLD.organization_id,
          v_employee_name || ' was removed from the project',
          'system_event',
          jsonb_build_object('event_type', 'member_left', 'employee_id', OLD.employee_id, 'source', 'project_sync')
        );
      END IF;
    END LOOP;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger for both INSERT and DELETE
DROP TRIGGER IF EXISTS trigger_sync_project_space_members ON employee_projects;
CREATE TRIGGER trigger_sync_project_space_members
  AFTER INSERT OR DELETE ON employee_projects
  FOR EACH ROW
  EXECUTE FUNCTION sync_project_space_members();