

## Plan: "All Tasks" view showing tasks from all projects

### Problem
The "All Tasks" button in the sidebar is currently a no-op (`onClick={() => { }}`). When no space is selected, the main area shows an empty "Welcome to Tasks" placeholder instead of aggregating tasks from all spaces.

### Changes

**1. `src/services/useTasks.ts` — Add `useAllTasks` hook**
- New hook that fetches all tasks across all spaces for the current organization (no `space_id` filter)
- Query: `supabase.from('tasks').select('*, status:task_statuses(*), category:task_categories(*)').eq('organization_id', orgId).eq('is_archived', false).order('created_at', { ascending: false })`
- Enriches with assignee/reporter same as `useTasks`
- Query key: `['all-tasks', orgId]`

**2. `src/services/useTasks.ts` — Add `useAllTaskStatuses` and `useAllTaskCategories` hooks**
- Fetch all statuses/categories for the org (no `space_id` filter) so the list/board views can group by status
- These are needed because the current `useTaskStatuses` and `useTaskCategories` are scoped to a single space

**3. `src/components/tasks/TaskInnerSidebar.tsx` — Wire up "All Tasks" click**
- Change `onClick={() => { }}` to `onClick={() => onSelectSpace('__all__')}` (or use `null` to signal "all tasks")
- Update the `onSelectSpace` signature to accept `string | null`
- Highlight "All Tasks" when `selectedSpaceId` is `null`

**4. `src/pages/Tasks.tsx` — Handle the "All Tasks" state**
- When `selectedSpaceId` is `null` (All Tasks mode):
  - Use `useAllTasks`, `useAllTaskStatuses`, `useAllTaskCategories` instead of the space-scoped hooks
  - Show a simplified header ("All Tasks" title, no breadcrumb, no Manage button, no list tabs)
  - Hide the "Add Task" button (since there's no target space) or keep it disabled
  - Render the same `TaskListView` / `TaskBoardView` with the aggregated data
  - Pass a special `spaceId` value (empty string) to the views — inline creation will be hidden since there's no target space
- When a specific space is selected, behavior stays exactly as it is now

**5. `src/components/tasks/TaskListView.tsx` and `TaskBoardView.tsx` — Handle "all tasks" mode**
- When `spaceId` is empty/null, hide the inline "Add Task" row and the "+ Add Task" buttons (since we don't know which space to create in)
- Everything else (grouping by status, bulk delete, selection) works as-is

### Technical details
- The `useAllTasks` query uses `organization_id` from session context (not from client), maintaining tenant isolation
- Statuses from different spaces may share names but have different IDs — they will appear as separate groups, which is correct
- Bulk delete still works since it operates on task IDs directly
- The `useBulkDeleteTasks` hook will need a slight adjustment: in "all tasks" mode, invalidate `['all-tasks']` query key instead of (or in addition to) `['tasks', spaceId]`

