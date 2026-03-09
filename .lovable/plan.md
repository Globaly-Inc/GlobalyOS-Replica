

## Add "Related To" Selector to Inline Task Creation Row

### Problem
The inline task creation row (rendered in `TaskListView.tsx`) currently supports name, category, assignee, priority, due date, tags, comments, and attachments — but has no "Related To" option. When a user wants to link a new task to a CRM entity during inline creation, there is no way to do it without opening the full Add Task dialog.

### Plan

**File: `src/components/tasks/TaskListView.tsx`**

1. Add state for inline related entity fields:
   - `inlineRelatedEntityType: string | null`
   - `inlineRelatedEntityId: string | null`

2. Reset these in `resetInline()`.

3. Pass them to `createTask.mutateAsync()` in `handleCreateInline()`.

4. Add a `'related_to'` case in `renderInlineCell()` that renders a `RelatedToPopover` trigger showing "—" (no relation) or the entity type label when selected. The popover opens entity type options, then search + list — exactly as the existing `RelatedToPopover` works.

5. Import `RelatedToPopover` into `TaskListView.tsx`.

**No changes needed to `RelatedToPopover.tsx`** — it already supports the flow: entity type menu -> search + list -> select. The popover handles everything internally and calls `onUpdate(type, id)` when done.

**Column visibility**: The "Related To" column will be available in the column customizer but hidden by default (consistent with existing standards for integrated-into-name-column data). For the inline row, it will render inside the `name` cell as a small trigger, matching how existing task rows show "Related to" above the title.

### Alternative approach (simpler)
Instead of adding a new column, render the "Related To" popover trigger **inside the `name` cell** of the inline creation row, similar to how saved tasks show it. This keeps the UI consistent and avoids adding a new column.

**Implementation in `renderInlineCell` for `case 'name'`**:
- Add a `RelatedToPopover` trigger (small "Related to" text link with Link2 icon) above the input, matching the layout of existing task rows.
- When a user selects an entity from the popover, store it in `inlineRelatedEntityType` / `inlineRelatedEntityId` state.
- Pass these values to `createTask.mutateAsync()`.

This matches the screenshot — clicking "Related to" opens the popover showing entity types (Employee, Department, etc.), and selecting one shows the search + list directly inside the popover.

