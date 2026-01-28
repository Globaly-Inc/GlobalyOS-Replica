
# Fix Database Error: "record 'new' has no field 'updated_by'"

## Problem Identified

The recent fix migration (`20260128122917`) introduced a bug in the `sync_project_space_members()` function. While fixing the JOIN condition from `p.user_id` to `p.id`, it also replaced the function logic with a version that references columns that **do not exist** on the `employee_projects` table.

**Root Cause Analysis:**

| Table | Actual Columns |
|-------|----------------|
| `employee_projects` | `id`, `employee_id`, `project_id`, `organization_id`, `created_at` |
| **Missing columns** | `updated_by`, `created_by` (do not exist!) |

**Broken code in migration 20260128122917 (line 14):**
```sql
WHERE e.id = COALESCE(NEW.updated_by, NEW.created_by);  -- WRONG!
```

The `employee_projects` table has no `updated_by` or `created_by` columns, so when a row is inserted, the trigger fails because `NEW.updated_by` is not a valid field reference.

---

## Solution

Restore the `sync_project_space_members()` function to use the simpler, correct logic from migration `20260128121722`, but with the `p.id` JOIN fix applied:

1. Look up employee details using `NEW.employee_id` (which exists)
2. Use `LEFT JOIN profiles p ON p.id = e.user_id` (the correct JOIN)
3. Use 'Auto-Sync' as the actor name (since there's no actor tracking on this junction table)

---

## Database Migration

A new migration will:
1. Restore `sync_project_space_members()` with the correct logic
2. Use `NEW.employee_id` to get employee info (not `NEW.updated_by`)
3. Fix the `p.user_id` → `p.id` JOIN issue
4. Keep system messages attribution to "Auto-Sync"

---

## Technical Details

### Function Changes

| Aspect | Broken (20260128122917) | Fixed |
|--------|-------------------------|-------|
| Employee lookup | `WHERE e.id = COALESCE(NEW.updated_by, NEW.created_by)` | `WHERE e.id = NEW.employee_id` |
| Actor name | Complex lookup from non-existent column | `'Auto-Sync'` (static string) |
| Profile JOIN | `p.id = e.user_id` (correct) | `p.id = e.user_id` (keep correct) |

The fix applies only to `sync_project_space_members()` since the other functions (`sync_company_space_members`, `sync_office_space_members`) operate on the `employees` table which does have the `updated_by` column.

---

## Files Changed

| Resource | Action | Description |
|----------|--------|-------------|
| Database migration | Add | Restore correct `sync_project_space_members()` function logic |

---

## After Fix

Assigning projects to team members will work correctly again. The system will:
- Add employees to project-scoped chat spaces automatically
- Create system messages saying "[Employee Name] was added by Auto-Sync"
- Properly look up employee names using the correct JOIN
