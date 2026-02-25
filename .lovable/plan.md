

## Plan: Add bulk delete for tasks (List View and Board View)

### Overview
Add checkbox-based multi-select to both List View and Board View, with a floating bulk actions bar (following the existing pattern from `WikiBulkActionsBar` / `LeaveBulkActionsBar`) that shows a "Delete" action with confirmation.

### Changes

**1. New hook: `useBulkDeleteTasks` in `src/services/useTasks.ts`**
- Add a mutation that accepts `{ ids: string[], spaceId: string }` and deletes all tasks in one go using `.in('id', ids)`
- Invalidates the `['tasks', spaceId]` query on success

**2. New component: `src/components/tasks/TaskBulkActionsBar.tsx`**
- Reuse the exact same floating bar pattern from `WikiBulkActionsBar` / `LeaveBulkActionsBar`
- Props: `selectedIds`, `totalItems`, `onSelectAll`, `onDeselectAll`, `onDelete`, optional `className`
- Shows selection count badge, Select All / Deselect All toggle, Delete button, and Cancel (X) button
- Renders only when `selectedIds.length > 0`

**3. Update `src/components/tasks/TaskListView.tsx`**
- Add `selectedTaskIds` state (`Set<string>`)
- Add a checkbox in the header row and in each `TaskRow` (prepended before the name column or as an extra leading column)
- Shift grid template to include a leading `28px` checkbox column
- Pass `selected` and `onToggleSelect` props to `TaskRow`
- Render `TaskBulkActionsBar` at the bottom when selection is active
- Wire up Select All / Deselect All across all visible tasks
- On bulk delete: show `AlertDialog` confirmation, then call `useBulkDeleteTasks`, clear selection on success

**4. Update `src/components/tasks/TaskRow.tsx`**
- Accept optional `selected` (boolean) and `onToggleSelect` callback props
- Render a `Checkbox` as the first cell when `onToggleSelect` is provided
- Stop propagation on checkbox click so it doesn't trigger `onClick` (task detail navigation)

**5. Update `src/components/tasks/TaskBoardView.tsx`**
- Add `selectedTaskIds` state (`Set<string>`)
- Add a small checkbox overlay on each `TaskCard` (top-left corner, visible on hover or when any selection is active)
- Render `TaskBulkActionsBar` at the bottom when selection is active
- Wire up Select All / Deselect All across all visible tasks
- On bulk delete: `AlertDialog` confirmation, then `useBulkDeleteTasks`

**6. Update `src/components/tasks/TaskRow.tsx` grid handling**
- The `gridStyle` prop already comes from the parent; the parent will now prepend the checkbox column width

### Technical details

- **Bulk delete mutation** uses `supabase.from('tasks').delete().in('id', ids)` — a single round-trip
- **Checkbox column** is `28px` wide, prepended to the existing grid template in `TaskListView`
- **Board View** uses an absolutely-positioned checkbox in the top-left of each card, shown on hover or when `selectedTaskIds.size > 0`
- The floating bar uses the identical styling from `WikiBulkActionsBar`: `fixed bottom-6 left-1/2 -translate-x-1/2 z-50` with slide-in animation
- Confirmation dialog warns: "Are you sure you want to delete {n} tasks? This action cannot be undone."

