

## Add "Move to" Option for Tasks

### Problem
Tasks currently lack a way to be reassigned to a different list/folder/space. Users need a "Move to" option in the task row's action menu (⋯) to move tasks across any space's folders and lists.

### Changes

**`src/components/tasks/TaskRow.tsx`**
- Add a "Move to" dialog trigger in the existing `DropdownMenuContent` (alongside Delete)
- Add a new `MoveTaskDialog` component (or inline dialog) that:
  - Fetches all spaces via `useTaskSpaces`
  - When a space is selected, fetches its folders and lists via `useTaskFolders` and `useTaskLists`
  - Presents a cascading selection: Space → (optional) Folder → List
  - On confirm, calls `handleUpdate('list_id', selectedListId)` to move the task
- Uses the existing `Dialog` component with cascading `Select` dropdowns for Space, Folder (filtered), and List (filtered)

**`src/components/tasks/MoveTaskDialog.tsx`** (new file)
- A reusable dialog component accepting `taskId`, `currentListId`, `open`, `onOpenChange`, and an `onMove` callback
- Three `Select` dropdowns: Space, Folder (optional, shows "No folder" + folders), List
- Folder and List selects update dynamically based on parent selection
- Confirm button calls `onMove(selectedListId)` which triggers `updateTask.mutate({ id: taskId, list_id: selectedListId })`

### Data Flow
- Task table has `list_id` (nullable FK to `task_lists`)
- `task_lists` belong to a `space_id` and optionally a `folder_id`
- Moving a task = updating its `list_id` to a list in any space

