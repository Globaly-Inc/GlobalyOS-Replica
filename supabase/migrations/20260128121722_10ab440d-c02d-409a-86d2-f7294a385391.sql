-- Update sync_project_space_members to create system event messages
CREATE OR REPLACE FUNCTION sync_project_space_members()
RETURNS TRIGGER AS $$
DECLARE
  v_space RECORD;
  v_employee RECORD;
BEGIN
  -- On INSERT: Add employee to project-scoped auto-sync spaces
  IF TG_OP = 'INSERT' THEN
    -- Get employee details for the system message
    SELECT e.id, e.organization_id, p.full_name
    INTO v_employee
    FROM employees e
    LEFT JOIN profiles p ON p.user_id = e.user_id
    WHERE e.id = NEW.employee_id;
    
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
      
      -- Create system event message in chat
      INSERT INTO chat_messages (
        organization_id, space_id, sender_id, content, content_type, system_event_data
      ) VALUES (
        v_space.organization_id,
        v_space.space_id,
        v_space.created_by,
        COALESCE(v_employee.full_name, 'Unknown') || ' was added by Auto-Sync',
        'system_event',
        jsonb_build_object(
          'event_type', 'member_added',
          'target_employee_id', NEW.employee_id,
          'target_name', COALESCE(v_employee.full_name, 'Unknown'),
          'actor_name', 'Auto-Sync'
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
      
      -- Create system event message in chat
      INSERT INTO chat_messages (
        organization_id, space_id, sender_id, content, content_type, system_event_data
      ) VALUES (
        v_space.organization_id,
        v_space.space_id,
        v_space.created_by,
        COALESCE(v_employee.full_name, 'Unknown') || ' was removed by Auto-Sync',
        'system_event',
        jsonb_build_object(
          'event_type', 'member_removed',
          'target_employee_id', OLD.employee_id,
          'target_name', COALESCE(v_employee.full_name, 'Unknown'),
          'actor_name', 'Auto-Sync'
        )
      );
      
      -- Remove member
      DELETE FROM chat_space_members
      WHERE space_id = v_space.space_id AND employee_id = OLD.employee_id;
    END LOOP;
    
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update sync_company_space_members to create system event messages
CREATE OR REPLACE FUNCTION sync_company_space_members()
RETURNS TRIGGER AS $$
DECLARE
  v_space RECORD;
  v_employee RECORD;
BEGIN
  -- On INSERT: Add new employee to all company-scoped auto-sync spaces in their org
  IF TG_OP = 'INSERT' THEN
    -- Get employee details for the system message
    SELECT e.id, e.organization_id, p.full_name
    INTO v_employee
    FROM employees e
    LEFT JOIN profiles p ON p.user_id = e.user_id
    WHERE e.id = NEW.id;
    
    FOR v_space IN
      SELECT cs.id, cs.organization_id, cs.created_by
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
      -- Insert member with source tracking
      INSERT INTO chat_space_members (space_id, employee_id, organization_id, role, source)
      VALUES (v_space.id, NEW.id, v_space.organization_id, 'member', 'auto_sync')
      ON CONFLICT (space_id, employee_id) DO NOTHING;
      
      -- Log the addition
      INSERT INTO chat_space_member_logs (space_id, employee_id, organization_id, action_type, source)
      VALUES (v_space.id, NEW.id, v_space.organization_id, 'added', 'auto_sync');
      
      -- Create system event message in chat
      INSERT INTO chat_messages (
        organization_id, space_id, sender_id, content, content_type, system_event_data
      ) VALUES (
        v_space.organization_id,
        v_space.id,
        v_space.created_by,
        COALESCE(v_employee.full_name, 'Unknown') || ' was added by Auto-Sync',
        'system_event',
        jsonb_build_object(
          'event_type', 'member_added',
          'target_employee_id', NEW.id,
          'target_name', COALESCE(v_employee.full_name, 'Unknown'),
          'actor_name', 'Auto-Sync'
        )
      );
    END LOOP;
  END IF;

  -- On DELETE: Remove employee from all company-scoped auto-sync spaces (if source was auto_sync)
  IF TG_OP = 'DELETE' THEN
    -- Get employee details for the system message
    SELECT e.id, e.organization_id, p.full_name
    INTO v_employee
    FROM employees e
    LEFT JOIN profiles p ON p.user_id = e.user_id
    WHERE e.id = OLD.id;
    
    FOR v_space IN
      SELECT cs.id, cs.organization_id, cs.created_by
      FROM chat_spaces cs
      JOIN chat_space_members csm ON csm.space_id = cs.id AND csm.employee_id = OLD.id
      WHERE cs.organization_id = OLD.organization_id
        AND cs.access_scope = 'company'
        AND cs.auto_sync_members = true
        AND csm.source = 'auto_sync'
    LOOP
      -- Log the removal
      INSERT INTO chat_space_member_logs (space_id, employee_id, organization_id, action_type, source)
      VALUES (v_space.id, OLD.id, v_space.organization_id, 'removed', 'auto_sync');
      
      -- Create system event message in chat
      INSERT INTO chat_messages (
        organization_id, space_id, sender_id, content, content_type, system_event_data
      ) VALUES (
        v_space.organization_id,
        v_space.id,
        v_space.created_by,
        COALESCE(v_employee.full_name, 'Unknown') || ' was removed by Auto-Sync',
        'system_event',
        jsonb_build_object(
          'event_type', 'member_removed',
          'target_employee_id', OLD.id,
          'target_name', COALESCE(v_employee.full_name, 'Unknown'),
          'actor_name', 'Auto-Sync'
        )
      );
      
      -- Remove member
      DELETE FROM chat_space_members
      WHERE space_id = v_space.id AND employee_id = OLD.id;
    END LOOP;
    
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update sync_office_space_members to create system event messages
CREATE OR REPLACE FUNCTION sync_office_space_members()
RETURNS TRIGGER AS $$
DECLARE
  v_space RECORD;
  v_employee RECORD;
BEGIN
  -- On INSERT or UPDATE of office_id: Add employee to office-scoped auto-sync spaces
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.office_id IS DISTINCT FROM NEW.office_id) THEN
    IF NEW.office_id IS NOT NULL THEN
      -- Get employee details for the system message
      SELECT e.id, e.organization_id, p.full_name
      INTO v_employee
      FROM employees e
      LEFT JOIN profiles p ON p.user_id = e.user_id
      WHERE e.id = NEW.id;
      
      FOR v_space IN
        SELECT cs.id as space_id, cs.organization_id, cs.created_by
        FROM chat_spaces cs
        JOIN chat_space_offices cso ON cso.space_id = cs.id
        WHERE cs.organization_id = NEW.organization_id
          AND cs.access_scope = 'offices'
          AND cs.auto_sync_members = true
          AND cs.archived_at IS NULL
          AND cso.office_id = NEW.office_id
          AND NOT EXISTS (
            SELECT 1 FROM chat_space_members csm 
            WHERE csm.space_id = cs.id AND csm.employee_id = NEW.id
          )
      LOOP
        -- Insert member with source tracking
        INSERT INTO chat_space_members (space_id, employee_id, organization_id, role, source)
        VALUES (v_space.space_id, NEW.id, v_space.organization_id, 'member', 'auto_sync')
        ON CONFLICT (space_id, employee_id) DO NOTHING;
        
        -- Log the addition
        INSERT INTO chat_space_member_logs (space_id, employee_id, organization_id, action_type, source)
        VALUES (v_space.space_id, NEW.id, v_space.organization_id, 'added', 'auto_sync');
        
        -- Create system event message in chat
        INSERT INTO chat_messages (
          organization_id, space_id, sender_id, content, content_type, system_event_data
        ) VALUES (
          v_space.organization_id,
          v_space.space_id,
          v_space.created_by,
          COALESCE(v_employee.full_name, 'Unknown') || ' was added by Auto-Sync',
          'system_event',
          jsonb_build_object(
            'event_type', 'member_added',
            'target_employee_id', NEW.id,
            'target_name', COALESCE(v_employee.full_name, 'Unknown'),
            'actor_name', 'Auto-Sync'
          )
        );
      END LOOP;
    END IF;
    
    -- If office changed, remove from old office spaces (if source was auto_sync)
    IF TG_OP = 'UPDATE' AND OLD.office_id IS NOT NULL AND OLD.office_id != NEW.office_id THEN
      -- Get employee details for the system message
      SELECT e.id, e.organization_id, p.full_name
      INTO v_employee
      FROM employees e
      LEFT JOIN profiles p ON p.user_id = e.user_id
      WHERE e.id = NEW.id;
      
      FOR v_space IN
        SELECT cs.id as space_id, cs.organization_id, cs.created_by
        FROM chat_spaces cs
        JOIN chat_space_offices cso ON cso.space_id = cs.id
        JOIN chat_space_members csm ON csm.space_id = cs.id AND csm.employee_id = NEW.id
        WHERE cs.organization_id = NEW.organization_id
          AND cs.access_scope = 'offices'
          AND cs.auto_sync_members = true
          AND cso.office_id = OLD.office_id
          AND csm.source = 'auto_sync'
      LOOP
        -- Log the removal
        INSERT INTO chat_space_member_logs (space_id, employee_id, organization_id, action_type, source)
        VALUES (v_space.space_id, NEW.id, v_space.organization_id, 'removed', 'auto_sync');
        
        -- Create system event message in chat
        INSERT INTO chat_messages (
          organization_id, space_id, sender_id, content, content_type, system_event_data
        ) VALUES (
          v_space.organization_id,
          v_space.space_id,
          v_space.created_by,
          COALESCE(v_employee.full_name, 'Unknown') || ' was removed by Auto-Sync',
          'system_event',
          jsonb_build_object(
            'event_type', 'member_removed',
            'target_employee_id', NEW.id,
            'target_name', COALESCE(v_employee.full_name, 'Unknown'),
            'actor_name', 'Auto-Sync'
          )
        );
        
        -- Remove member
        DELETE FROM chat_space_members
        WHERE space_id = v_space.space_id AND employee_id = NEW.id;
      END LOOP;
    END IF;
  END IF;

  -- On DELETE: Remove employee from all office-scoped auto-sync spaces (if source was auto_sync)
  IF TG_OP = 'DELETE' AND OLD.office_id IS NOT NULL THEN
    -- Get employee details for the system message
    SELECT e.id, e.organization_id, p.full_name
    INTO v_employee
    FROM employees e
    LEFT JOIN profiles p ON p.user_id = e.user_id
    WHERE e.id = OLD.id;
    
    FOR v_space IN
      SELECT cs.id as space_id, cs.organization_id, cs.created_by
      FROM chat_spaces cs
      JOIN chat_space_offices cso ON cso.space_id = cs.id
      JOIN chat_space_members csm ON csm.space_id = cs.id AND csm.employee_id = OLD.id
      WHERE cs.organization_id = OLD.organization_id
        AND cs.access_scope = 'offices'
        AND cs.auto_sync_members = true
        AND cso.office_id = OLD.office_id
        AND csm.source = 'auto_sync'
    LOOP
      -- Log the removal
      INSERT INTO chat_space_member_logs (space_id, employee_id, organization_id, action_type, source)
      VALUES (v_space.space_id, OLD.id, v_space.organization_id, 'removed', 'auto_sync');
      
      -- Create system event message in chat
      INSERT INTO chat_messages (
        organization_id, space_id, sender_id, content, content_type, system_event_data
      ) VALUES (
        v_space.organization_id,
        v_space.space_id,
        v_space.created_by,
        COALESCE(v_employee.full_name, 'Unknown') || ' was removed by Auto-Sync',
        'system_event',
        jsonb_build_object(
          'event_type', 'member_removed',
          'target_employee_id', OLD.id,
          'target_name', COALESCE(v_employee.full_name, 'Unknown'),
          'actor_name', 'Auto-Sync'
        )
      );
      
      -- Remove member
      DELETE FROM chat_space_members
      WHERE space_id = v_space.space_id AND employee_id = OLD.id;
    END LOOP;
    
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;