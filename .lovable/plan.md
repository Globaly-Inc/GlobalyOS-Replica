

# Fix Auto-Sync Membership for All Space Types

## Problem Summary

After analyzing the database triggers, functions, and schema, I found **critical bugs** preventing auto-sync from working:

### Root Causes Identified

| Issue | Details | Impact |
|-------|---------|--------|
| **Wrong column reference** | Functions use `employees.role` which doesn't exist | Functions fail with SQL error |
| **Invalid enum value** | Functions check `access_scope = 'departments'` but this value doesn't exist in the enum | Department sync never matches any spaces |
| **Wrong logic for custom spaces** | Department/office links use `access_scope = 'custom'` with junction tables, not dedicated scope values | Custom-scoped spaces with departments are ignored |
| **Duplicate triggers** | Multiple triggers exist for same functions (e.g., `trigger_sync_company_space_members` and `trigger_sync_company_members_on_update`) | Functions may run multiple times or conflict |
| **Missing group conversation handling** | Deactivation only removes from spaces, not from group conversations | Deactivated members remain in groups |

### Current `access_scope` Enum Values
- `company` - Company-wide (everyone)
- `offices` - Linked to specific offices
- `projects` - Linked to specific projects  
- `members` - Manual member selection only
- `custom` - Mixed selection (can include offices + departments + projects)

### How Spaces Are Actually Configured
- **Office spaces**: `access_scope = 'offices'` + entries in `chat_space_offices`
- **Department spaces**: `access_scope = 'custom'` + entries in `chat_space_departments`  
- **Project spaces**: `access_scope = 'projects'` + entries in `chat_space_projects`
- **Company spaces**: `access_scope = 'company'` (no junction tables needed)

---

## Solution Overview

Rewrite all four sync functions to:
1. Use correct table references (`user_roles` instead of `employees.role`)
2. Query junction tables instead of checking non-existent enum values
3. Clean up duplicate triggers
4. Add group conversation removal on deactivation

---

## User Flows (Corrected)

### Flow 1: Team Member Activated
**Trigger:** `UPDATE` on `employees` where `status` changes to `'active'`

**Actions:**
1. Add to company-wide spaces (`access_scope = 'company'` + `auto_sync_members = true`)
2. Add to office spaces (via `chat_space_offices` junction) matching employee's `office_id`
3. Add to department spaces (via `chat_space_departments` junction) matching employee's `department_id`
4. Add to project spaces (via `chat_space_projects` junction) matching `employee_projects`

**Logs:** System message in each space showing "Member joined"

### Flow 2: Team Member Deactivated
**Trigger:** `UPDATE` on `employees` where `status` changes from `'active'`

**Actions:**
1. Remove from ALL spaces where `source = 'auto_sync'`
2. Remove from ALL group conversations (regardless of auto-sync)

**Logs:** System messages showing "Member left" in spaces and groups

### Flow 3: Office Change
**Trigger:** `UPDATE OF office_id` on `employees`

**Actions:**
1. Remove from old office spaces (via `chat_space_offices` where `office_id = OLD.office_id`)
2. Add to new office spaces (via `chat_space_offices` where `office_id = NEW.office_id`)

**Logs:** System messages for removal and addition

### Flow 4: Department Change  
**Trigger:** `UPDATE OF department_id` on `employees`

**Actions:**
1. Remove from old department spaces (via `chat_space_departments` where `department_id = OLD.department_id`)
2. Add to new department spaces (via `chat_space_departments` where `department_id = NEW.department_id`)

**Logs:** System messages for removal and addition

### Flow 5: Project Assignment Change
**Trigger:** `INSERT` or `DELETE` on `employee_projects`

**Actions:**
1. On INSERT: Add to project spaces (via `chat_space_projects`)
2. On DELETE: Remove from project spaces (via `chat_space_projects`)

**Logs:** System message in each affected space

---

## Technical Implementation

### 1. Fix Admin Lookup Query

```sql
-- Current (BROKEN):
SELECT id INTO v_system_employee_id
FROM employees
WHERE organization_id = NEW.organization_id 
  AND role IN ('owner', 'admin')  -- ❌ 'role' column doesn't exist
LIMIT 1;

-- Fixed:
SELECT e.id INTO v_system_employee_id
FROM employees e
JOIN user_roles ur ON ur.user_id = e.user_id
WHERE e.organization_id = NEW.organization_id 
  AND ur.organization_id = NEW.organization_id
  AND ur.role IN ('owner', 'admin')
  AND e.status = 'active'
LIMIT 1;
```

### 2. Fix Department Space Lookup

```sql
-- Current (BROKEN):
SELECT cs.id, cs.name
FROM chat_spaces cs
WHERE cs.access_scope = 'departments'  -- ❌ This enum value doesn't exist
  AND cs.auto_sync_members = true;

-- Fixed - Query via junction table:
SELECT DISTINCT cs.id, cs.name
FROM chat_spaces cs
JOIN chat_space_departments csd ON csd.space_id = cs.id
WHERE csd.department_id = NEW.department_id
  AND cs.auto_sync_members = true
  AND cs.archived_at IS NULL;
```

### 3. Add Group Conversation Removal on Deactivation

```sql
-- New: Remove from group conversations when deactivated
FOR v_group IN
  SELECT c.id, c.name
  FROM chat_conversations c
  JOIN chat_participants cp ON cp.conversation_id = c.id
  WHERE cp.employee_id = NEW.id
    AND c.is_group = true
LOOP
  DELETE FROM chat_participants 
  WHERE conversation_id = v_group.id AND employee_id = NEW.id;
  
  -- Post system message
  INSERT INTO chat_messages (conversation_id, sender_id, organization_id, content, content_type, system_event_data)
  VALUES (
    v_group.id,
    v_system_employee_id,
    NEW.organization_id,
    v_employee_name || ' left the group',
    'system',
    jsonb_build_object('event_type', 'member_left', ...)
  );
END LOOP;
```

### 4. Cleanup Duplicate Triggers

```sql
-- Remove all old triggers first
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

-- Create clean, well-named triggers
CREATE TRIGGER trg_employee_status_sync
  AFTER UPDATE OF status ON employees
  FOR EACH ROW EXECUTE FUNCTION sync_company_space_members();

CREATE TRIGGER trg_employee_office_sync
  AFTER UPDATE OF office_id ON employees
  FOR EACH ROW EXECUTE FUNCTION sync_office_space_members();

CREATE TRIGGER trg_employee_department_sync
  AFTER UPDATE OF department_id ON employees
  FOR EACH ROW EXECUTE FUNCTION sync_department_space_members();

CREATE TRIGGER trg_project_member_added
  AFTER INSERT ON employee_projects
  FOR EACH ROW EXECUTE FUNCTION sync_project_space_members();

CREATE TRIGGER trg_project_member_removed
  AFTER DELETE ON employee_projects
  FOR EACH ROW EXECUTE FUNCTION sync_project_space_members();
```

---

## Database Migration Plan

### Single migration with:

1. **Drop all existing sync triggers** (cleanup duplicates)
2. **Replace `sync_company_space_members()`** 
   - Fix admin lookup
   - Add group conversation removal on deactivation
   - Handle all space types on activation
3. **Replace `sync_office_space_members()`**
   - Fix admin lookup
   - Query via `chat_space_offices` junction table
4. **Replace `sync_department_space_members()`**
   - Fix admin lookup  
   - Query via `chat_space_departments` junction table (not by enum)
5. **Replace `sync_project_space_members()`**
   - Fix admin lookup
   - Query via `chat_space_projects` junction table
6. **Create clean triggers** with consistent naming
7. **Set search_path** for security

---

## Safety Measures

All functions maintain:
- `BEGIN...EXCEPTION WHEN OTHERS` blocks to prevent sync failures from blocking profile edits
- `RAISE WARNING` for debugging without breaking operations
- `RETURN NEW` / `RETURN COALESCE(NEW, OLD)` to ensure the original operation completes
- Proper `source = 'auto_sync'` tagging for audit trail

---

## Files Changed

| Resource | Action | Description |
|----------|--------|-------------|
| Database migration | Add | Complete rewrite of all 4 sync functions + trigger cleanup |

---

## Testing Checklist

After deployment, verify:

1. ✓ Activating a member adds them to company-wide, office, department, and project spaces
2. ✓ Deactivating a member removes them from ALL auto-synced spaces AND group conversations
3. ✓ Changing office updates office space membership correctly
4. ✓ Changing department updates department space membership correctly  
5. ✓ Adding/removing project assignments updates project space membership
6. ✓ System messages appear in spaces and groups for all changes
7. ✓ Invited (not yet active) members are NOT added to any spaces
8. ✓ Spaces with `auto_sync_members = false` are NOT affected
9. ✓ Profile edits still work even if sync fails (fail-safe)

