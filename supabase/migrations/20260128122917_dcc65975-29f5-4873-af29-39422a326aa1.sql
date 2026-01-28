-- Fix sync_project_space_members: Change p.user_id to p.id
CREATE OR REPLACE FUNCTION sync_project_space_members()
RETURNS TRIGGER AS $$
DECLARE
  space_id_var uuid;
  member_record RECORD;
  project_name_var text;
  actor_name_var text;
BEGIN
  -- Get actor name for system messages
  SELECT p.full_name INTO actor_name_var
  FROM employees e
  LEFT JOIN profiles p ON p.id = e.user_id
  WHERE e.id = COALESCE(NEW.updated_by, NEW.created_by);

  -- Handle INSERT - add new member to project space
  IF TG_OP = 'INSERT' THEN
    -- Get the space for this project
    SELECT csp.space_id INTO space_id_var
    FROM chat_space_projects csp
    WHERE csp.project_id = NEW.project_id;

    -- If space exists, add member
    IF space_id_var IS NOT NULL THEN
      INSERT INTO chat_space_members (
        space_id, employee_id, organization_id, role, source
      )
      SELECT 
        space_id_var,
        NEW.employee_id,
        cs.organization_id,
        'member',
        'auto_sync'
      FROM chat_spaces cs
      WHERE cs.id = space_id_var
        AND cs.auto_sync_members = true
      ON CONFLICT (space_id, employee_id) DO NOTHING;

      -- Log the addition
      INSERT INTO chat_space_member_logs (
        space_id, employee_id, organization_id, action_type, source, performed_by
      )
      SELECT 
        space_id_var,
        NEW.employee_id,
        cs.organization_id,
        'added',
        'auto_sync',
        COALESCE(NEW.updated_by, NEW.created_by)
      FROM chat_spaces cs
      WHERE cs.id = space_id_var
        AND cs.auto_sync_members = true;

      -- Create system message for new member
      SELECT p.name INTO project_name_var FROM projects p WHERE p.id = NEW.project_id;
      
      INSERT INTO chat_messages (
        space_id, sender_id, organization_id, content, content_type, system_event_data
      )
      SELECT 
        space_id_var,
        NEW.employee_id,
        cs.organization_id,
        COALESCE(actor_name_var, 'System') || ' added ' || COALESCE(
          (SELECT pr.full_name FROM employees emp LEFT JOIN profiles pr ON pr.id = emp.user_id WHERE emp.id = NEW.employee_id),
          'a member'
        ) || ' to project ' || COALESCE(project_name_var, 'Unknown'),
        'system',
        jsonb_build_object('event_type', 'member_added', 'employee_id', NEW.employee_id, 'project_id', NEW.project_id)
      FROM chat_spaces cs
      WHERE cs.id = space_id_var
        AND cs.auto_sync_members = true;
    END IF;

    RETURN NEW;
  END IF;

  -- Handle DELETE - remove member from project space
  IF TG_OP = 'DELETE' THEN
    -- Get the space for this project
    SELECT csp.space_id INTO space_id_var
    FROM chat_space_projects csp
    WHERE csp.project_id = OLD.project_id;

    -- If space exists, remove member
    IF space_id_var IS NOT NULL THEN
      DELETE FROM chat_space_members csm
      USING chat_spaces cs
      WHERE csm.space_id = space_id_var
        AND csm.employee_id = OLD.employee_id
        AND csm.source = 'auto_sync'
        AND cs.id = csm.space_id
        AND cs.auto_sync_members = true;

      -- Log the removal
      INSERT INTO chat_space_member_logs (
        space_id, employee_id, organization_id, action_type, source, performed_by
      )
      SELECT 
        space_id_var,
        OLD.employee_id,
        cs.organization_id,
        'removed',
        'auto_sync',
        OLD.updated_by
      FROM chat_spaces cs
      WHERE cs.id = space_id_var
        AND cs.auto_sync_members = true;

      -- Create system message for removed member
      SELECT p.name INTO project_name_var FROM projects p WHERE p.id = OLD.project_id;
      
      INSERT INTO chat_messages (
        space_id, sender_id, organization_id, content, content_type, system_event_data
      )
      SELECT 
        space_id_var,
        OLD.employee_id,
        cs.organization_id,
        COALESCE(actor_name_var, 'System') || ' removed ' || COALESCE(
          (SELECT pr.full_name FROM employees emp LEFT JOIN profiles pr ON pr.id = emp.user_id WHERE emp.id = OLD.employee_id),
          'a member'
        ) || ' from project ' || COALESCE(project_name_var, 'Unknown'),
        'system',
        jsonb_build_object('event_type', 'member_removed', 'employee_id', OLD.employee_id, 'project_id', OLD.project_id)
      FROM chat_spaces cs
      WHERE cs.id = space_id_var
        AND cs.auto_sync_members = true;
    END IF;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix sync_company_space_members: Change p.user_id to p.id
CREATE OR REPLACE FUNCTION sync_company_space_members()
RETURNS TRIGGER AS $$
DECLARE
  space_record RECORD;
  actor_name_var text;
BEGIN
  -- Get actor name for system messages (use a default for new employees)
  IF TG_OP = 'INSERT' THEN
    actor_name_var := 'System';
  ELSE
    SELECT p.full_name INTO actor_name_var
    FROM employees e
    LEFT JOIN profiles p ON p.id = e.user_id
    WHERE e.id = COALESCE(NEW.updated_by, OLD.updated_by);
  END IF;

  -- Handle INSERT - add new employee to all company-wide spaces
  IF TG_OP = 'INSERT' THEN
    FOR space_record IN
      SELECT cs.id as space_id, cs.organization_id, cs.name as space_name
      FROM chat_spaces cs
      WHERE cs.organization_id = NEW.organization_id
        AND cs.access_scope = 'company'
        AND cs.auto_sync_members = true
        AND cs.archived_at IS NULL
    LOOP
      INSERT INTO chat_space_members (
        space_id, employee_id, organization_id, role, source
      )
      VALUES (
        space_record.space_id,
        NEW.id,
        space_record.organization_id,
        'member',
        'auto_sync'
      )
      ON CONFLICT (space_id, employee_id) DO NOTHING;

      -- Log the addition
      INSERT INTO chat_space_member_logs (
        space_id, employee_id, organization_id, action_type, source
      )
      VALUES (
        space_record.space_id,
        NEW.id,
        space_record.organization_id,
        'added',
        'auto_sync'
      );

      -- Create system message
      INSERT INTO chat_messages (
        space_id, sender_id, organization_id, content, content_type, system_event_data
      )
      VALUES (
        space_record.space_id,
        NEW.id,
        space_record.organization_id,
        actor_name_var || ' added ' || COALESCE(
          (SELECT pr.full_name FROM profiles pr WHERE pr.id = NEW.user_id),
          'a new member'
        ) || ' to ' || COALESCE(space_record.space_name, 'the space'),
        'system',
        jsonb_build_object('event_type', 'member_added', 'employee_id', NEW.id)
      );
    END LOOP;

    RETURN NEW;
  END IF;

  -- Handle UPDATE - check if status changed to inactive
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status != 'active' THEN
    FOR space_record IN
      SELECT cs.id as space_id, cs.organization_id, cs.name as space_name
      FROM chat_spaces cs
      WHERE cs.organization_id = NEW.organization_id
        AND cs.access_scope = 'company'
        AND cs.auto_sync_members = true
    LOOP
      DELETE FROM chat_space_members
      WHERE space_id = space_record.space_id
        AND employee_id = NEW.id
        AND source = 'auto_sync';

      -- Log the removal
      INSERT INTO chat_space_member_logs (
        space_id, employee_id, organization_id, action_type, source, performed_by
      )
      VALUES (
        space_record.space_id,
        NEW.id,
        space_record.organization_id,
        'removed',
        'auto_sync',
        NEW.updated_by
      );

      -- Create system message
      INSERT INTO chat_messages (
        space_id, sender_id, organization_id, content, content_type, system_event_data
      )
      VALUES (
        space_record.space_id,
        NEW.id,
        space_record.organization_id,
        actor_name_var || ' removed ' || COALESCE(
          (SELECT pr.full_name FROM profiles pr WHERE pr.id = NEW.user_id),
          'a member'
        ) || ' from ' || COALESCE(space_record.space_name, 'the space'),
        'system',
        jsonb_build_object('event_type', 'member_removed', 'employee_id', NEW.id)
      );
    END LOOP;

    RETURN NEW;
  END IF;

  -- Handle UPDATE - check if status changed to active
  IF TG_OP = 'UPDATE' AND OLD.status != 'active' AND NEW.status = 'active' THEN
    FOR space_record IN
      SELECT cs.id as space_id, cs.organization_id, cs.name as space_name
      FROM chat_spaces cs
      WHERE cs.organization_id = NEW.organization_id
        AND cs.access_scope = 'company'
        AND cs.auto_sync_members = true
        AND cs.archived_at IS NULL
    LOOP
      INSERT INTO chat_space_members (
        space_id, employee_id, organization_id, role, source
      )
      VALUES (
        space_record.space_id,
        NEW.id,
        space_record.organization_id,
        'member',
        'auto_sync'
      )
      ON CONFLICT (space_id, employee_id) DO NOTHING;

      -- Log the addition
      INSERT INTO chat_space_member_logs (
        space_id, employee_id, organization_id, action_type, source, performed_by
      )
      VALUES (
        space_record.space_id,
        NEW.id,
        space_record.organization_id,
        'added',
        'auto_sync',
        NEW.updated_by
      );

      -- Create system message
      INSERT INTO chat_messages (
        space_id, sender_id, organization_id, content, content_type, system_event_data
      )
      VALUES (
        space_record.space_id,
        NEW.id,
        space_record.organization_id,
        actor_name_var || ' added ' || COALESCE(
          (SELECT pr.full_name FROM profiles pr WHERE pr.id = NEW.user_id),
          'a member'
        ) || ' to ' || COALESCE(space_record.space_name, 'the space'),
        'system',
        jsonb_build_object('event_type', 'member_added', 'employee_id', NEW.id)
      );
    END LOOP;

    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix sync_office_space_members: Change p.user_id to p.id
CREATE OR REPLACE FUNCTION sync_office_space_members()
RETURNS TRIGGER AS $$
DECLARE
  space_record RECORD;
  actor_name_var text;
  office_name_var text;
BEGIN
  -- Get actor name for system messages
  IF TG_OP = 'INSERT' THEN
    actor_name_var := 'System';
  ELSE
    SELECT p.full_name INTO actor_name_var
    FROM employees e
    LEFT JOIN profiles p ON p.id = e.user_id
    WHERE e.id = COALESCE(NEW.updated_by, OLD.updated_by);
  END IF;

  -- Handle INSERT - add employee to office spaces
  IF TG_OP = 'INSERT' THEN
    SELECT o.name INTO office_name_var FROM offices o WHERE o.id = NEW.office_id;
    
    FOR space_record IN
      SELECT cs.id as space_id, cs.organization_id, cs.name as space_name
      FROM chat_spaces cs
      JOIN chat_space_offices cso ON cso.space_id = cs.id
      WHERE cso.office_id = NEW.office_id
        AND cs.access_scope = 'offices'
        AND cs.auto_sync_members = true
        AND cs.archived_at IS NULL
    LOOP
      INSERT INTO chat_space_members (
        space_id, employee_id, organization_id, role, source
      )
      VALUES (
        space_record.space_id,
        NEW.id,
        space_record.organization_id,
        'member',
        'auto_sync'
      )
      ON CONFLICT (space_id, employee_id) DO NOTHING;

      -- Log the addition
      INSERT INTO chat_space_member_logs (
        space_id, employee_id, organization_id, action_type, source
      )
      VALUES (
        space_record.space_id,
        NEW.id,
        space_record.organization_id,
        'added',
        'auto_sync'
      );

      -- Create system message
      INSERT INTO chat_messages (
        space_id, sender_id, organization_id, content, content_type, system_event_data
      )
      VALUES (
        space_record.space_id,
        NEW.id,
        space_record.organization_id,
        actor_name_var || ' added ' || COALESCE(
          (SELECT pr.full_name FROM profiles pr WHERE pr.id = NEW.user_id),
          'a new member'
        ) || ' to ' || COALESCE(space_record.space_name, 'the space'),
        'system',
        jsonb_build_object('event_type', 'member_added', 'employee_id', NEW.id, 'office_id', NEW.office_id)
      );
    END LOOP;

    RETURN NEW;
  END IF;

  -- Handle UPDATE - office changed
  IF TG_OP = 'UPDATE' AND OLD.office_id IS DISTINCT FROM NEW.office_id THEN
    -- Remove from old office spaces
    IF OLD.office_id IS NOT NULL THEN
      SELECT o.name INTO office_name_var FROM offices o WHERE o.id = OLD.office_id;
      
      FOR space_record IN
        SELECT cs.id as space_id, cs.organization_id, cs.name as space_name
        FROM chat_spaces cs
        JOIN chat_space_offices cso ON cso.space_id = cs.id
        WHERE cso.office_id = OLD.office_id
          AND cs.access_scope = 'offices'
          AND cs.auto_sync_members = true
      LOOP
        DELETE FROM chat_space_members
        WHERE space_id = space_record.space_id
          AND employee_id = NEW.id
          AND source = 'auto_sync';

        -- Log the removal
        INSERT INTO chat_space_member_logs (
          space_id, employee_id, organization_id, action_type, source, performed_by
        )
        VALUES (
          space_record.space_id,
          NEW.id,
          space_record.organization_id,
          'removed',
          'auto_sync',
          NEW.updated_by
        );

        -- Create system message
        INSERT INTO chat_messages (
          space_id, sender_id, organization_id, content, content_type, system_event_data
        )
        VALUES (
          space_record.space_id,
          NEW.id,
          space_record.organization_id,
          actor_name_var || ' removed ' || COALESCE(
            (SELECT pr.full_name FROM profiles pr WHERE pr.id = NEW.user_id),
            'a member'
          ) || ' from ' || COALESCE(space_record.space_name, 'the space'),
          'system',
          jsonb_build_object('event_type', 'member_removed', 'employee_id', NEW.id, 'office_id', OLD.office_id)
        );
      END LOOP;
    END IF;

    -- Add to new office spaces
    IF NEW.office_id IS NOT NULL THEN
      SELECT o.name INTO office_name_var FROM offices o WHERE o.id = NEW.office_id;
      
      FOR space_record IN
        SELECT cs.id as space_id, cs.organization_id, cs.name as space_name
        FROM chat_spaces cs
        JOIN chat_space_offices cso ON cso.space_id = cs.id
        WHERE cso.office_id = NEW.office_id
          AND cs.access_scope = 'offices'
          AND cs.auto_sync_members = true
          AND cs.archived_at IS NULL
      LOOP
        INSERT INTO chat_space_members (
          space_id, employee_id, organization_id, role, source
        )
        VALUES (
          space_record.space_id,
          NEW.id,
          space_record.organization_id,
          'member',
          'auto_sync'
        )
        ON CONFLICT (space_id, employee_id) DO NOTHING;

        -- Log the addition
        INSERT INTO chat_space_member_logs (
          space_id, employee_id, organization_id, action_type, source, performed_by
        )
        VALUES (
          space_record.space_id,
          NEW.id,
          space_record.organization_id,
          'added',
          'auto_sync',
          NEW.updated_by
        );

        -- Create system message
        INSERT INTO chat_messages (
          space_id, sender_id, organization_id, content, content_type, system_event_data
        )
        VALUES (
          space_record.space_id,
          NEW.id,
          space_record.organization_id,
          actor_name_var || ' added ' || COALESCE(
            (SELECT pr.full_name FROM profiles pr WHERE pr.id = NEW.user_id),
            'a member'
          ) || ' to ' || COALESCE(space_record.space_name, 'the space'),
          'system',
          jsonb_build_object('event_type', 'member_added', 'employee_id', NEW.id, 'office_id', NEW.office_id)
        );
      END LOOP;
    END IF;

    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;