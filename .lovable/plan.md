
# Refactor Auto-Sync Feature: Decouple Automation from Profile Edits

## Problem Summary

The current auto-sync implementation for chat space membership has several critical issues that cause profile edit operations (projects, offices, departments) to fail:

### Issues Identified

| Issue | Location | Impact |
|-------|----------|--------|
| References `e.first_name`, `e.last_name` columns | `sync_project_space_members()` | These columns don't exist in `employees` table - causes silent failures |
| References `updated_by`, `created_by` columns | All sync functions | These columns don't exist in `employees` or `employee_projects` tables |
| Uses invalid source value `auto_project` | `sync_project_space_members()` | Database only has `manual` and `auto_sync` as valid values |
| No department sync trigger | Missing function | Department changes don't update chat space membership |
| Trigger errors block main operation | All sync functions | If automation fails, the profile edit itself fails |

### Current Architecture (Problematic)

```text
+-------------------+       +------------------------+       +------------------+
| Profile Edit      | ----> | Sync Trigger Runs      | ----> | If Error:        |
| (e.g. Project)    |       | (Same Transaction)     |       | ENTIRE TX FAILS  |
+-------------------+       +------------------------+       +------------------+
```

---

## Solution: Decoupled Async Automation

### New Architecture

```text
+-------------------+       +------------------+       +------------------------+
| Profile Edit      | ----> | Edit Completes   | ----> | Async Job Runs         |
| (Always Succeeds) |       | Successfully     |       | (Separate Transaction) |
+-------------------+       +------------------+       +------------------------+
                                                                    |
                                                       +------------------------+
                                                       | If Error: Logged but   |
                                                       | does NOT affect edit   |
                                                       +------------------------+
```

### Key Principles

1. **Fail-Safe Triggers**: All sync triggers wrap operations in `BEGIN/EXCEPTION/END` blocks
2. **Consistent Source Values**: Use only `auto_sync` for all automation
3. **Correct Column References**: Use `profiles.full_name` (not `employees.first_name`)
4. **Add Missing Department Sync**: Create trigger for department changes
5. **Remove Non-Existent Column References**: Remove `updated_by`, `created_by` lookups

---

## Technical Changes

### 1. Fix `sync_project_space_members()` Function

**Changes:**
- Remove references to `e.first_name`, `e.last_name` (don't exist)
- Remove references to `NEW.updated_by`, `NEW.created_by` (don't exist)
- Change source from `auto_project` to `auto_sync`
- Add exception handling so errors don't block the main operation
- Use `profiles.full_name` directly with proper JOIN

```sql
-- Key fix: Get employee name correctly
SELECT COALESCE(p.full_name, 'Team member')
INTO v_employee_name
FROM employees e
LEFT JOIN profiles p ON p.id = e.user_id
WHERE e.id = NEW.employee_id;
```

### 2. Fix `sync_office_space_members()` Function

**Changes:**
- Remove references to `NEW.updated_by`, `OLD.updated_by` (don't exist)
- Add exception handling wrapper
- Simplify actor name logic (use 'System' for automated actions)

### 3. Fix `sync_company_space_members()` Function

**Changes:**
- Remove references to `NEW.updated_by`, `OLD.updated_by` (don't exist)
- Add exception handling wrapper
- Simplify actor name logic

### 4. Add `sync_department_space_members()` Function (NEW)

**Purpose:** Handle department changes and update chat space membership

**Trigger:** `AFTER UPDATE OF department, department_id ON employees`

**Logic:**
- When department changes, find spaces with `access_scope = 'departments'`
- Remove from old department spaces
- Add to new department spaces
- Log changes and post system messages

### 5. Add Exception Handling Pattern

All sync functions will use this pattern:

```sql
CREATE OR REPLACE FUNCTION sync_xxx_space_members()
RETURNS TRIGGER AS $$
BEGIN
  -- Main sync logic here
  
  RETURN COALESCE(NEW, OLD);
  
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't block the main operation
  RAISE WARNING 'Auto-sync failed: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## User Flow Implementation

### Flow 1: New Team Member Added & Active
- **Trigger:** `INSERT` on `employees` table
- **Action:** Add to company-wide spaces (`access_scope = 'company'`)
- **Log:** System message in space conversation

### Flow 2: Team Member Deactivated
- **Trigger:** `UPDATE` on `employees` where `status` changes from `active`
- **Action:** Remove from all auto-synced spaces where `source = 'auto_sync'`
- **Log:** System message in space conversation

### Flow 3: Office Change
- **Trigger:** `UPDATE OF office_id` on `employees`
- **Action:** Remove from old office spaces, add to new office spaces
- **Log:** System messages for both removal and addition

### Flow 4: Department Change
- **Trigger:** `UPDATE OF department, department_id` on `employees`
- **Action:** Remove from old department spaces, add to new department spaces
- **Log:** System messages for both removal and addition

### Flow 5: Project Change
- **Trigger:** `INSERT` or `DELETE` on `employee_projects`
- **Action:** Add/remove from project-linked spaces
- **Log:** System message in space conversation

---

## Database Migration

A single migration will:

1. **Replace** `sync_project_space_members()` with fixed version
2. **Replace** `sync_office_space_members()` with fixed version
3. **Replace** `sync_company_space_members()` with fixed version
4. **Create** `sync_department_space_members()` function
5. **Create** trigger for department changes
6. **Ensure** all triggers use exception handling

---

## Files Changed

| Resource | Action | Description |
|----------|--------|-------------|
| Database migration | Add | Fix all sync functions + add department sync |

---

## Benefits After Fix

| Aspect | Before | After |
|--------|--------|-------|
| Profile edits | Can fail if sync fails | Always succeed |
| Error visibility | Silent failures | Logged warnings |
| Department sync | Not implemented | Fully working |
| Column references | Invalid columns | Correct schema |
| Source values | Mixed/invalid | Consistent `auto_sync` |

---

## Testing Scenarios

After implementation, verify:
1. Editing projects saves successfully even if no matching spaces exist
2. Editing office saves successfully and updates space membership
3. Editing department saves successfully and updates space membership
4. Deactivating member removes from all auto-synced spaces
5. Activating member adds to appropriate spaces
6. System messages appear in space conversations for all changes
