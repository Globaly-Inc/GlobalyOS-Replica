

## Plan: Add Tag Selector Dropdown to Inline Task Tags

### Problem
The inline tags column in `TaskRow` and `TaskListView` (inline add) currently shows static badges or a dash — no dropdown to select from existing tags.

### Changes

**1. New `TagsSelector` component in `src/components/tasks/TaskInlineCellEditors.tsx`**

Add a new inline editor similar to `AssigneeSelector` that:
- Uses `Popover` + `Command` (searchable, scrollable) — matching the employee filter pattern
- Queries all distinct tags from the org's tasks via a new hook
- Shows existing tags as selectable items with checkmarks for already-selected ones
- Allows typing to create new tags on Enter
- Multi-select: clicking a tag toggles it on/off

**2. New hook `useAllTaskTags` in `src/services/useTasks.ts`**

Query all distinct tags across the org's tasks:
```sql
SELECT DISTINCT unnest(tags) as tag FROM tasks WHERE organization_id = ? ORDER BY tag
```
Since Supabase JS doesn't support `unnest`, use an RPC function or fetch tasks and extract unique tags client-side from existing cached data.

Simpler approach: extract unique tags from all tasks already loaded in the view (passed as prop) — avoids a new DB call.

**3. Update `TaskRow.tsx` — tags column (line 113-121)**

Wrap the tags badges in the new `TagsSelector`, enabling click-to-edit with the dropdown. On change, call `handleUpdate('tags', newTags)`.

**4. Update `TaskListView.tsx` — inline add row tags column (line 250-253)**

Replace the dash with the `TagsSelector`, adding `inlineTags` state. Include selected tags in `createTask.mutate()`.

### No database changes needed — tags are already `string[]` on the tasks table.

