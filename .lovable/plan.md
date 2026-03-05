

## Fix: Newly Created Tasks Not Appearing in CRM Task List

### Root Cause

When a task is created via the "Add Task" button on a CRM profile, `useCreateTask` in `src/services/useTasks.ts` only invalidates the task space query (`['tasks', data.space_id]`). It does **not** invalidate the `['crm-linked-tasks']` query used by `CRMLinkedTasks.tsx`, so the CRM task list stays stale.

### Fix

**File: `src/services/useTasks.ts`** (line 524-526)

Add a broad invalidation of `crm-linked-tasks` queries alongside the existing space invalidation:

```js
onSuccess: (data) => {
  qc.invalidateQueries({ queryKey: ['tasks', data.space_id] });
  qc.invalidateQueries({ queryKey: ['crm-linked-tasks'] });
},
```

This uses prefix matching to refresh any CRM-linked task list regardless of entity type/ID. One line change, no other files affected.

