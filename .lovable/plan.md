

## Plan: Add cancel/delete button to the inline "+ Add Task" row

### What the user wants
When the inline "+ Add Task" row is active in both the List View and Board View, there is no visible way to cancel/dismiss it (only Escape key works). The user wants a visible delete/cancel button on the inline creation row.

### Changes

**1. `src/components/tasks/TaskListView.tsx`**
- In the inline creation row (lines 272-280), add a cancel button in the trailing actions column (the `40px` column already exists in the grid but is empty for the inline row)
- Render an `X` icon button that calls `resetInline()` to dismiss the inline row
- Style it consistently with the existing row action buttons

**2. `src/components/tasks/TaskBoardView.tsx`**
- In the inline add input section (lines 204-224), add an `X` icon button next to the input to cancel inline creation
- Wrap the input and button in a flex container so the cancel button sits beside the input

### Result
Both views will have a visible cancel/dismiss button on the inline task creation row, making it discoverable without relying solely on the Escape key.

