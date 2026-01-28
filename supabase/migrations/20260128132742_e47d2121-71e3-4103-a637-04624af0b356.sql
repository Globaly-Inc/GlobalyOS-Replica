-- ============================================================================
-- REFACTOR: Auto-Sync Chat Space Members - Fail-Safe & Complete Implementation
-- ============================================================================
-- This migration fixes all sync functions to:
-- 1. Use correct column references (profiles.full_name, not employees.first_name)
-- 2. Use valid source values (auto_sync only)
-- 3. Wrap in exception handlers so profile edits never fail due to sync errors
-- 4. Add department sync functionality
-- ============================================================================

-- Drop existing triggers first to avoid conflicts
DROP TRIGGER IF EXISTS trigger_sync_project_space_members ON employee_projects;
DROP TRIGGER IF EXISTS trigger_sync_office_space_members ON employees;
DROP TRIGGER IF EXISTS trigger_sync_company_space_members ON employees;
DROP TRIGGER IF EXISTS trigger_sync_department_space_members ON employees;

-- ============================================================================
-- 1. SYNC PROJECT SPACE MEMBERS (Fixed)
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_project_space_members()
RETURNS TRIGGER AS $$
DECLARE
  v_space RECORD;
  v_employee_name TEXT;
  v_org_id UUID;
  v_system_employee_id UUID;
BEGIN
  -- Wrap everything in exception handler so profile edits never fail
  BEGIN
    -- Handle INSERT (employee added to project)
    IF TG_OP = 'INSERT' THEN
      -- Get employee details
      SELECT 
        e.organization_id,
        COALESCE(p.full_name, 'Team member')
      INTO v_org_id, v_employee_name
      FROM employees e
      LEFT JOIN profiles p ON p.id = e.user_id
      WHERE e.id = NEW.employee_id;

      -- Skip if employee not found
      IF v_org_id IS NULL THEN
        RETURN NEW;
      END IF;

      -- Get a system employee for posting messages (first active admin/owner)
      SELECT e.id INTO v_system_employee_id
      FROM employees e
      JOIN user_roles ur ON ur.user_id = e.user_id
      WHERE e.organization_id = v_org_id 
        AND e.status = 'active'
        AND ur.role IN ('owner', 'admin')
      LIMIT 1;

      -- Find all spaces linked to this project
      FOR v_space IN
        SELECT cs.id, cs.name
        FROM chat_spaces cs
        JOIN chat_space_projects csp ON csp.space_id = cs.id
        WHERE csp.project_id = NEW.project_id
          AND cs.organization_id = v_org_id
          AND cs.is_archived = false
      LOOP
        -- Add member if not already exists
        INSERT INTO chat_space_members (
          space_id, employee_id, organization_id, role, source, notification_setting
        )
        VALUES (
          v_space.id, NEW.employee_id, v_org_id, 'member', 'auto_sync', 'all'
        )
        ON CONFLICT (space_id, employee_id) DO NOTHING;

        -- Log the addition
        INSERT INTO chat_space_member_logs (
          space_id, employee_id, organization_id, action_type, source, performed_by
        )
        VALUES (
          v_space.id, NEW.employee_id, v_org_id, 'added', 'auto_sync', v_system_employee_id
        );

        -- Post system message if we have a system employee
        IF v_system_employee_id IS NOT NULL THEN
          INSERT INTO chat_messages (
            space_id, sender_id, organization_id, content, content_type, system_event_data
          )
          VALUES (
            v_space.id,
            v_system_employee_id,
            v_org_id,
            v_employee_name || ' was added to the space (project assignment)',
            'system',
            jsonb_build_object(
              'event_type', 'member_added',
              'employee_id', NEW.employee_id,
              'employee_name', v_employee_name,
              'reason', 'project_assignment'
            )
          );
        END IF;
      END LOOP;

      RETURN NEW;

    -- Handle DELETE (employee removed from project)
    ELSIF TG_OP = 'DELETE' THEN
      -- Get employee details
      SELECT 
        e.organization_id,
        COALESCE(p.full_name, 'Team member')
      INTO v_org_id, v_employee_name
      FROM employees e
      LEFT JOIN profiles p ON p.id = e.user_id
      WHERE e.id = OLD.employee_id;

      -- Skip if employee not found
      IF v_org_id IS NULL THEN
        RETURN OLD;
      END IF;

      -- Get a system employee for posting messages
      SELECT e.id INTO v_system_employee_id
      FROM employees e
      JOIN user_roles ur ON ur.user_id = e.user_id
      WHERE e.organization_id = v_org_id 
        AND e.status = 'active'
        AND ur.role IN ('owner', 'admin')
      LIMIT 1;

      -- Find all spaces linked to this project and remove member
      FOR v_space IN
        SELECT cs.id, cs.name
        FROM chat_spaces cs
        JOIN chat_space_projects csp ON csp.space_id = cs.id
        WHERE csp.project_id = OLD.project_id
          AND cs.organization_id = v_org_id
      LOOP
        -- Only remove if added via auto_sync
        DELETE FROM chat_space_members
        WHERE space_id = v_space.id 
          AND employee_id = OLD.employee_id
          AND source = 'auto_sync';

        -- Log the removal if delete happened
        IF FOUND THEN
          INSERT INTO chat_space_member_logs (
            space_id, employee_id, organization_id, action_type, source, performed_by
          )
          VALUES (
            v_space.id, OLD.employee_id, v_org_id, 'removed', 'auto_sync', v_system_employee_id
          );

          -- Post system message
          IF v_system_employee_id IS NOT NULL THEN
            INSERT INTO chat_messages (
              space_id, sender_id, organization_id, content, content_type, system_event_data
            )
            VALUES (
              v_space.id,
              v_system_employee_id,
              v_org_id,
              v_employee_name || ' was removed from the space (project unassigned)',
              'system',
              jsonb_build_object(
                'event_type', 'member_removed',
                'employee_id', OLD.employee_id,
                'employee_name', v_employee_name,
                'reason', 'project_unassigned'
              )
            );
          END IF;
        END IF;
      END LOOP;

      RETURN OLD;
    END IF;

    RETURN COALESCE(NEW, OLD);

  EXCEPTION WHEN OTHERS THEN
    -- Log warning but don't block the main operation
    RAISE WARNING 'sync_project_space_members failed: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. SYNC OFFICE SPACE MEMBERS (Fixed)
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_office_space_members()
RETURNS TRIGGER AS $$
DECLARE
  v_space RECORD;
  v_employee_name TEXT;
  v_system_employee_id UUID;
BEGIN
  -- Wrap everything in exception handler
  BEGIN
    -- Only process office changes
    IF TG_OP = 'UPDATE' AND OLD.office_id IS DISTINCT FROM NEW.office_id THEN
      -- Get employee name
      SELECT COALESCE(p.full_name, 'Team member')
      INTO v_employee_name
      FROM profiles p
      WHERE p.id = NEW.user_id;

      -- Get system employee for messages
      SELECT e.id INTO v_system_employee_id
      FROM employees e
      JOIN user_roles ur ON ur.user_id = e.user_id
      WHERE e.organization_id = NEW.organization_id 
        AND e.status = 'active'
        AND ur.role IN ('owner', 'admin')
      LIMIT 1;

      -- Remove from old office spaces (if had old office)
      IF OLD.office_id IS NOT NULL THEN
        FOR v_space IN
          SELECT cs.id, cs.name
          FROM chat_spaces cs
          JOIN chat_space_offices cso ON cso.space_id = cs.id
          WHERE cso.office_id = OLD.office_id
            AND cs.organization_id = NEW.organization_id
            AND cs.access_scope = 'offices'
        LOOP
          DELETE FROM chat_space_members
          WHERE space_id = v_space.id 
            AND employee_id = NEW.id
            AND source = 'auto_sync';

          IF FOUND THEN
            INSERT INTO chat_space_member_logs (
              space_id, employee_id, organization_id, action_type, source, performed_by
            )
            VALUES (v_space.id, NEW.id, NEW.organization_id, 'removed', 'auto_sync', v_system_employee_id);

            IF v_system_employee_id IS NOT NULL THEN
              INSERT INTO chat_messages (
                space_id, sender_id, organization_id, content, content_type, system_event_data
              )
              VALUES (
                v_space.id, v_system_employee_id, NEW.organization_id,
                v_employee_name || ' left the space (office changed)',
                'system',
                jsonb_build_object('event_type', 'member_removed', 'employee_id', NEW.id, 'reason', 'office_changed')
              );
            END IF;
          END IF;
        END LOOP;
      END IF;

      -- Add to new office spaces (if has new office)
      IF NEW.office_id IS NOT NULL AND NEW.status = 'active' THEN
        FOR v_space IN
          SELECT cs.id, cs.name
          FROM chat_spaces cs
          JOIN chat_space_offices cso ON cso.space_id = cs.id
          WHERE cso.office_id = NEW.office_id
            AND cs.organization_id = NEW.organization_id
            AND cs.access_scope = 'offices'
            AND cs.is_archived = false
        LOOP
          INSERT INTO chat_space_members (
            space_id, employee_id, organization_id, role, source, notification_setting
          )
          VALUES (v_space.id, NEW.id, NEW.organization_id, 'member', 'auto_sync', 'all')
          ON CONFLICT (space_id, employee_id) DO NOTHING;

          INSERT INTO chat_space_member_logs (
            space_id, employee_id, organization_id, action_type, source, performed_by
          )
          VALUES (v_space.id, NEW.id, NEW.organization_id, 'added', 'auto_sync', v_system_employee_id);

          IF v_system_employee_id IS NOT NULL THEN
            INSERT INTO chat_messages (
              space_id, sender_id, organization_id, content, content_type, system_event_data
            )
            VALUES (
              v_space.id, v_system_employee_id, NEW.organization_id,
              v_employee_name || ' joined the space (office assignment)',
              'system',
              jsonb_build_object('event_type', 'member_added', 'employee_id', NEW.id, 'reason', 'office_assignment')
            );
          END IF;
        END LOOP;
      END IF;
    END IF;

    RETURN NEW;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'sync_office_space_members failed: %', SQLERRM;
    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. SYNC COMPANY SPACE MEMBERS (Fixed - handles activation/deactivation)
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_company_space_members()
RETURNS TRIGGER AS $$
DECLARE
  v_space RECORD;
  v_employee_name TEXT;
  v_system_employee_id UUID;
BEGIN
  -- Wrap everything in exception handler
  BEGIN
    -- Get employee name
    SELECT COALESCE(p.full_name, 'Team member')
    INTO v_employee_name
    FROM profiles p
    WHERE p.id = COALESCE(NEW.user_id, OLD.user_id);

    -- Get system employee for messages
    SELECT e.id INTO v_system_employee_id
    FROM employees e
    JOIN user_roles ur ON ur.user_id = e.user_id
    WHERE e.organization_id = COALESCE(NEW.organization_id, OLD.organization_id)
      AND e.status = 'active'
      AND ur.role IN ('owner', 'admin')
      AND e.id != COALESCE(NEW.id, OLD.id)
    LIMIT 1;

    -- Handle new active employee (INSERT with active status)
    IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
      FOR v_space IN
        SELECT cs.id, cs.name
        FROM chat_spaces cs
        WHERE cs.organization_id = NEW.organization_id
          AND cs.access_scope = 'company'
          AND cs.is_archived = false
      LOOP
        INSERT INTO chat_space_members (
          space_id, employee_id, organization_id, role, source, notification_setting
        )
        VALUES (v_space.id, NEW.id, NEW.organization_id, 'member', 'auto_sync', 'all')
        ON CONFLICT (space_id, employee_id) DO NOTHING;

        INSERT INTO chat_space_member_logs (
          space_id, employee_id, organization_id, action_type, source, performed_by
        )
        VALUES (v_space.id, NEW.id, NEW.organization_id, 'added', 'auto_sync', v_system_employee_id);

        IF v_system_employee_id IS NOT NULL THEN
          INSERT INTO chat_messages (
            space_id, sender_id, organization_id, content, content_type, system_event_data
          )
          VALUES (
            v_space.id, v_system_employee_id, NEW.organization_id,
            v_employee_name || ' joined the team',
            'system',
            jsonb_build_object('event_type', 'member_added', 'employee_id', NEW.id, 'reason', 'new_employee')
          );
        END IF;
      END LOOP;
    END IF;

    -- Handle status change
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
      -- Employee activated
      IF NEW.status = 'active' AND OLD.status != 'active' THEN
        -- Add to company-wide spaces
        FOR v_space IN
          SELECT cs.id, cs.name
          FROM chat_spaces cs
          WHERE cs.organization_id = NEW.organization_id
            AND cs.access_scope = 'company'
            AND cs.is_archived = false
        LOOP
          INSERT INTO chat_space_members (
            space_id, employee_id, organization_id, role, source, notification_setting
          )
          VALUES (v_space.id, NEW.id, NEW.organization_id, 'member', 'auto_sync', 'all')
          ON CONFLICT (space_id, employee_id) DO NOTHING;

          INSERT INTO chat_space_member_logs (
            space_id, employee_id, organization_id, action_type, source, performed_by
          )
          VALUES (v_space.id, NEW.id, NEW.organization_id, 'added', 'auto_sync', v_system_employee_id);

          IF v_system_employee_id IS NOT NULL THEN
            INSERT INTO chat_messages (
              space_id, sender_id, organization_id, content, content_type, system_event_data
            )
            VALUES (
              v_space.id, v_system_employee_id, NEW.organization_id,
              v_employee_name || ' is now active',
              'system',
              jsonb_build_object('event_type', 'member_added', 'employee_id', NEW.id, 'reason', 'reactivated')
            );
          END IF;
        END LOOP;

        -- Also add to office spaces if they have an office
        IF NEW.office_id IS NOT NULL THEN
          FOR v_space IN
            SELECT cs.id FROM chat_spaces cs
            JOIN chat_space_offices cso ON cso.space_id = cs.id
            WHERE cso.office_id = NEW.office_id
              AND cs.organization_id = NEW.organization_id
              AND cs.access_scope = 'offices'
              AND cs.is_archived = false
          LOOP
            INSERT INTO chat_space_members (space_id, employee_id, organization_id, role, source, notification_setting)
            VALUES (v_space.id, NEW.id, NEW.organization_id, 'member', 'auto_sync', 'all')
            ON CONFLICT (space_id, employee_id) DO NOTHING;
          END LOOP;
        END IF;

        -- Also add to department spaces if they have a department
        IF NEW.department_id IS NOT NULL THEN
          FOR v_space IN
            SELECT cs.id FROM chat_spaces cs
            JOIN chat_space_departments csd ON csd.space_id = cs.id
            WHERE csd.department_id = NEW.department_id
              AND cs.organization_id = NEW.organization_id
              AND cs.access_scope = 'departments'
              AND cs.is_archived = false
          LOOP
            INSERT INTO chat_space_members (space_id, employee_id, organization_id, role, source, notification_setting)
            VALUES (v_space.id, NEW.id, NEW.organization_id, 'member', 'auto_sync', 'all')
            ON CONFLICT (space_id, employee_id) DO NOTHING;
          END LOOP;
        END IF;

      -- Employee deactivated
      ELSIF NEW.status != 'active' AND OLD.status = 'active' THEN
        -- Remove from ALL auto-synced spaces
        FOR v_space IN
          SELECT csm.space_id, cs.name
          FROM chat_space_members csm
          JOIN chat_spaces cs ON cs.id = csm.space_id
          WHERE csm.employee_id = NEW.id
            AND csm.source = 'auto_sync'
        LOOP
          DELETE FROM chat_space_members
          WHERE space_id = v_space.space_id 
            AND employee_id = NEW.id
            AND source = 'auto_sync';

          INSERT INTO chat_space_member_logs (
            space_id, employee_id, organization_id, action_type, source, performed_by
          )
          VALUES (v_space.space_id, NEW.id, NEW.organization_id, 'removed', 'auto_sync', v_system_employee_id);

          IF v_system_employee_id IS NOT NULL THEN
            INSERT INTO chat_messages (
              space_id, sender_id, organization_id, content, content_type, system_event_data
            )
            VALUES (
              v_space.space_id, v_system_employee_id, NEW.organization_id,
              v_employee_name || ' was deactivated',
              'system',
              jsonb_build_object('event_type', 'member_removed', 'employee_id', NEW.id, 'reason', 'deactivated')
            );
          END IF;
        END LOOP;
      END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'sync_company_space_members failed: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. SYNC DEPARTMENT SPACE MEMBERS (NEW)
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_department_space_members()
RETURNS TRIGGER AS $$
DECLARE
  v_space RECORD;
  v_employee_name TEXT;
  v_system_employee_id UUID;
  v_old_dept_id UUID;
  v_new_dept_id UUID;
BEGIN
  -- Wrap everything in exception handler
  BEGIN
    -- Only process department changes for active employees
    IF TG_OP = 'UPDATE' AND NEW.status = 'active' THEN
      -- Check if department changed (either department_id or legacy department field)
      v_old_dept_id := OLD.department_id;
      v_new_dept_id := NEW.department_id;

      -- Skip if no change
      IF v_old_dept_id IS NOT DISTINCT FROM v_new_dept_id THEN
        RETURN NEW;
      END IF;

      -- Get employee name
      SELECT COALESCE(p.full_name, 'Team member')
      INTO v_employee_name
      FROM profiles p
      WHERE p.id = NEW.user_id;

      -- Get system employee for messages
      SELECT e.id INTO v_system_employee_id
      FROM employees e
      JOIN user_roles ur ON ur.user_id = e.user_id
      WHERE e.organization_id = NEW.organization_id 
        AND e.status = 'active'
        AND ur.role IN ('owner', 'admin')
        AND e.id != NEW.id
      LIMIT 1;

      -- Remove from old department spaces
      IF v_old_dept_id IS NOT NULL THEN
        FOR v_space IN
          SELECT cs.id, cs.name
          FROM chat_spaces cs
          JOIN chat_space_departments csd ON csd.space_id = cs.id
          WHERE csd.department_id = v_old_dept_id
            AND cs.organization_id = NEW.organization_id
            AND cs.access_scope = 'departments'
        LOOP
          DELETE FROM chat_space_members
          WHERE space_id = v_space.id 
            AND employee_id = NEW.id
            AND source = 'auto_sync';

          IF FOUND THEN
            INSERT INTO chat_space_member_logs (
              space_id, employee_id, organization_id, action_type, source, performed_by
            )
            VALUES (v_space.id, NEW.id, NEW.organization_id, 'removed', 'auto_sync', v_system_employee_id);

            IF v_system_employee_id IS NOT NULL THEN
              INSERT INTO chat_messages (
                space_id, sender_id, organization_id, content, content_type, system_event_data
              )
              VALUES (
                v_space.id, v_system_employee_id, NEW.organization_id,
                v_employee_name || ' left the space (department changed)',
                'system',
                jsonb_build_object('event_type', 'member_removed', 'employee_id', NEW.id, 'reason', 'department_changed')
              );
            END IF;
          END IF;
        END LOOP;
      END IF;

      -- Add to new department spaces
      IF v_new_dept_id IS NOT NULL THEN
        FOR v_space IN
          SELECT cs.id, cs.name
          FROM chat_spaces cs
          JOIN chat_space_departments csd ON csd.space_id = cs.id
          WHERE csd.department_id = v_new_dept_id
            AND cs.organization_id = NEW.organization_id
            AND cs.access_scope = 'departments'
            AND cs.is_archived = false
        LOOP
          INSERT INTO chat_space_members (
            space_id, employee_id, organization_id, role, source, notification_setting
          )
          VALUES (v_space.id, NEW.id, NEW.organization_id, 'member', 'auto_sync', 'all')
          ON CONFLICT (space_id, employee_id) DO NOTHING;

          INSERT INTO chat_space_member_logs (
            space_id, employee_id, organization_id, action_type, source, performed_by
          )
          VALUES (v_space.id, NEW.id, NEW.organization_id, 'added', 'auto_sync', v_system_employee_id);

          IF v_system_employee_id IS NOT NULL THEN
            INSERT INTO chat_messages (
              space_id, sender_id, organization_id, content, content_type, system_event_data
            )
            VALUES (
              v_space.id, v_system_employee_id, NEW.organization_id,
              v_employee_name || ' joined the space (department assignment)',
              'system',
              jsonb_build_object('event_type', 'member_added', 'employee_id', NEW.id, 'reason', 'department_assignment')
            );
          END IF;
        END LOOP;
      END IF;
    END IF;

    RETURN NEW;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'sync_department_space_members failed: %', SQLERRM;
    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. CREATE TRIGGERS
-- ============================================================================

-- Project sync trigger
CREATE TRIGGER trigger_sync_project_space_members
  AFTER INSERT OR DELETE ON employee_projects
  FOR EACH ROW
  EXECUTE FUNCTION sync_project_space_members();

-- Office sync trigger
CREATE TRIGGER trigger_sync_office_space_members
  AFTER UPDATE OF office_id ON employees
  FOR EACH ROW
  EXECUTE FUNCTION sync_office_space_members();

-- Company/status sync trigger
CREATE TRIGGER trigger_sync_company_space_members
  AFTER INSERT OR UPDATE OF status ON employees
  FOR EACH ROW
  EXECUTE FUNCTION sync_company_space_members();

-- Department sync trigger (NEW)
CREATE TRIGGER trigger_sync_department_space_members
  AFTER UPDATE OF department_id ON employees
  FOR EACH ROW
  EXECUTE FUNCTION sync_department_space_members();