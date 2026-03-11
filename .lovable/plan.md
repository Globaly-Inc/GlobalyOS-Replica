

## Investigation Results & Fixes for Chat Feature Bugs

### Bug 1: Members Added via Auto-Sync Show as "Manual"

**Root Cause:** In `useSpaceMutations.ts` (lines 183-190), the `addAllMembers` block inserts members into `chat_space_members` without setting the `source` field. The database likely defaults to `'manual'`, so all auto-added members appear as manually added.

**Fix:** `src/services/chat/mutations/useSpaceMutations.ts` — Add `source: 'auto_sync'` to the member insert when `addAllMembers` is true (line 189):
```typescript
.map(empId => ({
  space_id: space.id,
  employee_id: empId,
  organization_id: currentOrg.id,
  role: 'member' as const,
  source: 'auto_sync' as const,  // <-- missing
}));
```

Also, the DB trigger that auto-adds the **creator** as admin likely also defaults to `'manual'`. That trigger-inserted row should use `source: 'space_creation'`. This may require a migration to update the trigger, or we set the creator's source after creation.

---

### Bug 2: `employees` Table Uses `department` (String) Not `department_id` (UUID)

**Root Cause:** In the `addAllMembers` block (line 137), the code selects `department_id` from employees, but from the network response, the employees table has a `department` column (string name like "Product Management"), not a `department_id` UUID. Meanwhile `departmentIds` from the dialog are UUIDs from the `departments` table.

**Fix:** The department filtering logic needs to:
1. Look up department names from the `departments` table using the selected `departmentIds`
2. Filter employees by matching their `department` string column against those names

OR query via a `department_id` column if one exists. Need to verify the schema — but the network response clearly shows `"department": "Product Management"` as a string.

---

### Bug 3: `employees` Table Has No `department_id` Column — Filter Silently Fails

This is why the "AG Product" space (with departments: Product Management, Software Engineering, Design, Project Management and project: Agentcis) only has 10 members instead of all matching employees. The `departmentIds?.length` check passes, but `e.department_id` is always `undefined`, so all candidates get filtered out. Only `projectIds` filtering or the `memberIds` fallback adds members.

**Fix:** Change the department filter in `useSpaceMutations.ts` to:
1. Fetch department names from the `departments` table using the selected IDs
2. Filter employees by `e.department` string matching those names

---

### Summary of Changes

| File | Change |
|------|--------|
| `src/services/chat/mutations/useSpaceMutations.ts` | Add `source: 'auto_sync'` to the `addAllMembers` insert. Fix department filtering to use department name lookup instead of non-existent `department_id`. |

### Additional Observations (Not Bugs, But Worth Noting)

1. **Legacy `useChat.ts` still exists** alongside the refactored modules — potential for confusion about which code path runs.
2. **Sync Members button** in SpaceSettings uses a different flow (AutoSyncPreviewDialog) that may have its own source-tagging — worth verifying it also sets `source: 'auto_sync'`.
3. **The `employee_projects` table** is used for project-based filtering — this path appears correct.

