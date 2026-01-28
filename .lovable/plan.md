

# Fix Auto-Sync for All Space Types (Revised)

## Problem Summary

The auto-sync feature is completely broken due to incorrect column references. All sync operations fail silently.

### Root Cause

| Bug | Current Code | Correct Code |
|-----|--------------|--------------|
| Wrong column | `cs.is_archived = false` | `cs.archived_at IS NULL` |
| Missing check | (not present) | `AND cs.auto_sync_members = true` |

The column `is_archived` doesn't exist - the actual column is `archived_at` (timestamp).

---

## Solution

Replace all occurrences of `is_archived = false` with `archived_at IS NULL` and add proper `auto_sync_members` checks across all four sync functions.

---

## User Flows (Revised - 5 Flows)

### Flow 1: Team Member Activated
- **Trigger:** `UPDATE` on `employees` where `status` changes to `'active'`
- **Action:** Add to company-wide + office + department spaces (where `auto_sync_members = true`)
- **Log:** System messages in each space

### Flow 2: Team Member Deactivated
- **Trigger:** `UPDATE` on `employees` where `status` changes from `'active'`
- **Action:** Remove from ALL auto-synced spaces (where `source = 'auto_sync'`)
- **Log:** System messages in each space

### Flow 3: Office Change
- **Trigger:** `UPDATE OF office_id` on `employees`
- **Action:** Remove from old office spaces, add to new office spaces
- **Log:** System messages for removal and addition

### Flow 4: Department Change
- **Trigger:** `UPDATE OF department_id` on `employees`
- **Action:** Remove from old department spaces, add to new department spaces
- **Log:** System messages for removal and addition

### Flow 5: Project Assignment Change
- **Trigger:** `INSERT` or `DELETE` on `employee_projects`
- **Action:** Add/remove from project-linked spaces
- **Log:** System message in space conversation

---

## Functions to Fix

| Function | Changes |
|----------|---------|
| `sync_project_space_members()` | Fix `archived_at IS NULL`, add `auto_sync_members` check |
| `sync_office_space_members()` | Fix `archived_at IS NULL`, add `auto_sync_members` check |
| `sync_company_space_members()` | Fix `archived_at IS NULL`, add `auto_sync_members` check, **remove INSERT trigger** |
| `sync_department_space_members()` | Fix `archived_at IS NULL`, add `auto_sync_members` check |

---

## Technical Changes

### Key Fix (All Functions)

```sql
-- Every query selecting spaces must use:
WHERE cs.archived_at IS NULL
  AND cs.auto_sync_members = true
```

### Trigger Changes for `sync_company_space_members()`

```sql
-- REMOVE this trigger (no longer needed):
DROP TRIGGER IF EXISTS trigger_sync_company_members_on_insert ON employees;

-- KEEP only the UPDATE trigger:
CREATE TRIGGER trigger_sync_company_members_on_update
  AFTER UPDATE OF status, office_id ON employees
  FOR EACH ROW
  EXECUTE FUNCTION sync_company_space_members();
```

### Activation Logic (in `sync_company_space_members`)

```sql
-- When member becomes active, add to all matching spaces
IF TG_OP = 'UPDATE' AND OLD.status != 'active' AND NEW.status = 'active' THEN
  -- Add to company-wide spaces
  -- Add to office spaces (if office_id set)
  -- Add to department spaces (if department_id set)
END IF;
```

---

## Database Migration

Single migration will:

1. Drop the INSERT trigger on `employees` for company sync
2. Replace `sync_company_space_members()` with activation-focused logic
3. Replace `sync_office_space_members()` with fixed column references
4. Replace `sync_department_space_members()` with fixed column references
5. Replace `sync_project_space_members()` with fixed column references

All functions maintain:
- Fail-safe exception handling (profile edits always succeed)
- System message posting for visibility
- Proper `source = 'auto_sync'` for audit trail

---

## Files Changed

| Resource | Action | Description |
|----------|--------|-------------|
| Database migration | Add | Fix all 4 sync functions, remove INSERT trigger |

---

## Benefits

| Aspect | Before | After |
|--------|--------|-------|
| Invited members | Would be added to spaces | Stay out until activated |
| Space noise | Clutter from non-joined members | Only active members |
| Activation | Partially working | Full company + office + dept sync |
| Archive check | Silent failures | Works correctly |
| Auto-sync toggle | Ignored | Properly respected |

---

## Testing Scenarios

1. Activating a member adds them to company-wide, office, and department spaces
2. Deactivating a member removes them from all auto-synced spaces
3. Changing office updates office space membership
4. Changing department updates department space membership
5. Changing project updates project space membership
6. System messages appear in spaces for all changes
7. Invited (not yet active) members are NOT added to any spaces
8. Spaces with `auto_sync_members = false` are NOT affected

