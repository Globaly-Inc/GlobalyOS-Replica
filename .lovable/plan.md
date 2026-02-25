

## Plan: Bottom "+ Add Task" opens the same dialog as top-right "+ Add Task"

### What changes

Currently, the "+ Add Task" at the bottom of each status group (in both **List View** and **Board View**) opens an inline quick-add input. The request is to make it open the **AddTaskDialog** popup instead — the same one triggered by the top-right "+ Add Task" button — with the clicked status pre-selected.

### Technical details

**1. `AddTaskDialog.tsx`** — Accept an optional `defaultStatusId` prop  
- When provided, use it as the initial value for the status select instead of the space's default status.

**2. `TaskListView.tsx`** — Replace inline quick-add with a callback  
- Remove the `addingInStatus` state and the `TaskQuickAdd` component usage.
- Accept a new prop `onAddTaskInStatus: (statusId: string) => void`.
- The bottom "+ Add Task" button and the header "+" icon will both call `onAddTaskInStatus(status.id)`.

**3. `TaskBoardView.tsx`** — Same change as List View  
- Remove `addingInStatus` state and `TaskQuickAdd` usage.
- Accept a new prop `onAddTaskInStatus: (statusId: string) => void`.
- Both the header "+" icon and the bottom "+ Add Task" button call `onAddTaskInStatus(status.id)`.

**4. `Tasks.tsx` (page)** — Wire up the dialog with a pre-selected status  
- Add state `addTaskDefaultStatusId` to track which status was clicked.
- Pass `onAddTaskInStatus` callback to both `TaskListView` and `TaskBoardView` that sets the status ID and opens the `AddTaskDialog`.
- Pass `defaultStatusId` to `AddTaskDialog`.

### Summary of flow after the change

1. User clicks "+ Add Task" at the bottom of a status column (or the "+" icon in the header).
2. The `AddTaskDialog` popup opens with that status pre-selected.
3. User fills in details and creates the task — same experience as the top-right button, but with the correct status pre-filled.

