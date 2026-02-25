

# Inline Editing for "Add Task" with Auto-Save

## Current Behaviour
When you click **+ Add Task**, a single text input appears (`TaskQuickAdd`). You type a title, press Enter, and the task is created with only a title. To set category, assignee, priority, or due date you must open the task detail afterwards.

## Proposed Behaviour
Replace the single-input quick-add with a **full inline row** that matches the list view grid columns. After typing a title and pressing Enter (or Tab), the task is created immediately. The remaining fields (category, assignee, priority, due date) appear as **clickable inline cells** on the newly created row and auto-save on selection — no explicit Save button needed.

### How It Works

1. **Click "+ Add Task"** → an inline row appears at the bottom of the status group, matching the grid column layout.
2. **Title cell** is an auto-focused text input. Press **Enter** to create the task (title only, like today).
3. Once created, the row stays in "edit mode" briefly — each cell (category, assignee, priority, due date) is clickable with a dropdown/popover selector.
4. Selecting a value **auto-saves** via `useUpdateTask` and shows no confirmation dialog — the change is persisted immediately.
5. Pressing **Escape** or clicking away closes the inline editing.
6. The same inline-edit behaviour also works on **existing task rows** — clicking a cell opens the selector and auto-saves.

### Files to Change

| File | Change |
|------|--------|
| `src/components/tasks/TaskQuickAdd.tsx` | Rewrite to render as a grid row matching `TaskRow` columns. After title submit, keep the row visible with editable cells for the newly created task. |
| `src/components/tasks/TaskRow.tsx` | Add optional inline-edit mode for each cell (category dropdown, assignee picker, priority selector, due date picker). Each fires `useUpdateTask` on change. |
| `src/components/tasks/TaskListView.tsx` | Pass `visibleColumns` and `gridStyle` to `TaskQuickAdd` so it aligns with the table. After creation, transition the quick-add row into an editable `TaskRow`. |
| `src/components/tasks/TaskBoardView.tsx` | Minor: after quick-add creation, allow the new card to be clicked for editing (no grid alignment needed in board view — board cards already open detail). |
| `src/services/useTasks.ts` | No changes needed — `useUpdateTask` already supports partial updates and invalidates the correct queries. |

### Technical Details

**Inline cell editing pattern (TaskRow):**
- Each column cell wraps in a click handler that stops propagation (so it doesn't open task detail).
- On click, it renders a small `Popover` or `Select` inline.
- On value change, call `updateTask.mutate({ id: task.id, [field]: newValue })`.
- Close the popover automatically after selection.

**TaskQuickAdd grid alignment:**
- Accept `visibleColumns` and `gridStyle` props.
- Render as `<div className="grid ..." style={gridStyle}>` with the title input in the name column and placeholder dashes in other columns.
- After creation, the component calls back with the new task ID so `TaskListView` can mark that row as "just created" and keep it editable.

**Auto-save debounce:**
- For text fields (if any future inline text editing), use a 500ms debounce.
- For select/dropdown fields (category, priority, assignee, due date), save immediately on selection.

