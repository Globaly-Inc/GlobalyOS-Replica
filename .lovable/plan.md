
# Fix Database Error: "column 'role' does not exist"

## Problem Analysis

The `sync_project_space_members()` function incorrectly queries `employees.role` on lines 31-36, but the `employees` table has no `role` column. User roles are stored in the separate `user_roles` table.

**Current broken code (lines 31-36):**
```sql
-- Get system employee for notifications
SELECT id INTO v_system_employee_id
FROM employees
WHERE organization_id = NEW.organization_id
AND role = 'admin'   -- ❌ 'role' column does not exist!
LIMIT 1;
```

**Database schema confirmed:**
| Table | Columns |
|-------|---------|
| `employees` | `id`, `user_id`, `organization_id`, `position`, `department`, etc. (NO `role` column) |
| `user_roles` | `id`, `user_id`, `organization_id`, `role`, `created_at` |

---

## Solution

Align `sync_project_space_members()` with the working pattern from `sync_company_space_members()`:

1. **Use the employee being added as the sender** for system messages (like the other sync functions do)
2. **Remove the broken admin lookup query entirely**
3. **Simplify the message content** to match the established pattern

---

## Database Migration

A new migration will replace the function with the correct version that:
- Uses `NEW.employee_id` as the sender for system messages
- Removes the query that references non-existent `employees.role`
- Follows the same pattern as `sync_company_space_members()`

---

## Technical Details

| Aspect | Current (Broken) | Fixed |
|--------|------------------|-------|
| System message sender | Query for admin via `employees.role` (fails) | Use `NEW.employee_id` (the member being added) |
| Admin lookup | `SELECT id FROM employees WHERE role = 'admin'` | Removed (not needed) |
| Message content | `v_employee_name || ' was added to the project'` | Same (keep existing) |
| Error handling | None (query fails) | Skip system message if no space exists |

---

## Files Changed

| Resource | Action | Description |
|----------|--------|-------------|
| Database migration | Add | Fix `sync_project_space_members()` to remove invalid column reference |

---

## After Fix

- Assigning projects to team members will work without errors
- System messages will show "[Name] was added to the project" in project chat spaces
- Auto-sync will properly add employees to project-scoped chat spaces
- Aligns with the pattern used by other sync functions
