

## Plan: Improve Assignee Selector Dropdown to Match Leave Records Style

### Problem
The inline assignee dropdown in `AssigneeSelector` (used in task inline creation for depth 2 & 3) lacks explicit scroll constraints and avatar styling consistency compared to the Leave Records employee filter.

### Changes — `src/components/tasks/TaskInlineCellEditors.tsx`

Update the `AssigneeSelector` component:

1. **Widen the popover** from `w-[220px]` to `w-[280px]` to match the Leave Records dropdown width
2. **Add explicit max-height with scroll** on `CommandList`: add `className="max-h-[240px] overflow-y-auto"` so the list is scrollable when there are many members
3. **Improve avatar sizing** to match Leave Records style: change avatar from `h-5 w-5` to `h-6 w-6` with slightly larger fallback text
4. **Update search placeholder** from `"Search..."` to `"Search employees..."` for clarity

No new files, no database changes. Single file edit to `TaskInlineCellEditors.tsx`.

