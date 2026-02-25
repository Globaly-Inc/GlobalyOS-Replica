

## Plan: Replace "+ Add Task" button with inline row editing in List View

### What the user wants
Instead of opening the AddTaskDialog popup when clicking "+ Add Task" at the bottom of each status group in the List View, show an inline editable row directly in the task list. This row should have fields for **Name, Assignee, Due Date, Priority, and Category** all on the same line (matching the reference image). Pressing Enter or clicking away after entering a name creates the task immediately.

### Changes

**1. `src/components/tasks/TaskListView.tsx`** — Replace the bottom "+ Add Task" button with an inline creation row

- Add state: `addingInStatusId: string | null` and `inlineTitle: string`
- When user clicks "+ Add Task" at the bottom of a status group, set `addingInStatusId = status.id` to show an inline row instead
- The inline row uses the same grid layout (`gridStyle`) as regular task rows for alignment
- The **Name** column renders an auto-focused `Input`; other columns render the same popover-based inline editors (`PrioritySelector`, `CategorySelector`, `AssigneeSelector`, `DueDateSelector`) used by `TaskRow`
- Store inline field values: `inlinePriority`, `inlineCategoryId`, `inlineAssigneeId`, `inlineDueDate`
- On **Enter** in the name input (with non-empty title): call `useCreateTask` directly to create the task with all the inline field values, then reset the inline state
- On **Escape**: cancel and hide the inline row
- The header "+" button in each status group also triggers this inline row (instead of `onAddTaskInStatus`)

**2. `src/components/tasks/TaskListView.tsx`** — Add `useCreateTask` import and call

- Import `useCreateTask` from `@/services/useTasks`
- Call `createTask.mutateAsync(...)` with `space_id`, `list_id`, `status_id`, `title`, `priority`, `category_id`, `assignee_id`, `due_date`
- Show toast on success/error

**3. `src/pages/Tasks.tsx`** — Remove `onAddTaskInStatus` from `TaskListView` (list view only)

- The list view's "+ Add Task" buttons no longer need to open the dialog, so we can simplify the `onAddTaskInStatus` callback for the list view. The top-right "Add Task" button still opens the dialog as before.

### Inline row layout (matches existing grid)

```text
| [Input: task name...]  | Category ▾ | Assignee ▾ | Tags | 💬 | 📎 | Priority ▾ |
```

Each cell uses the same popover editors already in `TaskInlineCellEditors.tsx` — no new components needed. Non-applicable columns (tags, comments, attachments) show placeholder dashes.

### Files to edit
- `src/components/tasks/TaskListView.tsx` — main changes (inline row + create logic)
- `src/pages/Tasks.tsx` — minor: remove `onAddTaskInStatus` from list view's props since inline creation is self-contained

