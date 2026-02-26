

## Restructure Task Sidebar: Space > Folder > Task List Model

### New Hierarchy (Replacing the 4-Tier Project Model)

```text
Workspace
  |-- All Tasks
  |-- Space (top level, with editable icon, analytics dashboard)
  |     |-- Task List (direct child of Space)
  |     |-- Folder (groups task lists)
  |     |     |-- Task List
  |     |     |-- Task List
  |     |-- Task List
  |-- Space
        |-- ...
```

**Rules:**
- Spaces cannot nest inside other Spaces
- Folders can only exist under Spaces (not nested folders)
- Task Lists live under Spaces or Folders
- Tasks live inside Task Lists
- Each level (Space, Folder, Task List) supports sharing and permissions

---

### 1. Database Migration

**New table: `task_folders`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| space_id | uuid FK -> task_spaces | required |
| organization_id | uuid FK -> organizations | required |
| name | text | |
| icon | text | nullable, default emoji |
| color | text | nullable |
| description | text | nullable |
| sort_order | int | default 0 |
| is_archived | bool | default false |
| created_at / updated_at | timestamptz | |

**Alter `task_lists`:**
- Add `folder_id uuid FK -> task_folders` (nullable -- null means directly under Space)

**Alter `task_spaces`:**
- Remove `parent_id` usage (keep column but enforce null at app level -- no schema change needed, just stop using it)
- The `icon` column already exists and supports editable icons

**New table: `task_sharing_permissions`** (for Space, Folder, Task List level sharing)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| organization_id | uuid FK | |
| entity_type | text | 'space', 'folder', 'list' |
| entity_id | uuid | ID of the space/folder/list |
| employee_id | uuid FK -> employees | nullable (for individual) |
| team_id | uuid | nullable (for team-level) |
| permission_level | text | 'view', 'edit', 'admin' |
| created_at | timestamptz | |

RLS policies for all new tables scoped by `organization_id`.

Enable realtime on `task_folders`.

---

### 2. Service Layer Changes (`src/services/useTasks.ts`)

- **New hooks:** `useTaskFolders(spaceId)`, `useCreateTaskFolder`, `useUpdateTaskFolder`, `useDeleteTaskFolder`
- **Update `useCreateTaskList`:** accept optional `folder_id`
- **Update `useTaskLists`:** support querying by `folder_id` or all lists in a space
- **New hooks:** `useTaskSharingPermissions(entityType, entityId)`, `useUpdateTaskSharingPermission`
- **Remove** the 4-tier depth logic from `buildSpaceTree` -- Spaces are flat (no parent_id)

---

### 3. Sidebar Redesign (`TaskInnerSidebar.tsx`)

Replace the recursive `renderNode` with a new structure:

- **"All Tasks"** item at top (unchanged)
- **"Spaces"** header with "+" button to create a Space
- For each Space:
  - Expandable row with **editable icon** (click icon to open emoji picker popover), name, "..." menu, "+" button
  - "..." menu: Rename, Color and Icon, Sharing and Permissions, Archive, Delete
  - "+" menu: Add Task List, Add Folder
  - When Space is selected (clicked on name): show Space analytics dashboard in main area
- Under each Space (when expanded):
  - **Task Lists** shown with a list icon and task count badge
  - **Folders** shown with a folder icon, expandable
    - Under each Folder: Task Lists with count
    - Folder "..." menu: Rename, Sharing and Permissions, Delete
  - Task List "..." menu: Rename, Sharing and Permissions, Delete

**Visual style** (matching the reference screenshots):
- Space rows: bold text, larger icon, "..." and "+" on hover
- Folder rows: indented once, folder icon, lighter text
- Task List rows: indented (once under Space, twice under Folder), list icon, task count badge on right
- Selected item: subtle background highlight
- No colored tier dots -- cleaner look matching reference

---

### 4. Create Space Dialog Update (`CreateSpaceDialog.tsx`)

- Repurpose for Space creation only (remove tier logic)
- Add **emoji icon picker** in the dialog (clickable icon that opens a small emoji grid popover)
- Fields: Icon (editable), Name, Description

**New dialogs:**
- `CreateFolderDialog` -- simple name + icon
- Inline rename for Task Lists (already exists via list tab UI, extend to sidebar)

---

### 5. Sharing and Permissions Dialog (New Component)

`TaskSharingDialog.tsx` -- matches the reference screenshot style:
- Header: "Share this [Space/Folder/List]" with entity name
- Search employees by name/email to invite
- Permission level selector (View, Edit, Admin)
- Show current members with avatars
- "Copy link" action
- Scoped by organization

---

### 6. Main Content Area Changes (`Tasks.tsx`)

- **When a Space is selected:** Show Space analytics dashboard (aggregated across all folders and lists in the Space)
- **When a Task List is selected:** Show the task list/board view with tasks
- **When a Folder is selected:** Show folder summary (list of task lists in the folder with progress)
- Remove the old 4-tier depth detection (`spaceDepth`, `isProjectDashboard`)
- Sidebar now communicates selection type: `{ type: 'space' | 'folder' | 'list' | 'all', id: string | null }`
- List tabs in toolbar are removed (task lists are now selected from sidebar, not tabs)

---

### 7. Types Update (`src/types/task.ts`)

- Add `TaskFolderRow`, `TaskFolderInsert`, `TaskFolderUpdate` types
- Add `TaskSharingPermissionRow` type
- Update `TaskSpaceTreeNode` to remove children nesting (Spaces are flat)
- Add `SidebarSelection = { type: 'all' | 'space' | 'folder' | 'list'; id: string | null }`

---

### 8. Files Changed Summary

| File | Action |
|------|--------|
| DB migration | New `task_folders` table, alter `task_lists` add `folder_id`, new `task_sharing_permissions` table |
| `src/types/task.ts` | Add folder/permission types, new selection type |
| `src/services/useTasks.ts` | Add folder hooks, update list hooks, remove tree depth logic |
| `src/components/tasks/TaskInnerSidebar.tsx` | Full rewrite -- flat spaces, folders, task lists |
| `src/components/tasks/CreateSpaceDialog.tsx` | Simplify to Space-only with emoji picker |
| `src/components/tasks/CreateFolderDialog.tsx` | **New** -- create folder under space |
| `src/components/tasks/TaskSharingDialog.tsx` | **New** -- sharing and permissions |
| `src/pages/Tasks.tsx` | Update selection model, remove tier logic, route to correct view |
| `src/services/index.ts` | Export new hooks |
| `src/components/tasks/ProjectDashboard.tsx` | Adapt to new Space-level analytics |

