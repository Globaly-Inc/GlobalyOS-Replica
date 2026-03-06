

## Add "Create Task List" Dialog

### Problem
Currently, clicking "Task List" from the `+` dropdown menu instantly creates a list named "New List" without any user input. The user wants a dialog popup (similar to "Create Space") where they can type a name before creating.

### Changes

**New file: `src/components/tasks/CreateListDialog.tsx`**
- A simple dialog with a name input field (similar to `CreateFolderDialog`)
- Props: `open`, `onOpenChange`, `spaceId`, `folderId?`, `onCreated` callback
- Uses `useCreateTaskList` to create the list on submit
- Auto-focus on the name input, Enter key submits

**File: `src/components/tasks/TaskInnerSidebar.tsx`**
- Replace `handleAddList` direct creation with state to open the new `CreateListDialog`
- Add state: `createListDialogOpen` and `createListFolderId` (to track which folder context, if any)
- When "Task List" menu item is clicked, set dialog open + optional folderId
- On dialog success callback, select the newly created list and show toast
- Render `CreateListDialog` inside the `SpaceSection` component

