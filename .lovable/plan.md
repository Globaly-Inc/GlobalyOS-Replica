

# Fix Database Error: "column e.first_name does not exist"

## Problem Identified

The migration `20260128124657` incorrectly references `e.first_name` and `e.last_name` in the `sync_project_space_members()` function, but the `employees` table does NOT have these columns.

**Schema Facts:**
| Table | Name Storage |
|-------|--------------|
| `employees` | No name columns (`first_name`, `last_name` do not exist) |
| `profiles` | `full_name` column (linked via `employees.user_id = profiles.id`) |

**Broken code (line 26 of migration):**
```sql
SELECT COALESCE(e.first_name || ' ' || e.last_name, e.first_name, 'Team member')
INTO v_employee_name
FROM employees e
WHERE e.id = NEW.employee_id;
```

---

## Solution

Fix the function to get the employee name from the `profiles` table via a JOIN, following the same pattern used by `sync_company_space_members()` and `sync_office_space_members()`:

```sql
SELECT COALESCE(p.full_name, 'Team member')
INTO v_employee_name
FROM employees e
LEFT JOIN profiles p ON p.id = e.user_id
WHERE e.id = NEW.employee_id;
```

---

## Database Migration

A new migration will replace the `sync_project_space_members()` function with the correct JOIN to fetch the employee name from `profiles.full_name`.

---

## Technical Details

| Aspect | Broken (Current) | Fixed |
|--------|------------------|-------|
| Name lookup | `e.first_name`, `e.last_name` | `p.full_name` via JOIN |
| JOIN | None | `LEFT JOIN profiles p ON p.id = e.user_id` |
| Fallback | `'Team member'` | `'Team member'` (unchanged) |

---

## Files Changed

| Resource | Action | Description |
|----------|--------|-------------|
| Database migration | Add | Fix employee name lookup to use `profiles.full_name` |

---

## After Fix

- Assigning projects to team members will work correctly
- System messages will display the employee's full name from their profile
- Auto-sync will properly add employees to project-scoped chat spaces

