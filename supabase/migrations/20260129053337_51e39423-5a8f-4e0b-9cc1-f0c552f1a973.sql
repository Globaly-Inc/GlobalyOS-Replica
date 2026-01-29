-- Update sync_project_space_members to include enhanced system event data
CREATE OR REPLACE FUNCTION sync_project_space_members()
RETURNS TRIGGER AS $$
DECLARE
  v_space RECORD;
  v_employee RECORD;
  v_project_name TEXT;
BEGIN
  -- On INSERT: Add employee to project-scoped auto-sync spaces
  IF TG_OP = 'INSERT' THEN
    -- Get employee details for the system message
    SELECT e.id, e.organization_id, p.full_name
    INTO v_employee
    FROM employees e
    LEFT JOIN profiles p ON p.user_id = e.user_id
    WHERE e.id = NEW.employee_id;
    
    -- Get project name
    SELECT name INTO v_project_name FROM projects WHERE id = NEW.project_id;
    
    FOR v_space IN
      SELECT cs.id as space_id, cs.organization_id, cs.created_by
      FROM chat_spaces cs
      JOIN chat_space_projects csp ON csp.space_id = cs.id
      WHERE cs.organization_id = NEW.organization_id
        AND cs.access_scope = 'projects'
        AND cs.auto_sync_members = true
        AND cs.archived_at IS NULL
        AND csp.project_id = NEW.project_id
        AND NOT EXISTS (
          SELECT 1 FROM chat_space_members csm 
          WHERE csm.space_id = cs.id AND csm.employee_id = NEW.employee_id
        )
    LOOP
      -- Insert member with source tracking
      INSERT INTO chat_space_members (space_id, employee_id, organization_id, role, source)
      VALUES (v_space.space_id, NEW.employee_id, v_space.organization_id, 'member', 'auto_sync')
      ON CONFLICT (space_id, employee_id) DO NOTHING;
      
      -- Log the addition
      INSERT INTO chat_space_member_logs (space_id, employee_id, organization_id, action_type, source)
      VALUES (v_space.space_id, NEW.employee_id, v_space.organization_id, 'added', 'auto_sync');
      
      -- Create system event message in chat with enhanced context
      INSERT INTO chat_messages (
        organization_id, space_id, sender_id, content, content_type, system_event_data
      ) VALUES (
        v_space.organization_id,
        v_space.space_id,
        v_space.created_by,
        COALESCE(v_employee.full_name, 'Unknown') || ' was added by auto-sync',
        'system_event',
        jsonb_build_object(
          'event_type', 'member_added',
          'target_employee_id', NEW.employee_id,
          'target_name', COALESCE(v_employee.full_name, 'Unknown'),
          'source', 'auto_sync',
          'sync_reason', 'project',
          'access_group_name', COALESCE(v_project_name, 'Unknown project')
        )
      );
    END LOOP;
  END IF;

  -- On DELETE: Remove employee from project-scoped auto-sync spaces
  IF TG_OP = 'DELETE' THEN
    -- Get employee details for the system message
    SELECT e.id, e.organization_id, p.full_name
    INTO v_employee
    FROM employees e
    LEFT JOIN profiles p ON p.user_id = e.user_id
    WHERE e.id = OLD.employee_id;
    
    -- Get project name
    SELECT name INTO v_project_name FROM projects WHERE id = OLD.project_id;
    
    FOR v_space IN
      SELECT cs.id as space_id, cs.organization_id, cs.created_by
      FROM chat_spaces cs
      JOIN chat_space_projects csp ON csp.space_id = cs.id
      JOIN chat_space_members csm ON csm.space_id = cs.id AND csm.employee_id = OLD.employee_id
      WHERE cs.organization_id = OLD.organization_id
        AND cs.access_scope = 'projects'
        AND cs.auto_sync_members = true
        AND csp.project_id = OLD.project_id
        AND csm.source = 'auto_sync'
        -- Only remove if not still assigned via another project
        AND NOT EXISTS (
          SELECT 1 FROM employee_projects ep2
          JOIN chat_space_projects csp2 ON csp2.project_id = ep2.project_id
          WHERE ep2.employee_id = OLD.employee_id
            AND ep2.project_id != OLD.project_id
            AND csp2.space_id = cs.id
        )
    LOOP
      -- Log the removal
      INSERT INTO chat_space_member_logs (space_id, employee_id, organization_id, action_type, source)
      VALUES (v_space.space_id, OLD.employee_id, v_space.organization_id, 'removed', 'auto_sync');
      
      -- Create system event message in chat with enhanced context
      INSERT INTO chat_messages (
        organization_id, space_id, sender_id, content, content_type, system_event_data
      ) VALUES (
        v_space.organization_id,
        v_space.space_id,
        v_space.created_by,
        COALESCE(v_employee.full_name, 'Unknown') || ' was removed by auto-sync',
        'system_event',
        jsonb_build_object(
          'event_type', 'member_removed',
          'target_employee_id', OLD.employee_id,
          'target_name', COALESCE(v_employee.full_name, 'Unknown'),
          'source', 'auto_sync',
          'sync_reason', 'project',
          'access_group_name', COALESCE(v_project_name, 'Unknown project')
        )
      );
      
      -- Remove the member
      DELETE FROM chat_space_members 
      WHERE space_id = v_space.space_id AND employee_id = OLD.employee_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update sync_office_space_members to include enhanced system event data
CREATE OR REPLACE FUNCTION sync_office_space_members()
RETURNS TRIGGER AS $$
DECLARE
  v_space RECORD;
  v_old_space RECORD;
  v_employee RECORD;
  v_office_name TEXT;
  v_old_office_name TEXT;
BEGIN
  -- Get employee details for the system message
  SELECT e.id, e.organization_id, p.full_name
  INTO v_employee
  FROM employees e
  LEFT JOIN profiles p ON p.user_id = e.user_id
  WHERE e.id = NEW.id;

  -- Get new office name
  IF NEW.office_id IS NOT NULL THEN
    SELECT name INTO v_office_name FROM offices WHERE id = NEW.office_id;
  END IF;

  -- On office change: Handle old and new office spaces
  IF TG_OP = 'UPDATE' AND OLD.office_id IS DISTINCT FROM NEW.office_id THEN
    -- Get old office name
    IF OLD.office_id IS NOT NULL THEN
      SELECT name INTO v_old_office_name FROM offices WHERE id = OLD.office_id;
    END IF;
    
    -- Remove from old office spaces (if auto_sync member)
    IF OLD.office_id IS NOT NULL THEN
      FOR v_old_space IN
        SELECT cs.id as space_id, cs.organization_id, cs.created_by
        FROM chat_spaces cs
        JOIN chat_space_offices cso ON cso.space_id = cs.id
        JOIN chat_space_members csm ON csm.space_id = cs.id AND csm.employee_id = OLD.id
        WHERE cs.organization_id = NEW.organization_id
          AND cs.access_scope IN ('offices', 'custom')
          AND cs.auto_sync_members = true
          AND cso.office_id = OLD.office_id
          AND csm.source = 'auto_sync'
      LOOP
        -- Log the removal
        INSERT INTO chat_space_member_logs (space_id, employee_id, organization_id, action_type, source)
        VALUES (v_old_space.space_id, OLD.id, v_old_space.organization_id, 'removed', 'auto_sync');
        
        -- Create system event message with enhanced context
        INSERT INTO chat_messages (
          organization_id, space_id, sender_id, content, content_type, system_event_data
        ) VALUES (
          v_old_space.organization_id,
          v_old_space.space_id,
          v_old_space.created_by,
          COALESCE(v_employee.full_name, 'Unknown') || ' was removed by auto-sync',
          'system_event',
          jsonb_build_object(
            'event_type', 'member_removed',
            'target_employee_id', OLD.id,
            'target_name', COALESCE(v_employee.full_name, 'Unknown'),
            'source', 'auto_sync',
            'sync_reason', 'office',
            'access_group_name', COALESCE(v_old_office_name, 'Unknown office')
          )
        );
        
        DELETE FROM chat_space_members 
        WHERE space_id = v_old_space.space_id AND employee_id = OLD.id;
      END LOOP;
    END IF;

    -- Add to new office spaces
    IF NEW.office_id IS NOT NULL THEN
      FOR v_space IN
        SELECT cs.id as space_id, cs.organization_id, cs.created_by
        FROM chat_spaces cs
        JOIN chat_space_offices cso ON cso.space_id = cs.id
        WHERE cs.organization_id = NEW.organization_id
          AND cs.access_scope IN ('offices', 'custom')
          AND cs.auto_sync_members = true
          AND cs.archived_at IS NULL
          AND cso.office_id = NEW.office_id
          AND NOT EXISTS (
            SELECT 1 FROM chat_space_members csm 
            WHERE csm.space_id = cs.id AND csm.employee_id = NEW.id
          )
      LOOP
        INSERT INTO chat_space_members (space_id, employee_id, organization_id, role, source)
        VALUES (v_space.space_id, NEW.id, v_space.organization_id, 'member', 'auto_sync')
        ON CONFLICT (space_id, employee_id) DO NOTHING;
        
        INSERT INTO chat_space_member_logs (space_id, employee_id, organization_id, action_type, source)
        VALUES (v_space.space_id, NEW.id, v_space.organization_id, 'added', 'auto_sync');
        
        INSERT INTO chat_messages (
          organization_id, space_id, sender_id, content, content_type, system_event_data
        ) VALUES (
          v_space.organization_id,
          v_space.space_id,
          v_space.created_by,
          COALESCE(v_employee.full_name, 'Unknown') || ' was added by auto-sync',
          'system_event',
          jsonb_build_object(
            'event_type', 'member_added',
            'target_employee_id', NEW.id,
            'target_name', COALESCE(v_employee.full_name, 'Unknown'),
            'source', 'auto_sync',
            'sync_reason', 'office',
            'access_group_name', COALESCE(v_office_name, 'Unknown office')
          )
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update sync_department_space_members to include enhanced system event data
CREATE OR REPLACE FUNCTION sync_department_space_members()
RETURNS TRIGGER AS $$
DECLARE
  v_space RECORD;
  v_old_space RECORD;
  v_employee RECORD;
  v_department_name TEXT;
  v_old_department_name TEXT;
BEGIN
  -- Get employee details for the system message
  SELECT e.id, e.organization_id, p.full_name
  INTO v_employee
  FROM employees e
  LEFT JOIN profiles p ON p.user_id = e.user_id
  WHERE e.id = NEW.id;

  -- Get new department name
  IF NEW.department_id IS NOT NULL THEN
    SELECT name INTO v_department_name FROM departments WHERE id = NEW.department_id;
  END IF;

  -- On department change: Handle old and new department spaces
  IF TG_OP = 'UPDATE' AND OLD.department_id IS DISTINCT FROM NEW.department_id THEN
    -- Get old department name
    IF OLD.department_id IS NOT NULL THEN
      SELECT name INTO v_old_department_name FROM departments WHERE id = OLD.department_id;
    END IF;
    
    -- Remove from old department spaces (if auto_sync member)
    IF OLD.department_id IS NOT NULL THEN
      FOR v_old_space IN
        SELECT cs.id as space_id, cs.organization_id, cs.created_by
        FROM chat_spaces cs
        JOIN chat_space_departments csd ON csd.space_id = cs.id
        JOIN chat_space_members csm ON csm.space_id = cs.id AND csm.employee_id = OLD.id
        WHERE cs.organization_id = NEW.organization_id
          AND cs.access_scope IN ('departments', 'custom')
          AND cs.auto_sync_members = true
          AND csd.department_id = OLD.department_id
          AND csm.source = 'auto_sync'
      LOOP
        INSERT INTO chat_space_member_logs (space_id, employee_id, organization_id, action_type, source)
        VALUES (v_old_space.space_id, OLD.id, v_old_space.organization_id, 'removed', 'auto_sync');
        
        INSERT INTO chat_messages (
          organization_id, space_id, sender_id, content, content_type, system_event_data
        ) VALUES (
          v_old_space.organization_id,
          v_old_space.space_id,
          v_old_space.created_by,
          COALESCE(v_employee.full_name, 'Unknown') || ' was removed by auto-sync',
          'system_event',
          jsonb_build_object(
            'event_type', 'member_removed',
            'target_employee_id', OLD.id,
            'target_name', COALESCE(v_employee.full_name, 'Unknown'),
            'source', 'auto_sync',
            'sync_reason', 'department',
            'access_group_name', COALESCE(v_old_department_name, 'Unknown department')
          )
        );
        
        DELETE FROM chat_space_members 
        WHERE space_id = v_old_space.space_id AND employee_id = OLD.id;
      END LOOP;
    END IF;

    -- Add to new department spaces
    IF NEW.department_id IS NOT NULL THEN
      FOR v_space IN
        SELECT cs.id as space_id, cs.organization_id, cs.created_by
        FROM chat_spaces cs
        JOIN chat_space_departments csd ON csd.space_id = cs.id
        WHERE cs.organization_id = NEW.organization_id
          AND cs.access_scope IN ('departments', 'custom')
          AND cs.auto_sync_members = true
          AND cs.archived_at IS NULL
          AND csd.department_id = NEW.department_id
          AND NOT EXISTS (
            SELECT 1 FROM chat_space_members csm 
            WHERE csm.space_id = cs.id AND csm.employee_id = NEW.id
          )
      LOOP
        INSERT INTO chat_space_members (space_id, employee_id, organization_id, role, source)
        VALUES (v_space.space_id, NEW.id, v_space.organization_id, 'member', 'auto_sync')
        ON CONFLICT (space_id, employee_id) DO NOTHING;
        
        INSERT INTO chat_space_member_logs (space_id, employee_id, organization_id, action_type, source)
        VALUES (v_space.space_id, NEW.id, v_space.organization_id, 'added', 'auto_sync');
        
        INSERT INTO chat_messages (
          organization_id, space_id, sender_id, content, content_type, system_event_data
        ) VALUES (
          v_space.organization_id,
          v_space.space_id,
          v_space.created_by,
          COALESCE(v_employee.full_name, 'Unknown') || ' was added by auto-sync',
          'system_event',
          jsonb_build_object(
            'event_type', 'member_added',
            'target_employee_id', NEW.id,
            'target_name', COALESCE(v_employee.full_name, 'Unknown'),
            'source', 'auto_sync',
            'sync_reason', 'department',
            'access_group_name', COALESCE(v_department_name, 'Unknown department')
          )
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update sync_company_space_members to include enhanced system event data
CREATE OR REPLACE FUNCTION sync_company_space_members()
RETURNS TRIGGER AS $$
DECLARE
  v_space RECORD;
  v_employee RECORD;
BEGIN
  -- Get employee details for the system message
  SELECT e.id, e.organization_id, p.full_name
  INTO v_employee
  FROM employees e
  LEFT JOIN profiles p ON p.user_id = e.user_id
  WHERE e.id = NEW.id;

  -- On status change to active: Add to company-wide spaces
  IF TG_OP = 'UPDATE' AND NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    FOR v_space IN
      SELECT cs.id as space_id, cs.organization_id, cs.created_by
      FROM chat_spaces cs
      WHERE cs.organization_id = NEW.organization_id
        AND cs.access_scope = 'company'
        AND cs.auto_sync_members = true
        AND cs.archived_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM chat_space_members csm 
          WHERE csm.space_id = cs.id AND csm.employee_id = NEW.id
        )
    LOOP
      INSERT INTO chat_space_members (space_id, employee_id, organization_id, role, source)
      VALUES (v_space.space_id, NEW.id, v_space.organization_id, 'member', 'auto_sync')
      ON CONFLICT (space_id, employee_id) DO NOTHING;
      
      INSERT INTO chat_space_member_logs (space_id, employee_id, organization_id, action_type, source)
      VALUES (v_space.space_id, NEW.id, v_space.organization_id, 'added', 'auto_sync');
      
      INSERT INTO chat_messages (
        organization_id, space_id, sender_id, content, content_type, system_event_data
      ) VALUES (
        v_space.organization_id,
        v_space.space_id,
        v_space.created_by,
        COALESCE(v_employee.full_name, 'Unknown') || ' was added by auto-sync',
        'system_event',
        jsonb_build_object(
          'event_type', 'member_added',
          'target_employee_id', NEW.id,
          'target_name', COALESCE(v_employee.full_name, 'Unknown'),
          'source', 'auto_sync',
          'sync_reason', 'company'
        )
      );
    END LOOP;
  END IF;

  -- On status change to inactive: Remove from company-wide spaces
  IF TG_OP = 'UPDATE' AND NEW.status != 'active' AND OLD.status = 'active' THEN
    FOR v_space IN
      SELECT cs.id as space_id, cs.organization_id, cs.created_by
      FROM chat_spaces cs
      JOIN chat_space_members csm ON csm.space_id = cs.id AND csm.employee_id = OLD.id
      WHERE cs.organization_id = NEW.organization_id
        AND cs.access_scope = 'company'
        AND cs.auto_sync_members = true
        AND csm.source = 'auto_sync'
    LOOP
      INSERT INTO chat_space_member_logs (space_id, employee_id, organization_id, action_type, source)
      VALUES (v_space.space_id, OLD.id, v_space.organization_id, 'removed', 'auto_sync');
      
      INSERT INTO chat_messages (
        organization_id, space_id, sender_id, content, content_type, system_event_data
      ) VALUES (
        v_space.organization_id,
        v_space.space_id,
        v_space.created_by,
        COALESCE(v_employee.full_name, 'Unknown') || ' was removed by auto-sync',
        'system_event',
        jsonb_build_object(
          'event_type', 'member_removed',
          'target_employee_id', OLD.id,
          'target_name', COALESCE(v_employee.full_name, 'Unknown'),
          'source', 'auto_sync',
          'sync_reason', 'company'
        )
      );
      
      DELETE FROM chat_space_members 
      WHERE space_id = v_space.space_id AND employee_id = OLD.id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;