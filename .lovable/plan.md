

## Plan: Replace "All Tasks" with "My Tasks"

### Summary
Change the top sidebar item from "All Tasks" (shows all org tasks) to "My Tasks" (shows only tasks assigned to the logged-in user). This filters the task list/board by the current employee's `assignee_id`.

### Changes

**1. `src/pages/Tasks.tsx`**
- Import `useCurrentEmployee` hook
- Get `currentEmployee` and pass their employee ID as an `assignee_id` filter when in "all" (now "my tasks") mode
- Update the `useAllTasks` call to always include `assignee_ids: [currentEmployee.id]` filter
- Change page title from `'All Tasks'` to `'My Tasks'`
- Rename `isAllTasksMode` to `isMyTasksMode` for clarity (optional but clean)

**2. `src/components/tasks/TaskInnerSidebar.tsx`**
- Change label from `"All Tasks"` to `"My Tasks"` (line 96)
- Change icon from `CheckSquare` to `User` (lucide) to better represent personal tasks

**3. `src/services/useTasks.ts`**
- No changes needed -- the existing `useAllTasks` hook already supports `assignee_ids` filter; we just pass it from the page

### Technical Details

The `useAllTasks` hook already has this filter logic (line 358):
```ts
if (filters?.assignee_ids?.length) query = query.in('assignee_id', filters.assignee_ids);
```

So we simply inject the current employee's ID into the combined filters:
```ts
const { data: currentEmployee } = useCurrentEmployee();

// In the combinedFilters for "my tasks" mode:
const myTasksFilters: TaskFilters = {
  ...combinedFilters,
  assignee_ids: currentEmployee?.id ? [currentEmployee.id] : [],
};
```

The `isAllTasksMode` flag and `selection.type === 'all'` remain the same internally -- only the label and filter behavior change. Views (list/board) continue to work identically since `isAllTasksMode` just controls status merging and inline creation disabling, which still make sense for cross-space "My Tasks".

### Files Summary

| File | Change |
|------|--------|
| `src/components/tasks/TaskInnerSidebar.tsx` | Label "All Tasks" -> "My Tasks" |
| `src/pages/Tasks.tsx` | Add employee filter, update title |

