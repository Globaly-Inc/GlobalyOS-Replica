

## Make Status Pill a Dropdown in Task Row

### Problem
The status indicator in the task row Name column is a static badge. Users want to click it and see a dropdown of all available statuses to change the task's status inline.

### Changes

**`src/components/tasks/TaskRow.tsx`**
- Add `statuses` to `TaskRowProps` (array of `TaskStatusRow`)
- Replace the static status `<span>` (lines 285-294) with a `Popover` containing a list of all statuses
- Clicking a status option calls `handleUpdate('status_id', selectedStatusId)`
- Each option shows the colored dot + status name, matching the current pill style
- The trigger remains the current pill appearance (so it looks the same but is clickable)

**`src/components/tasks/TaskListView.tsx`**
- Pass the `statuses` prop to each `<TaskRow>` component (the parent already has `statuses` in its props)

### Technical Details
- Reuse the existing `Popover` + list pattern already used for priority/assignee/category selectors
- The `handleUpdate` function at line 236 already supports updating any field including `status_id`
- No database or API changes needed

