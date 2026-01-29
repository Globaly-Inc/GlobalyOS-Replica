-- =============================================================================
-- AUTO-SYNC MEMBERSHIP COMPLETE REFACTOR
-- Fixes: wrong column references, invalid enum values, duplicate triggers,
--        missing group conversation handling
-- =============================================================================

-- =============================================================================
-- STEP 1: DROP ALL EXISTING SYNC TRIGGERS (cleanup duplicates)
-- =============================================================================

DROP TRIGGER IF EXISTS trigger_sync_company_space_members ON employees;
DROP TRIGGER IF EXISTS trigger_sync_company_members_on_insert ON employees;
DROP TRIGGER IF EXISTS trigger_sync_company_members_on_update ON employees;
DROP TRIGGER IF EXISTS trigger_sync_office_space_members ON employees;
DROP TRIGGER IF EXISTS trigger_sync_office_members ON employees;
DROP TRIGGER IF EXISTS trigger_sync_department_space_members ON employees;
DROP TRIGGER IF EXISTS trigger_sync_department_members ON employees;
DROP TRIGGER IF EXISTS trigger_sync_project_space_members ON employee_projects;
DROP TRIGGER IF EXISTS trigger_sync_project_members_insert ON employee_projects;
DROP TRIGGER IF EXISTS trigger_sync_project_members_delete ON employee_projects;
DROP TRIGGER IF EXISTS trg_employee_status_sync ON employees;
DROP TRIGGER IF EXISTS trg_employee_office_sync ON employees;
DROP TRIGGER IF EXISTS trg_employee_department_sync ON employees;
DROP TRIGGER IF EXISTS trg_project_member_added ON employee_projects;
DROP TRIGGER IF EXISTS trg_project_member_removed ON employee_projects;

-- =============================================================================
-- STEP 2: REWRITE sync_company_space_members()
-- Handles: activation (add to all matching spaces) and deactivation (remove from all)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_company_space_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space RECORD;
  v_group RECORD;
  v_project RECORD;
  v_system_employee_id UUID;
  v_employee_name TEXT;
  v_is_activating BOOLEAN;
  v_is_deactivating BOOLEAN;
BEGIN
  -- Determine what kind of status change this is
  v_is_activating := (OLD.status IS DISTINCT FROM 'active' AND NEW.status = 'active');
  v_is_deactivating := (OLD.status = 'active' AND NEW.status IS DISTINCT FROM 'active');
  
  -- Exit early if no relevant status change
  IF NOT v_is_activating AND NOT v_is_deactivating THEN
    RETURN NEW;
  END IF;
  
  BEGIN
    -- Get employee name for system messages
    SELECT p.full_name INTO v_employee_name
    FROM profiles p
    WHERE p.id = NEW.user_id;
    
    v_employee_name := COALESCE(v_employee_name, 'Team member');
    
    -- Get a system user (admin/owner) to send messages as
    SELECT e.id INTO v_system_employee_id
    FROM employees e
    JOIN user_roles ur ON ur.user_id = e.user_id
    WHERE e.organization_id = NEW.organization_id 
      AND ur.organization_id = NEW.organization_id
      AND ur.role IN ('owner', 'admin')
      AND e.status = 'active'
    LIMIT 1;
    
    -- Fallback to the employee themselves if no admin found
    IF v_system_employee_id IS NULL THEN
      v_system_employee_id := NEW.id;
    END IF;
    
    -- =========================================================================
    -- ACTIVATION: Add to all matching spaces
    -- =========================================================================
    IF v_is_activating THEN
      
      -- 1. Add to COMPANY-WIDE spaces
      FOR v_space IN
        SELECT cs.id, cs.name
        FROM chat_spaces cs
        WHERE cs.organization_id = NEW.organization_id
          AND cs.access_scope = 'company'
          AND cs.auto_sync_members = true
          AND cs.archived_at IS NULL
      LOOP
        -- Insert membership if not exists
        INSERT INTO chat_space_members (space_id, employee_id, organization_id, role, source)
        VALUES (v_space.id, NEW.id, NEW.organization_id, 'member', 'auto_sync')
        ON CONFLICT (space_id, employee_id) DO NOTHING;
        
        -- Post system message
        INSERT INTO chat_messages (space_id, sender_id, organization_id, content, content_type, system_event_data)
        VALUES (
          v_space.id,
          v_system_employee_id,
          NEW.organization_id,
          v_employee_name || ' joined the space',
          'system_event',
          jsonb_build_object(
            'event_type', 'member_added',
            'target_employee_id', NEW.id,
            'target_name', v_employee_name
          )
        );
      END LOOP;
      
      -- 2. Add to OFFICE spaces (via junction table)
      IF NEW.office_id IS NOT NULL THEN
        FOR v_space IN
          SELECT DISTINCT cs.id, cs.name
          FROM chat_spaces cs
          JOIN chat_space_offices cso ON cso.space_id = cs.id
          WHERE cs.organization_id = NEW.organization_id
            AND cso.office_id = NEW.office_id
            AND cs.auto_sync_members = true
            AND cs.archived_at IS NULL
        LOOP
          INSERT INTO chat_space_members (space_id, employee_id, organization_id, role, source)
          VALUES (v_space.id, NEW.id, NEW.organization_id, 'member', 'auto_sync')
          ON CONFLICT (space_id, employee_id) DO NOTHING;
          
          INSERT INTO chat_messages (space_id, sender_id, organization_id, content, content_type, system_event_data)
          VALUES (
            v_space.id,
            v_system_employee_id,
            NEW.organization_id,
            v_employee_name || ' joined the space',
            'system_event',
            jsonb_build_object(
              'event_type', 'member_added',
              'target_employee_id', NEW.id,
              'target_name', v_employee_name
            )
          );
        END LOOP;
      END IF;
      
      -- 3. Add to DEPARTMENT spaces (via junction table)
      IF NEW.department_id IS NOT NULL THEN
        FOR v_space IN
          SELECT DISTINCT cs.id, cs.name
          FROM chat_spaces cs
          JOIN chat_space_departments csd ON csd.space_id = cs.id
          WHERE cs.organization_id = NEW.organization_id
            AND csd.department_id = NEW.department_id
            AND cs.auto_sync_members = true
            AND cs.archived_at IS NULL
        LOOP
          INSERT INTO chat_space_members (space_id, employee_id, organization_id, role, source)
          VALUES (v_space.id, NEW.id, NEW.organization_id, 'member', 'auto_sync')
          ON CONFLICT (space_id, employee_id) DO NOTHING;
          
          INSERT INTO chat_messages (space_id, sender_id, organization_id, content, content_type, system_event_data)
          VALUES (
            v_space.id,
            v_system_employee_id,
            NEW.organization_id,
            v_employee_name || ' joined the space',
            'system_event',
            jsonb_build_object(
              'event_type', 'member_added',
              'target_employee_id', NEW.id,
              'target_name', v_employee_name
            )
          );
        END LOOP;
      END IF;
      
      -- 4. Add to PROJECT spaces (via junction tables)
      FOR v_project IN
        SELECT ep.project_id
        FROM employee_projects ep
        WHERE ep.employee_id = NEW.id
      LOOP
        FOR v_space IN
          SELECT DISTINCT cs.id, cs.name
          FROM chat_spaces cs
          JOIN chat_space_projects csp ON csp.space_id = cs.id
          WHERE cs.organization_id = NEW.organization_id
            AND csp.project_id = v_project.project_id
            AND cs.auto_sync_members = true
            AND cs.archived_at IS NULL
        LOOP
          INSERT INTO chat_space_members (space_id, employee_id, organization_id, role, source)
          VALUES (v_space.id, NEW.id, NEW.organization_id, 'member', 'auto_sync')
          ON CONFLICT (space_id, employee_id) DO NOTHING;
          
          INSERT INTO chat_messages (space_id, sender_id, organization_id, content, content_type, system_event_data)
          VALUES (
            v_space.id,
            v_system_employee_id,
            NEW.organization_id,
            v_employee_name || ' joined the space',
            'system_event',
            jsonb_build_object(
              'event_type', 'member_added',
              'target_employee_id', NEW.id,
              'target_name', v_employee_name
            )
          );
        END LOOP;
      END LOOP;
      
    END IF;
    
    -- =========================================================================
    -- DEACTIVATION: Remove from ALL auto-synced spaces AND group conversations
    -- =========================================================================
    IF v_is_deactivating THEN
      
      -- 1. Remove from all spaces where source = 'auto_sync'
      FOR v_space IN
        SELECT cs.id, cs.name
        FROM chat_spaces cs
        JOIN chat_space_members csm ON csm.space_id = cs.id
        WHERE csm.employee_id = NEW.id
          AND csm.source = 'auto_sync'
          AND cs.organization_id = NEW.organization_id
      LOOP
        DELETE FROM chat_space_members 
        WHERE space_id = v_space.id AND employee_id = NEW.id;
        
        INSERT INTO chat_messages (space_id, sender_id, organization_id, content, content_type, system_event_data)
        VALUES (
          v_space.id,
          v_system_employee_id,
          NEW.organization_id,
          v_employee_name || ' left the space',
          'system_event',
          jsonb_build_object(
            'event_type', 'member_left',
            'target_employee_id', NEW.id,
            'target_name', v_employee_name
          )
        );
      END LOOP;
      
      -- 2. Remove from ALL group conversations (regardless of auto-sync)
      FOR v_group IN
        SELECT c.id, c.name
        FROM chat_conversations c
        JOIN chat_participants cp ON cp.conversation_id = c.id
        WHERE cp.employee_id = NEW.id
          AND c.is_group = true
          AND c.organization_id = NEW.organization_id
      LOOP
        DELETE FROM chat_participants 
        WHERE conversation_id = v_group.id AND employee_id = NEW.id;
        
        INSERT INTO chat_messages (conversation_id, sender_id, organization_id, content, content_type, system_event_data)
        VALUES (
          v_group.id,
          v_system_employee_id,
          NEW.organization_id,
          v_employee_name || ' left the group',
          'system_event',
          jsonb_build_object(
            'event_type', 'member_left',
            'target_employee_id', NEW.id,
            'target_name', v_employee_name
          )
        );
      END LOOP;
      
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't block the profile update
    RAISE WARNING 'sync_company_space_members failed for employee %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- =============================================================================
-- STEP 3: REWRITE sync_office_space_members()
-- Handles: office_id changes - remove from old, add to new
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_office_space_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space RECORD;
  v_system_employee_id UUID;
  v_employee_name TEXT;
BEGIN
  -- Only proceed if office_id actually changed and employee is active
  IF OLD.office_id IS NOT DISTINCT FROM NEW.office_id THEN
    RETURN NEW;
  END IF;
  
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;
  
  BEGIN
    -- Get employee name
    SELECT p.full_name INTO v_employee_name
    FROM profiles p
    WHERE p.id = NEW.user_id;
    
    v_employee_name := COALESCE(v_employee_name, 'Team member');
    
    -- Get system user
    SELECT e.id INTO v_system_employee_id
    FROM employees e
    JOIN user_roles ur ON ur.user_id = e.user_id
    WHERE e.organization_id = NEW.organization_id 
      AND ur.organization_id = NEW.organization_id
      AND ur.role IN ('owner', 'admin')
      AND e.status = 'active'
    LIMIT 1;
    
    IF v_system_employee_id IS NULL THEN
      v_system_employee_id := NEW.id;
    END IF;
    
    -- Remove from OLD office spaces
    IF OLD.office_id IS NOT NULL THEN
      FOR v_space IN
        SELECT DISTINCT cs.id, cs.name
        FROM chat_spaces cs
        JOIN chat_space_offices cso ON cso.space_id = cs.id
        JOIN chat_space_members csm ON csm.space_id = cs.id
        WHERE cs.organization_id = NEW.organization_id
          AND cso.office_id = OLD.office_id
          AND csm.employee_id = NEW.id
          AND csm.source = 'auto_sync'
          AND cs.auto_sync_members = true
      LOOP
        DELETE FROM chat_space_members 
        WHERE space_id = v_space.id AND employee_id = NEW.id AND source = 'auto_sync';
        
        INSERT INTO chat_messages (space_id, sender_id, organization_id, content, content_type, system_event_data)
        VALUES (
          v_space.id,
          v_system_employee_id,
          NEW.organization_id,
          v_employee_name || ' left the space',
          'system_event',
          jsonb_build_object(
            'event_type', 'member_left',
            'target_employee_id', NEW.id,
            'target_name', v_employee_name
          )
        );
      END LOOP;
    END IF;
    
    -- Add to NEW office spaces
    IF NEW.office_id IS NOT NULL THEN
      FOR v_space IN
        SELECT DISTINCT cs.id, cs.name
        FROM chat_spaces cs
        JOIN chat_space_offices cso ON cso.space_id = cs.id
        WHERE cs.organization_id = NEW.organization_id
          AND cso.office_id = NEW.office_id
          AND cs.auto_sync_members = true
          AND cs.archived_at IS NULL
      LOOP
        INSERT INTO chat_space_members (space_id, employee_id, organization_id, role, source)
        VALUES (v_space.id, NEW.id, NEW.organization_id, 'member', 'auto_sync')
        ON CONFLICT (space_id, employee_id) DO NOTHING;
        
        INSERT INTO chat_messages (space_id, sender_id, organization_id, content, content_type, system_event_data)
        VALUES (
          v_space.id,
          v_system_employee_id,
          NEW.organization_id,
          v_employee_name || ' joined the space',
          'system_event',
          jsonb_build_object(
            'event_type', 'member_added',
            'target_employee_id', NEW.id,
            'target_name', v_employee_name
          )
        );
      END LOOP;
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'sync_office_space_members failed for employee %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- =============================================================================
-- STEP 4: REWRITE sync_department_space_members()
-- Handles: department_id changes - remove from old, add to new
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_department_space_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space RECORD;
  v_system_employee_id UUID;
  v_employee_name TEXT;
BEGIN
  -- Only proceed if department_id actually changed and employee is active
  IF OLD.department_id IS NOT DISTINCT FROM NEW.department_id THEN
    RETURN NEW;
  END IF;
  
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;
  
  BEGIN
    -- Get employee name
    SELECT p.full_name INTO v_employee_name
    FROM profiles p
    WHERE p.id = NEW.user_id;
    
    v_employee_name := COALESCE(v_employee_name, 'Team member');
    
    -- Get system user
    SELECT e.id INTO v_system_employee_id
    FROM employees e
    JOIN user_roles ur ON ur.user_id = e.user_id
    WHERE e.organization_id = NEW.organization_id 
      AND ur.organization_id = NEW.organization_id
      AND ur.role IN ('owner', 'admin')
      AND e.status = 'active'
    LIMIT 1;
    
    IF v_system_employee_id IS NULL THEN
      v_system_employee_id := NEW.id;
    END IF;
    
    -- Remove from OLD department spaces
    IF OLD.department_id IS NOT NULL THEN
      FOR v_space IN
        SELECT DISTINCT cs.id, cs.name
        FROM chat_spaces cs
        JOIN chat_space_departments csd ON csd.space_id = cs.id
        JOIN chat_space_members csm ON csm.space_id = cs.id
        WHERE cs.organization_id = NEW.organization_id
          AND csd.department_id = OLD.department_id
          AND csm.employee_id = NEW.id
          AND csm.source = 'auto_sync'
          AND cs.auto_sync_members = true
      LOOP
        DELETE FROM chat_space_members 
        WHERE space_id = v_space.id AND employee_id = NEW.id AND source = 'auto_sync';
        
        INSERT INTO chat_messages (space_id, sender_id, organization_id, content, content_type, system_event_data)
        VALUES (
          v_space.id,
          v_system_employee_id,
          NEW.organization_id,
          v_employee_name || ' left the space',
          'system_event',
          jsonb_build_object(
            'event_type', 'member_left',
            'target_employee_id', NEW.id,
            'target_name', v_employee_name
          )
        );
      END LOOP;
    END IF;
    
    -- Add to NEW department spaces
    IF NEW.department_id IS NOT NULL THEN
      FOR v_space IN
        SELECT DISTINCT cs.id, cs.name
        FROM chat_spaces cs
        JOIN chat_space_departments csd ON csd.space_id = cs.id
        WHERE cs.organization_id = NEW.organization_id
          AND csd.department_id = NEW.department_id
          AND cs.auto_sync_members = true
          AND cs.archived_at IS NULL
      LOOP
        INSERT INTO chat_space_members (space_id, employee_id, organization_id, role, source)
        VALUES (v_space.id, NEW.id, NEW.organization_id, 'member', 'auto_sync')
        ON CONFLICT (space_id, employee_id) DO NOTHING;
        
        INSERT INTO chat_messages (space_id, sender_id, organization_id, content, content_type, system_event_data)
        VALUES (
          v_space.id,
          v_system_employee_id,
          NEW.organization_id,
          v_employee_name || ' joined the space',
          'system_event',
          jsonb_build_object(
            'event_type', 'member_added',
            'target_employee_id', NEW.id,
            'target_name', v_employee_name
          )
        );
      END LOOP;
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'sync_department_space_members failed for employee %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- =============================================================================
-- STEP 5: REWRITE sync_project_space_members()
-- Handles: INSERT/DELETE on employee_projects
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_project_space_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space RECORD;
  v_system_employee_id UUID;
  v_employee_name TEXT;
  v_employee RECORD;
  v_project_id UUID;
  v_employee_id UUID;
  v_org_id UUID;
BEGIN
  -- Determine context based on operation
  IF TG_OP = 'INSERT' THEN
    v_project_id := NEW.project_id;
    v_employee_id := NEW.employee_id;
  ELSIF TG_OP = 'DELETE' THEN
    v_project_id := OLD.project_id;
    v_employee_id := OLD.employee_id;
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  BEGIN
    -- Get employee details
    SELECT e.*, p.full_name INTO v_employee
    FROM employees e
    LEFT JOIN profiles p ON p.id = e.user_id
    WHERE e.id = v_employee_id;
    
    -- Only sync for active employees
    IF v_employee IS NULL OR v_employee.status != 'active' THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
    
    v_org_id := v_employee.organization_id;
    v_employee_name := COALESCE(v_employee.full_name, 'Team member');
    
    -- Get system user
    SELECT e.id INTO v_system_employee_id
    FROM employees e
    JOIN user_roles ur ON ur.user_id = e.user_id
    WHERE e.organization_id = v_org_id 
      AND ur.organization_id = v_org_id
      AND ur.role IN ('owner', 'admin')
      AND e.status = 'active'
    LIMIT 1;
    
    IF v_system_employee_id IS NULL THEN
      v_system_employee_id := v_employee_id;
    END IF;
    
    -- Process each matching space
    FOR v_space IN
      SELECT DISTINCT cs.id, cs.name
      FROM chat_spaces cs
      JOIN chat_space_projects csp ON csp.space_id = cs.id
      WHERE cs.organization_id = v_org_id
        AND csp.project_id = v_project_id
        AND cs.auto_sync_members = true
        AND cs.archived_at IS NULL
    LOOP
      
      IF TG_OP = 'INSERT' THEN
        -- Add to project space
        INSERT INTO chat_space_members (space_id, employee_id, organization_id, role, source)
        VALUES (v_space.id, v_employee_id, v_org_id, 'member', 'auto_sync')
        ON CONFLICT (space_id, employee_id) DO NOTHING;
        
        INSERT INTO chat_messages (space_id, sender_id, organization_id, content, content_type, system_event_data)
        VALUES (
          v_space.id,
          v_system_employee_id,
          v_org_id,
          v_employee_name || ' joined the space',
          'system_event',
          jsonb_build_object(
            'event_type', 'member_added',
            'target_employee_id', v_employee_id,
            'target_name', v_employee_name
          )
        );
        
      ELSIF TG_OP = 'DELETE' THEN
        -- Remove from project space (only auto_sync members)
        DELETE FROM chat_space_members 
        WHERE space_id = v_space.id 
          AND employee_id = v_employee_id 
          AND source = 'auto_sync';
        
        INSERT INTO chat_messages (space_id, sender_id, organization_id, content, content_type, system_event_data)
        VALUES (
          v_space.id,
          v_system_employee_id,
          v_org_id,
          v_employee_name || ' left the space',
          'system_event',
          jsonb_build_object(
            'event_type', 'member_left',
            'target_employee_id', v_employee_id,
            'target_name', v_employee_name
          )
        );
      END IF;
      
    END LOOP;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'sync_project_space_members failed: %', SQLERRM;
  END;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- =============================================================================
-- STEP 6: CREATE CLEAN TRIGGERS
-- =============================================================================

-- Status change trigger (activation/deactivation)
CREATE TRIGGER trg_employee_status_sync
  AFTER UPDATE OF status ON employees
  FOR EACH ROW
  EXECUTE FUNCTION sync_company_space_members();

-- Office change trigger
CREATE TRIGGER trg_employee_office_sync
  AFTER UPDATE OF office_id ON employees
  FOR EACH ROW
  EXECUTE FUNCTION sync_office_space_members();

-- Department change trigger
CREATE TRIGGER trg_employee_department_sync
  AFTER UPDATE OF department_id ON employees
  FOR EACH ROW
  EXECUTE FUNCTION sync_department_space_members();

-- Project assignment triggers
CREATE TRIGGER trg_project_member_added
  AFTER INSERT ON employee_projects
  FOR EACH ROW
  EXECUTE FUNCTION sync_project_space_members();

CREATE TRIGGER trg_project_member_removed
  AFTER DELETE ON employee_projects
  FOR EACH ROW
  EXECUTE FUNCTION sync_project_space_members();