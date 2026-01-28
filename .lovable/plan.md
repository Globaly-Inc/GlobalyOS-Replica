

# Show Auto-Sync Member Changes as System Event Messages in Space Conversations

## Problem Identified

When auto-sync triggers member additions/removals in spaces, **no message appears in the space conversation**. The current implementation only logs to `chat_space_member_logs` (shown in the right panel's "Sync Activity" section), but does NOT create system event messages in `chat_messages` which would appear in the conversation area like the example you showed.

## Current vs Expected

| Current Behavior | Expected Behavior |
|-----------------|-------------------|
| Auto-sync changes only logged to `chat_space_member_logs` table | Auto-sync changes create visible system event messages in the conversation |
| Messages only visible in right panel "Sync Activity" section | Messages visible directly in the chat conversation area |
| `sync_project_space_members` function is outdated (no logging, no source tracking) | All sync functions consistently log and create messages |

## Solution Overview

Update all three auto-sync trigger functions to insert system event messages into `chat_messages` table when members are added or removed via auto-sync. This will display messages like:

- "Sarah Smith was added by Auto-Sync"
- "Junu Shrestha was removed by Auto-Sync"

---

## Implementation

### Part 1: Update `sync_project_space_members` Function

This function is currently outdated and needs to:
1. Set `source = 'auto_sync'` when inserting members
2. Log to `chat_space_member_logs`
3. Insert system event messages into `chat_messages`

```sql
CREATE OR REPLACE FUNCTION sync_project_space_members()
RETURNS TRIGGER AS $$
DECLARE
  v_space RECORD;
  v_employee RECORD;
  v_inserted_row RECORD;
BEGIN
  -- On INSERT: Add employee to project-scoped auto-sync spaces
  IF TG_OP = 'INSERT' THEN
    -- Get employee details for the system message
    SELECT id, organization_id, 
           (SELECT full_name FROM profiles WHERE user_id = e.user_id) as full_name
    INTO v_employee
    FROM employees e WHERE id = NEW.employee_id;
    
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
        v_employee.full_name || ' was added by Auto-Sync',
        'system_event',
        jsonb_build_object(
          'event_type', 'member_added',
          'target_employee_id', NEW.employee_id,
          'target_name', v_employee.full_name,
          'actor_name', 'Auto-Sync'
        )
      );
    END LOOP;
  END IF;

  -- On DELETE: Remove employee from project-scoped auto-sync spaces
  IF TG_OP = 'DELETE' THEN
    -- Get employee details for the system message
    SELECT id, organization_id,
           (SELECT full_name FROM profiles WHERE user_id = e.user_id) as full_name
    INTO v_employee
    FROM employees e WHERE id = OLD.employee_id;
    
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
        v_employee.full_name || ' was removed by Auto-Sync',
        'system_event',
        jsonb_build_object(
          'event_type', 'member_removed',
          'target_employee_id', OLD.employee_id,
          'target_name', v_employee.full_name,
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
```

---

### Part 2: Update `sync_company_space_members` Function

Add system event message creation for company-wide auto-sync:

```sql
-- After each INSERT INTO chat_space_member_logs, also INSERT INTO chat_messages:
INSERT INTO chat_messages (
  organization_id, space_id, sender_id, content, content_type, system_event_data
) VALUES (
  v_space.organization_id,
  v_space.id,
  v_space.created_by,
  v_employee.full_name || ' was added by Auto-Sync',
  'system_event',
  jsonb_build_object(
    'event_type', 'member_added',
    'target_employee_id', NEW.id,
    'target_name', v_employee.full_name,
    'actor_name', 'Auto-Sync'
  )
);
```

---

### Part 3: Update `sync_office_space_members` Function

Same pattern - add system event message creation for office-based auto-sync.

---

## Summary of Changes

| Resource | Action | Description |
|----------|--------|-------------|
| Database migration | Add | Update `sync_project_space_members` with source tracking, logging, and system messages |
| Database migration | Modify | Update `sync_company_space_members` to create system event messages |
| Database migration | Modify | Update `sync_office_space_members` to create system event messages |

---

## Result After Fix

When auto-sync adds or removes members, you will see messages in the space conversation like:

```text
+-------------------------------------------------------------+
| [UserPlus icon] Sarah Smith was added by Auto-Sync  2:30 PM |
+-------------------------------------------------------------+
```

```text
+---------------------------------------------------------------+
| [UserMinus icon] Junu Shrestha was removed by Auto-Sync  3:15 PM |
+---------------------------------------------------------------+
```

These messages will appear:
1. **In the conversation area** - visible to all space members
2. **In real-time** - via the existing Supabase Realtime subscription for chat messages
3. **With correct styling** - using the existing `SystemEventMessage` component

