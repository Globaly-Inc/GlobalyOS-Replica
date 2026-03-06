

## Add Folder Selection to Create List Dialog

### Change

**`src/components/tasks/CreateListDialog.tsx`**:
- Import `useTaskFolders` to fetch all folders for the given space
- Add a `selectedFolderId` state, initialized from the `folderId` prop (so if triggered from a folder context, it's pre-selected)
- Add a `Select` dropdown below the name input with options:
  - "No folder (space level)" — places the list directly under the space
  - One option per folder in the space (showing folder icon + name)
- Use `selectedFolderId` instead of the raw `folderId` prop when creating the list

This is a single-file change. No other files need modification since the dialog already accepts `folderId` as a prop and the creation logic already supports it.

