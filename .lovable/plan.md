

## Fix: CRM Linked Tasks Not Populating

### Root Cause

In `CRMLinkedTasks.tsx` (line 40), the query joins assignee data using:
```
assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url)
```

But `tasks_assignee_id_fkey` references the `employees` table, not `profiles`. This invalid join causes PostgREST to error, and the component silently falls back to an empty array.

### Fix

**File: `src/components/crm/CRMLinkedTasks.tsx`** (line 40)

Change the assignee join to go through `employees` and then `profiles`, matching the pattern used elsewhere in the codebase (e.g. `employee_directory` view):

```sql
assignee:employee_directory!tasks_assignee_id_fkey(id, full_name, avatar_url)
```

The `employee_directory` view is already referenced by `tasks_assignee_id_fkey` (confirmed in the types file) and exposes `id`, `full_name`, and `avatar_url` — exactly the fields needed.

### Files Changed

| File | Change |
|------|--------|
| `src/components/crm/CRMLinkedTasks.tsx` | Fix line 40: replace `profiles!tasks_assignee_id_fkey` with `employee_directory!tasks_assignee_id_fkey` |

One-line fix. No other files affected.

