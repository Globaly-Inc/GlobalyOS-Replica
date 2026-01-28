-- Fix Auto-Sync for All Space Types
-- Replace is_archived = false with archived_at IS NULL
-- Add auto_sync_members = true check to all queries

-- 1. Drop the INSERT trigger on employees (no longer needed)
DROP TRIGGER IF EXISTS trigger_sync_company_members_on_insert ON employees;

-- 2. Replace sync_company_space_members() with activation-focused logic
CREATE OR REPLACE FUNCTION sync_company_space_members()
RETURNS TRIGGER AS $$
DECLARE
  v_space RECORD;
  v_employee_name TEXT;
  v_system_employee_id UUID;
BEGIN
  -- Get employee name for system messages
  SELECT COALESCE(p.full_name, 'Team member')
  INTO v_employee_name
  FROM employees e
  LEFT JOIN profiles p ON p.id = e.user_id
  WHERE e.id = NEW.id;

  -- Get a system employee for message sender (first admin)
  SELECT id INTO v_system_employee_id
  FROM employees
  WHERE organization_id = NEW.organization_id AND role IN ('owner', 'admin')
  LIMIT 1;

  -- Flow 1: Member activated - add to company-wide spaces
  IF TG_OP = 'UPDATE' AND OLD.status != 'active' AND NEW.status = 'active' THEN
    FOR v_space IN
      SELECT cs.id, cs.name
      FROM chat_spaces cs
      WHERE cs.organization_id = NEW.organization_id
        AND cs.access_scope = 'company'
        AND cs.archived_at IS NULL
        AND cs.auto_sync_members = true
    LOOP
      -- Add member if not already present
      INSERT INTO chat_space_members (space_id, employee_id, organization_id, role, source)
      VALUES (v_space.id, NEW.id, NEW.organization_id, 'member', 'auto_sync')
      ON CONFLICT (space_id, employee_id) DO NOTHING;

      -- Log the action
      INSERT INTO chat_space_member_logs (space_id, employee_id, organization_id, action_type, source, performed_by)
      VALUES (v_space.id, NEW.id, NEW.organization_id, 'added', 'auto_sync', v_system_employee_id);

      -- Post system message
      IF v_system_employee_id IS NOT NULL THEN
        INSERT INTO chat_messages (space_id, sender_id, organization_id, content, content_type, system_event_data)
        VALUES (
          v_space.id,
          v_system_employee_id,
          NEW.organization_id,
          v_employee_name || ' joined the space',
          'system',
          jsonb_build_object('event_type', 'member_added', 'employee_id', NEW.id, 'employee_name', v_employee_name)
        );
      END IF;
    END LOOP;
  END IF;

  -- Flow 2: Member deactivated - remove from ALL auto-synced spaces
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status != 'active' THEN
    FOR v_space IN
      SELECT cs.id, cs.name
      FROM chat_spaces cs
      JOIN chat_space_members csm ON csm.space_id = cs.id
      WHERE csm.employee_id = NEW.id
        AND csm.source = 'auto_sync'
        AND cs.archived_at IS NULL
    LOOP
      -- Remove member
      DELETE FROM chat_space_members
      WHERE space_id = v_space.id AND employee_id = NEW.id AND source = 'auto_sync';

      -- Log the action
      INSERT INTO chat_space_member_logs (space_id, employee_id, organization_id, action_type, source, performed_by)
      VALUES (v_space.id, NEW.id, NEW.organization_id, 'removed', 'auto_sync', v_system_employee_id);

      -- Post system message
      IF v_system_employee_id IS NOT NULL THEN
        INSERT INTO chat_messages (space_id, sender_id, organization_id, content, content_type, system_event_data)
        VALUES (
          v_space.id,
          v_system_employee_id,
          NEW.organization_id,
          v_employee_name || ' left the space',
          'system',
          jsonb_build_object('event_type', 'member_removed', 'employee_id', NEW.id, 'employee_name', v_employee_name)
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'sync_company_space_members failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Replace sync_office_space_members() with fixed column references
CREATE OR REPLACE FUNCTION sync_office_space_members()
RETURNS TRIGGER AS $$
DECLARE
  v_space RECORD;
  v_employee_name TEXT;
  v_system_employee_id UUID;
BEGIN
  -- Only process if employee is active
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;

  -- Get employee name for system messages
  SELECT COALESCE(p.full_name, 'Team member')
  INTO v_employee_name
  FROM employees e
  LEFT JOIN profiles p ON p.id = e.user_id
  WHERE e.id = NEW.id;

  -- Get a system employee for message sender
  SELECT id INTO v_system_employee_id
  FROM employees
  WHERE organization_id = NEW.organization_id AND role IN ('owner', 'admin')
  LIMIT 1;

  -- Flow 3: Office changed - remove from old office spaces
  IF TG_OP = 'UPDATE' AND OLD.office_id IS DISTINCT FROM NEW.office_id AND OLD.office_id IS NOT NULL THEN
    FOR v_space IN
      SELECT cs.id, cs.name
      FROM chat_spaces cs
      JOIN chat_space_offices cso ON cso.space_id = cs.id
      WHERE cso.office_id = OLD.office_id
        AND cs.access_scope = 'offices'
        AND cs.archived_at IS NULL
        AND cs.auto_sync_members = true
    LOOP
      -- Remove member
      DELETE FROM chat_space_members
      WHERE space_id = v_space.id AND employee_id = NEW.id AND source = 'auto_sync';

      -- Log the action
      INSERT INTO chat_space_member_logs (space_id, employee_id, organization_id, action_type, source, performed_by)
      VALUES (v_space.id, NEW.id, NEW.organization_id, 'removed', 'auto_sync', v_system_employee_id);

      -- Post system message
      IF v_system_employee_id IS NOT NULL THEN
        INSERT INTO chat_messages (space_id, sender_id, organization_id, content, content_type, system_event_data)
        VALUES (
          v_space.id,
          v_system_employee_id,
          NEW.organization_id,
          v_employee_name || ' left the space',
          'system',
          jsonb_build_object('event_type', 'member_removed', 'employee_id', NEW.id, 'employee_name', v_employee_name)
        );
      END IF;
    END LOOP;
  END IF;

  -- Add to new office spaces
  IF NEW.office_id IS NOT NULL THEN
    FOR v_space IN
      SELECT cs.id, cs.name
      FROM chat_spaces cs
      JOIN chat_space_offices cso ON cso.space_id = cs.id
      WHERE cso.office_id = NEW.office_id
        AND cs.access_scope = 'offices'
        AND cs.archived_at IS NULL
        AND cs.auto_sync_members = true
    LOOP
      -- Add member if not already present
      INSERT INTO chat_space_members (space_id, employee_id, organization_id, role, source)
      VALUES (v_space.id, NEW.id, NEW.organization_id, 'member', 'auto_sync')
      ON CONFLICT (space_id, employee_id) DO NOTHING;

      -- Only log and message if this was a new addition
      IF FOUND THEN
        INSERT INTO chat_space_member_logs (space_id, employee_id, organization_id, action_type, source, performed_by)
        VALUES (v_space.id, NEW.id, NEW.organization_id, 'added', 'auto_sync', v_system_employee_id);

        IF v_system_employee_id IS NOT NULL THEN
          INSERT INTO chat_messages (space_id, sender_id, organization_id, content, content_type, system_event_data)
          VALUES (
            v_space.id,
            v_system_employee_id,
            NEW.organization_id,
            v_employee_name || ' joined the space',
            'system',
            jsonb_build_object('event_type', 'member_added', 'employee_id', NEW.id, 'employee_name', v_employee_name)
          );
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'sync_office_space_members failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Replace sync_department_space_members() with fixed column references
CREATE OR REPLACE FUNCTION sync_department_space_members()
RETURNS TRIGGER AS $$
DECLARE
  v_space RECORD;
  v_employee_name TEXT;
  v_system_employee_id UUID;
BEGIN
  -- Only process if employee is active
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;

  -- Get employee name for system messages
  SELECT COALESCE(p.full_name, 'Team member')
  INTO v_employee_name
  FROM employees e
  LEFT JOIN profiles p ON p.id = e.user_id
  WHERE e.id = NEW.id;

  -- Get a system employee for message sender
  SELECT id INTO v_system_employee_id
  FROM employees
  WHERE organization_id = NEW.organization_id AND role IN ('owner', 'admin')
  LIMIT 1;

  -- Flow 4: Department changed - remove from old department spaces
  IF TG_OP = 'UPDATE' AND OLD.department_id IS DISTINCT FROM NEW.department_id AND OLD.department_id IS NOT NULL THEN
    FOR v_space IN
      SELECT cs.id, cs.name
      FROM chat_spaces cs
      JOIN chat_space_departments csd ON csd.space_id = cs.id
      WHERE csd.department_id = OLD.department_id
        AND cs.access_scope = 'departments'
        AND cs.archived_at IS NULL
        AND cs.auto_sync_members = true
    LOOP
      -- Remove member
      DELETE FROM chat_space_members
      WHERE space_id = v_space.id AND employee_id = NEW.id AND source = 'auto_sync';

      -- Log the action
      INSERT INTO chat_space_member_logs (space_id, employee_id, organization_id, action_type, source, performed_by)
      VALUES (v_space.id, NEW.id, NEW.organization_id, 'removed', 'auto_sync', v_system_employee_id);

      -- Post system message
      IF v_system_employee_id IS NOT NULL THEN
        INSERT INTO chat_messages (space_id, sender_id, organization_id, content, content_type, system_event_data)
        VALUES (
          v_space.id,
          v_system_employee_id,
          NEW.organization_id,
          v_employee_name || ' left the space',
          'system',
          jsonb_build_object('event_type', 'member_removed', 'employee_id', NEW.id, 'employee_name', v_employee_name)
        );
      END IF;
    END LOOP;
  END IF;

  -- Add to new department spaces
  IF NEW.department_id IS NOT NULL THEN
    FOR v_space IN
      SELECT cs.id, cs.name
      FROM chat_spaces cs
      JOIN chat_space_departments csd ON csd.space_id = cs.id
      WHERE csd.department_id = NEW.department_id
        AND cs.access_scope = 'departments'
        AND cs.archived_at IS NULL
        AND cs.auto_sync_members = true
    LOOP
      -- Add member if not already present
      INSERT INTO chat_space_members (space_id, employee_id, organization_id, role, source)
      VALUES (v_space.id, NEW.id, NEW.organization_id, 'member', 'auto_sync')
      ON CONFLICT (space_id, employee_id) DO NOTHING;

      -- Only log and message if this was a new addition
      IF FOUND THEN
        INSERT INTO chat_space_member_logs (space_id, employee_id, organization_id, action_type, source, performed_by)
        VALUES (v_space.id, NEW.id, NEW.organization_id, 'added', 'auto_sync', v_system_employee_id);

        IF v_system_employee_id IS NOT NULL THEN
          INSERT INTO chat_messages (space_id, sender_id, organization_id, content, content_type, system_event_data)
          VALUES (
            v_space.id,
            v_system_employee_id,
            NEW.organization_id,
            v_employee_name || ' joined the space',
            'system',
            jsonb_build_object('event_type', 'member_added', 'employee_id', NEW.id, 'employee_name', v_employee_name)
          );
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'sync_department_space_members failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Replace sync_project_space_members() with fixed column references
CREATE OR REPLACE FUNCTION sync_project_space_members()
RETURNS TRIGGER AS $$
DECLARE
  v_space RECORD;
  v_employee_name TEXT;
  v_system_employee_id UUID;
  v_employee_status TEXT;
  v_org_id UUID;
BEGIN
  -- Get employee details
  IF TG_OP = 'DELETE' THEN
    SELECT e.status, e.organization_id, COALESCE(p.full_name, 'Team member')
    INTO v_employee_status, v_org_id, v_employee_name
    FROM employees e
    LEFT JOIN profiles p ON p.id = e.user_id
    WHERE e.id = OLD.employee_id;
  ELSE
    SELECT e.status, e.organization_id, COALESCE(p.full_name, 'Team member')
    INTO v_employee_status, v_org_id, v_employee_name
    FROM employees e
    LEFT JOIN profiles p ON p.id = e.user_id
    WHERE e.id = NEW.employee_id;
  END IF;

  -- Only process if employee is active
  IF v_employee_status != 'active' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Get a system employee for message sender
  SELECT id INTO v_system_employee_id
  FROM employees
  WHERE organization_id = v_org_id AND role IN ('owner', 'admin')
  LIMIT 1;

  -- Flow 5: Project assignment added
  IF TG_OP = 'INSERT' THEN
    FOR v_space IN
      SELECT cs.id, cs.name
      FROM chat_spaces cs
      JOIN chat_space_projects csp ON csp.space_id = cs.id
      WHERE csp.project_id = NEW.project_id
        AND cs.access_scope = 'projects'
        AND cs.archived_at IS NULL
        AND cs.auto_sync_members = true
    LOOP
      -- Add member if not already present
      INSERT INTO chat_space_members (space_id, employee_id, organization_id, role, source)
      VALUES (v_space.id, NEW.employee_id, v_org_id, 'member', 'auto_sync')
      ON CONFLICT (space_id, employee_id) DO NOTHING;

      -- Only log and message if this was a new addition
      IF FOUND THEN
        INSERT INTO chat_space_member_logs (space_id, employee_id, organization_id, action_type, source, performed_by)
        VALUES (v_space.id, NEW.employee_id, v_org_id, 'added', 'auto_sync', v_system_employee_id);

        IF v_system_employee_id IS NOT NULL THEN
          INSERT INTO chat_messages (space_id, sender_id, organization_id, content, content_type, system_event_data)
          VALUES (
            v_space.id,
            v_system_employee_id,
            v_org_id,
            v_employee_name || ' joined the space',
            'system',
            jsonb_build_object('event_type', 'member_added', 'employee_id', NEW.employee_id, 'employee_name', v_employee_name)
          );
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- Flow 5: Project assignment removed
  IF TG_OP = 'DELETE' THEN
    FOR v_space IN
      SELECT cs.id, cs.name
      FROM chat_spaces cs
      JOIN chat_space_projects csp ON csp.space_id = cs.id
      WHERE csp.project_id = OLD.project_id
        AND cs.access_scope = 'projects'
        AND cs.archived_at IS NULL
        AND cs.auto_sync_members = true
    LOOP
      -- Remove member
      DELETE FROM chat_space_members
      WHERE space_id = v_space.id AND employee_id = OLD.employee_id AND source = 'auto_sync';

      -- Log the action
      INSERT INTO chat_space_member_logs (space_id, employee_id, organization_id, action_type, source, performed_by)
      VALUES (v_space.id, OLD.employee_id, v_org_id, 'removed', 'auto_sync', v_system_employee_id);

      -- Post system message
      IF v_system_employee_id IS NOT NULL THEN
        INSERT INTO chat_messages (space_id, sender_id, organization_id, content, content_type, system_event_data)
        VALUES (
          v_space.id,
          v_system_employee_id,
          v_org_id,
          v_employee_name || ' left the space',
          'system',
          jsonb_build_object('event_type', 'member_removed', 'employee_id', OLD.employee_id, 'employee_name', v_employee_name)
        );
      END IF;
    END LOOP;
  END IF;

  RETURN COALESCE(NEW, OLD);

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'sync_project_space_members failed: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Ensure triggers are correctly configured
DROP TRIGGER IF EXISTS trigger_sync_company_members_on_update ON employees;
CREATE TRIGGER trigger_sync_company_members_on_update
  AFTER UPDATE OF status ON employees
  FOR EACH ROW
  EXECUTE FUNCTION sync_company_space_members();

DROP TRIGGER IF EXISTS trigger_sync_office_members ON employees;
CREATE TRIGGER trigger_sync_office_members
  AFTER UPDATE OF office_id ON employees
  FOR EACH ROW
  EXECUTE FUNCTION sync_office_space_members();

DROP TRIGGER IF EXISTS trigger_sync_department_members ON employees;
CREATE TRIGGER trigger_sync_department_members
  AFTER UPDATE OF department_id ON employees
  FOR EACH ROW
  EXECUTE FUNCTION sync_department_space_members();

DROP TRIGGER IF EXISTS trigger_sync_project_members_insert ON employee_projects;
CREATE TRIGGER trigger_sync_project_members_insert
  AFTER INSERT ON employee_projects
  FOR EACH ROW
  EXECUTE FUNCTION sync_project_space_members();

DROP TRIGGER IF EXISTS trigger_sync_project_members_delete ON employee_projects;
CREATE TRIGGER trigger_sync_project_members_delete
  AFTER DELETE ON employee_projects
  FOR EACH ROW
  EXECUTE FUNCTION sync_project_space_members();