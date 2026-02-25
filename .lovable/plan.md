

## Plan: Inline Task Name Input on Board "+ Add Task" → Opens AddTaskDialog with Pre-filled Title

### What changes

**1. `src/components/tasks/TaskBoardView.tsx`** — Add inline input state to `BoardColumn`
- When user clicks "+ Add Task" (bottom button or header +), instead of immediately calling `onAddTask`, show an inline text input at the bottom of the card list.
- On Enter: hide the input and call a new callback `onAddTaskWithTitle(statusId, title)` passing the typed title.
- On Escape or empty blur: hide the input, no action.

**2. `src/components/tasks/TaskBoardView.tsx`** — Update props
- Add new prop: `onAddTaskWithTitle?: (statusId: string, title: string) => void`
- `BoardColumn` receives and uses this new callback.

**3. `src/components/tasks/AddTaskDialog.tsx`** — Accept optional `defaultTitle` prop
- Add `defaultTitle?: string` to props.
- Initialize `title` state from `defaultTitle` when the dialog opens.
- Use a `useEffect` to sync `defaultTitle` into `title` when the dialog opens.

**4. `src/pages/Tasks.tsx`** — Wire up the new flow for board view
- Add state: `addTaskDefaultTitle` (string).
- For the board view's `onAddTaskInStatus`, change to use the new `onAddTaskWithTitle` callback that sets both the status ID and the title, then opens the dialog.
- Pass `defaultTitle={addTaskDefaultTitle}` to `AddTaskDialog`.

### Flow
```text
User clicks "+ Add Task" on board column
  → Inline text input appears at bottom of column
  → User types task name, presses Enter
  → Input disappears
  → AddTaskDialog opens with title pre-filled and status pre-selected
  → User fills remaining fields and clicks "Create Task"
```

### Files to edit
- `src/components/tasks/TaskBoardView.tsx`
- `src/components/tasks/AddTaskDialog.tsx`
- `src/pages/Tasks.tsx`

