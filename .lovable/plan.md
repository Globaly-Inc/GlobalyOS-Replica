

# Fix Trigger Error: "column p.user_id does not exist"

## Root Cause Identified

The DELETE request on `employee_projects` table is failing with error:
```
{"code":"42703","message":"column p.user_id does not exist"}
```

**The most recent migration `20260128130534` introduced a bug** by using an incorrect JOIN condition:

```sql
LEFT JOIN profiles p ON p.user_id = e.user_id  -- WRONG!
```

**Actual schema:**
| Table | User ID Column | Notes |
|-------|---------------|-------|
| `employees` | `user_id` | References `auth.users.id` |
| `profiles` | `id` | IS the user ID (directly references `auth.users.id`) |

**Correct JOIN should be:**
```sql
LEFT JOIN profiles p ON p.id = e.user_id  -- CORRECT
```

---

## Solution

Fix the `sync_project_space_members()` function to use the correct JOIN:
- Change `p.user_id = e.user_id` to `p.id = e.user_id`

This correction applies to both the INSERT and DELETE handlers in the function.

---

## Database Migration

The migration will replace the `sync_project_space_members()` function with the corrected JOIN:

```sql
-- For INSERT handler (line ~29):
FROM employees e
LEFT JOIN profiles p ON p.id = e.user_id  -- Fixed
WHERE e.id = NEW.employee_id;

-- For DELETE handler (line ~80):
FROM employees e
LEFT JOIN profiles p ON p.id = e.user_id  -- Fixed
WHERE e.id = OLD.employee_id;
```

---

## Technical Details

| Aspect | Broken (Current) | Fixed |
|--------|------------------|-------|
| JOIN condition | `p.user_id = e.user_id` | `p.id = e.user_id` |
| Error | `column p.user_id does not exist` | No error |
| DELETE operations | Fail silently (trigger error) | Work correctly |

---

## Files Changed

| Resource | Action | Description |
|----------|--------|-------------|
| Database migration | Add | Fix profiles JOIN in `sync_project_space_members()` |

---

## After Fix

- Unticking projects and saving will correctly remove the project assignment
- DELETE operations on `employee_projects` will succeed
- Members will be auto-removed from project-scoped chat spaces when unassigned
- The trigger function will correctly look up employee names from profiles

