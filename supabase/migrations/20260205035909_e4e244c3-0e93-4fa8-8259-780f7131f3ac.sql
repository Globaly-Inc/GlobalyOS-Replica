-- Fix profiles join in all sync functions
-- The profiles table uses 'id' as the primary key, not 'user_id'

-- 1. Fix sync_office_space_members
CREATE OR REPLACE FUNCTION public.sync_office_space_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space_id UUID;
  v_employee_name TEXT;
  v_office_name TEXT;
BEGIN
  -- Only proceed if office_id changed
  IF (TG_OP = 'UPDATE' AND OLD.office_id IS DISTINCT FROM NEW.office_id) THEN
    -- Get employee name for system messages
    SELECT COALESCE(p.full_name, e.first_name || ' ' || e.last_name)
    INTO v_employee_name
    FROM employees e
    LEFT JOIN profiles p ON p.id = e.user_id
    WHERE e.id = NEW.id;

    -- Remove from old office space if exists
    IF OLD.office_id IS NOT NULL THEN
      SELECT cs.id INTO v_space_id
      FROM chat_spaces cs
      WHERE cs.linked_entity_type = 'office'
        AND cs.linked_entity_id = OLD.office_id
        AND cs.organization_id = NEW.organization_id
        AND cs.auto_sync_members = true;

      IF v_space_id IS NOT NULL THEN
        -- Get old office name
        SELECT name INTO v_office_name FROM offices WHERE id = OLD.office_id;
        
        DELETE FROM chat_space_members
        WHERE space_id = v_space_id AND employee_id = NEW.id;

        -- Log system message
        INSERT INTO chat_messages (space_id, sender_id, organization_id, content, content_type, system_event_data)
        VALUES (
          v_space_id,
          NEW.id,
          NEW.organization_id,
          v_employee_name || ' left the space',
          'system',
          jsonb_build_object('event', 'member_left', 'reason', 'office_changed', 'employee_name', v_employee_name)
        );
      END IF;
    END IF;

    -- Add to new office space if exists
    IF NEW.office_id IS NOT NULL AND NEW.status = 'active' THEN
      SELECT cs.id INTO v_space_id
      FROM chat_spaces cs
      WHERE cs.linked_entity_type = 'office'
        AND cs.linked_entity_id = NEW.office_id
        AND cs.organization_id = NEW.organization_id
        AND cs.auto_sync_members = true;

      IF v_space_id IS NOT NULL THEN
        -- Get new office name
        SELECT name INTO v_office_name FROM offices WHERE id = NEW.office_id;
        
        INSERT INTO chat_space_members (space_id, employee_id, organization_id, role, joined_via)
        VALUES (v_space_id, NEW.id, NEW.organization_id, 'member', 'auto_sync')
        ON CONFLICT (space_id, employee_id) DO NOTHING;

        -- Log system message
        INSERT INTO chat_messages (space_id, sender_id, organization_id, content, content_type, system_event_data)
        VALUES (
          v_space_id,
          NEW.id,
          NEW.organization_id,
          v_employee_name || ' joined the space',
          'system',
          jsonb_build_object('event', 'member_joined', 'reason', 'office_sync', 'office_name', v_office_name, 'employee_name', v_employee_name)
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'sync_office_space_members failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 2. Fix sync_department_space_members
CREATE OR REPLACE FUNCTION public.sync_department_space_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space_id UUID;
  v_employee_name TEXT;
  v_department_name TEXT;
BEGIN
  -- Only proceed if department_id changed
  IF (TG_OP = 'UPDATE' AND OLD.department_id IS DISTINCT FROM NEW.department_id) THEN
    -- Get employee name for system messages
    SELECT COALESCE(p.full_name, e.first_name || ' ' || e.last_name)
    INTO v_employee_name
    FROM employees e
    LEFT JOIN profiles p ON p.id = e.user_id
    WHERE e.id = NEW.id;

    -- Remove from old department space if exists
    IF OLD.department_id IS NOT NULL THEN
      SELECT cs.id INTO v_space_id
      FROM chat_spaces cs
      WHERE cs.linked_entity_type = 'department'
        AND cs.linked_entity_id = OLD.department_id
        AND cs.organization_id = NEW.organization_id
        AND cs.auto_sync_members = true;

      IF v_space_id IS NOT NULL THEN
        SELECT name INTO v_department_name FROM departments WHERE id = OLD.department_id;
        
        DELETE FROM chat_space_members
        WHERE space_id = v_space_id AND employee_id = NEW.id;

        INSERT INTO chat_messages (space_id, sender_id, organization_id, content, content_type, system_event_data)
        VALUES (
          v_space_id,
          NEW.id,
          NEW.organization_id,
          v_employee_name || ' left the space',
          'system',
          jsonb_build_object('event', 'member_left', 'reason', 'department_changed', 'employee_name', v_employee_name)
        );
      END IF;
    END IF;

    -- Add to new department space if exists
    IF NEW.department_id IS NOT NULL AND NEW.status = 'active' THEN
      SELECT cs.id INTO v_space_id
      FROM chat_spaces cs
      WHERE cs.linked_entity_type = 'department'
        AND cs.linked_entity_id = NEW.department_id
        AND cs.organization_id = NEW.organization_id
        AND cs.auto_sync_members = true;

      IF v_space_id IS NOT NULL THEN
        SELECT name INTO v_department_name FROM departments WHERE id = NEW.department_id;
        
        INSERT INTO chat_space_members (space_id, employee_id, organization_id, role, joined_via)
        VALUES (v_space_id, NEW.id, NEW.organization_id, 'member', 'auto_sync')
        ON CONFLICT (space_id, employee_id) DO NOTHING;

        INSERT INTO chat_messages (space_id, sender_id, organization_id, content, content_type, system_event_data)
        VALUES (
          v_space_id,
          NEW.id,
          NEW.organization_id,
          v_employee_name || ' joined the space',
          'system',
          jsonb_build_object('event', 'member_joined', 'reason', 'department_sync', 'department_name', v_department_name, 'employee_name', v_employee_name)
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'sync_department_space_members failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 3. Fix sync_company_space_members
CREATE OR REPLACE FUNCTION public.sync_company_space_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space_id UUID;
  v_employee_name TEXT;
BEGIN
  -- Only proceed if status changed
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Get employee name
    SELECT COALESCE(p.full_name, e.first_name || ' ' || e.last_name)
    INTO v_employee_name
    FROM employees e
    LEFT JOIN profiles p ON p.id = e.user_id
    WHERE e.id = NEW.id;

    -- Find company-wide space
    SELECT cs.id INTO v_space_id
    FROM chat_spaces cs
    WHERE cs.linked_entity_type = 'company'
      AND cs.organization_id = NEW.organization_id
      AND cs.auto_sync_members = true
    LIMIT 1;

    IF v_space_id IS NOT NULL THEN
      IF NEW.status = 'active' AND OLD.status != 'active' THEN
        -- Employee activated - add to company space
        INSERT INTO chat_space_members (space_id, employee_id, organization_id, role, joined_via)
        VALUES (v_space_id, NEW.id, NEW.organization_id, 'member', 'auto_sync')
        ON CONFLICT (space_id, employee_id) DO NOTHING;

        INSERT INTO chat_messages (space_id, sender_id, organization_id, content, content_type, system_event_data)
        VALUES (
          v_space_id,
          NEW.id,
          NEW.organization_id,
          v_employee_name || ' joined the space',
          'system',
          jsonb_build_object('event', 'member_joined', 'reason', 'employee_activated', 'employee_name', v_employee_name)
        );
      ELSIF NEW.status != 'active' AND OLD.status = 'active' THEN
        -- Employee deactivated - remove from company space
        DELETE FROM chat_space_members
        WHERE space_id = v_space_id AND employee_id = NEW.id;

        INSERT INTO chat_messages (space_id, sender_id, organization_id, content, content_type, system_event_data)
        VALUES (
          v_space_id,
          NEW.id,
          NEW.organization_id,
          v_employee_name || ' left the space',
          'system',
          jsonb_build_object('event', 'member_left', 'reason', 'employee_deactivated', 'employee_name', v_employee_name)
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'sync_company_space_members failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 4. Fix sync_project_space_members
CREATE OR REPLACE FUNCTION public.sync_project_space_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space_id UUID;
  v_employee_name TEXT;
  v_project_name TEXT;
  v_org_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get organization_id from the project
    SELECT p.organization_id, p.name INTO v_org_id, v_project_name
    FROM projects p WHERE p.id = NEW.project_id;

    -- Get employee name
    SELECT COALESCE(pr.full_name, e.first_name || ' ' || e.last_name)
    INTO v_employee_name
    FROM employees e
    LEFT JOIN profiles pr ON pr.id = e.user_id
    WHERE e.id = NEW.employee_id;

    -- Find project space
    SELECT cs.id INTO v_space_id
    FROM chat_spaces cs
    WHERE cs.linked_entity_type = 'project'
      AND cs.linked_entity_id = NEW.project_id
      AND cs.auto_sync_members = true;

    IF v_space_id IS NOT NULL THEN
      INSERT INTO chat_space_members (space_id, employee_id, organization_id, role, joined_via)
      VALUES (v_space_id, NEW.employee_id, v_org_id, 'member', 'auto_sync')
      ON CONFLICT (space_id, employee_id) DO NOTHING;

      INSERT INTO chat_messages (space_id, sender_id, organization_id, content, content_type, system_event_data)
      VALUES (
        v_space_id,
        NEW.employee_id,
        v_org_id,
        v_employee_name || ' joined the space',
        'system',
        jsonb_build_object('event', 'member_joined', 'reason', 'project_assignment', 'project_name', v_project_name, 'employee_name', v_employee_name)
      );
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    -- Get organization_id from the project
    SELECT p.organization_id, p.name INTO v_org_id, v_project_name
    FROM projects p WHERE p.id = OLD.project_id;

    -- Get employee name
    SELECT COALESCE(pr.full_name, e.first_name || ' ' || e.last_name)
    INTO v_employee_name
    FROM employees e
    LEFT JOIN profiles pr ON pr.id = e.user_id
    WHERE e.id = OLD.employee_id;

    -- Find project space
    SELECT cs.id INTO v_space_id
    FROM chat_spaces cs
    WHERE cs.linked_entity_type = 'project'
      AND cs.linked_entity_id = OLD.project_id
      AND cs.auto_sync_members = true;

    IF v_space_id IS NOT NULL THEN
      DELETE FROM chat_space_members
      WHERE space_id = v_space_id AND employee_id = OLD.employee_id;

      INSERT INTO chat_messages (space_id, sender_id, organization_id, content, content_type, system_event_data)
      VALUES (
        v_space_id,
        OLD.employee_id,
        v_org_id,
        v_employee_name || ' left the space',
        'system',
        jsonb_build_object('event', 'member_left', 'reason', 'project_unassignment', 'project_name', v_project_name, 'employee_name', v_employee_name)
      );
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'sync_project_space_members failed: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;