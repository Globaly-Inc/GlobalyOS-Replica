

## Problem: CRM Activity Log Query Broken

### Where Activities Are Stored

Activities logged via the "Log Activity" button are inserted into the `crm_activity_log` table. The insert works fine — data IS being saved to the database.

### Why Activities Are Not Visible

The **fetch query** in `useCRMActivities` (line 228 of `useCRM.ts`) is broken:

```
.select('*, employee:employees(id, first_name, last_name, avatar_url)')
```

The `employees` table does **not** have `first_name`, `last_name`, or `avatar_url` columns. Those fields live on the `profiles` table (joined via `user_id`). The network request returns a **400 error**: `"column employees_1.first_name does not exist"`.

This means every time the contact profile page loads, the activity query fails silently, and the timeline shows nothing.

### Fix

**File: `src/services/useCRM.ts`** — Update both the fetch query and the type mapping:

1. Change the select join from `employee:employees(id, first_name, last_name, avatar_url)` to `employee:employees(id, profiles(full_name, avatar_url))` — this follows the same pattern used elsewhere in the codebase (e.g., the scheduler queries in the network logs).

2. Update the `ActivityTimeline.tsx` component to read `employee.profiles.full_name` instead of `employee.first_name` / `employee.last_name` for display, and `employee.profiles.avatar_url` for the avatar.

| File | Change |
|------|--------|
| `src/services/useCRM.ts` | Fix select join to use `profiles` relation |
| `src/components/crm/ActivityTimeline.tsx` | Update employee name/avatar rendering to use nested `profiles` data |

