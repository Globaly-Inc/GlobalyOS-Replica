

## Task Management Module -- Revised Comprehensive Plan

This is a large feature. It will be built in **4 phases** across multiple prompts. The left sidebar (app navigation icons) and top bar (org name, search, etc.) are **not** part of this module -- they already exist in the app shell. This plan covers only the task content area that renders inside the existing layout.

---

### What the Mockups Show (Summary)

From the PDFs:

1. **Inner Task Sidebar** (inside the content area, not the app-level sidebar):
   - "Workspace" section with links: Tasks, Office Check-Ins, Documents
   - "Spaces" tree: parent spaces (e.g. "Head Office") with child spaces (e.g. "Client Follow-up", "Seminar Events", "Marketing Tasks")
   - "+" button to add new spaces

2. **Task List View** (main content area):
   - Breadcrumb: "Head Office / Client Follow Up"
   - Space title: "Client Follow Up"
   - Top bar: Search, Assignee filter avatar, Filters button, Customize button, List View / Board View toggle
   - Top-right: "... Manage" button, "+ Add Task" button
   - Tasks grouped by collapsible status sections (To Do 4, In Progress 3, In Review 2, Completed 2)
   - Each section has "+ Add Task" inline
   - Columns: Name (with category icon + color dot), Category, Assignee (avatar), Tags (badges), Comments (count), Attachments (count), Followers (avatar stack), Priority (colored label)

3. **Task Detail Page** (full page, not dialog):
   - Top: breadcrumb "Head Office / Client Follow Up", "Created by [name] on [date]", prev/next arrows, close X
   - Left section: "Related to" with edit pencil, then "Internal" badge
   - Task title (editable), then metadata grid:
     - Status (pill badge), Assignee (avatar + name), Category (icon + name), Notification (on/off), Followers (avatar stack + count), Priority (colored label), Due Date, Tags (+ Add), Reminders, Recurrence
   - Body: Description (rich text), Checklist (items with checkboxes), Attachments
   - Right panel: "Comments & Logs" timeline with comments, activity entries (assignee changes, priority changes, category changes), and comment input with @ mentions

4. **Manage Dialog** (centered dialog):
   - Two tabs: Status, Category
   - Status tab: groups by status group (To do, In Queue under "To do"; In Progress under "In Progress"; In Review; Completed) with drag handles, inline rename, delete via 3-dot menu, "+ Add Status" per group
   - Category tab: similar list of categories (Email, Call, Call Back, Reminder) with drag handles

5. **Add Task Flow**:
   - Click "+ Add Task" opens inline row in the status section
   - Type task name, optionally select category
   - Save creates the task

6. **Filter Panel**:
   - Dropdown/popover with filter categories: Status, Assignee, Priority, Category, Tags, Due Date
   - Multi-select checkboxes within each filter
   - Apply button

7. **Column Rearrangement** (Customize):
   - Popover showing column list with checkboxes (show/hide)
   - Drag-and-drop to reorder columns

8. **Related To**:
   - In Task Detail, click "Related to" to open a popover
   - Select entity type (Employee, Department, etc.) and search/select the entity

9. **Board View**:
   - Toggle between List View and Board View
   - Kanban columns by status with task cards

---

### Database Schema (9 Tables)

**1. `task_spaces`**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| organization_id | UUID FK -> organizations | Tenant isolation |
| name | TEXT NOT NULL | e.g. "Client Follow Up" |
| description | TEXT | Optional |
| parent_id | UUID FK (self-ref) | For nesting (Head Office > Client Follow-up) |
| icon | TEXT | Emoji or letter |
| color | TEXT | Space accent color |
| owner_id | UUID FK -> employees | Creator |
| sort_order | INT DEFAULT 0 | Ordering |
| created_at | TIMESTAMPTZ DEFAULT now() | |
| updated_at | TIMESTAMPTZ DEFAULT now() | |

**2. `task_statuses`**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| organization_id | UUID FK | |
| space_id | UUID FK -> task_spaces ON DELETE CASCADE | |
| name | TEXT NOT NULL | e.g. "To Do", "In Queue" |
| color | TEXT | Status color |
| status_group | TEXT | Group label: 'todo', 'in_progress', 'in_review', 'completed' |
| sort_order | INT DEFAULT 0 | |
| is_default | BOOLEAN DEFAULT false | Default for new tasks |
| is_closed | BOOLEAN DEFAULT false | Marks "done" semantics |

**3. `task_categories`**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| organization_id | UUID FK | |
| space_id | UUID FK -> task_spaces ON DELETE CASCADE | |
| name | TEXT NOT NULL | e.g. "Email", "Call" |
| icon | TEXT | Category icon name |
| color | TEXT | |
| sort_order | INT DEFAULT 0 | |

**4. `tasks`**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| organization_id | UUID FK | |
| space_id | UUID FK -> task_spaces | |
| title | TEXT NOT NULL | |
| description | TEXT | Rich text / HTML |
| status_id | UUID FK -> task_statuses | |
| category_id | UUID FK -> task_categories | Nullable |
| priority | TEXT CHECK IN ('urgent','high','normal','low') | Default 'normal' |
| assignee_id | UUID FK -> employees | Nullable |
| reporter_id | UUID FK -> employees | Creator |
| due_date | DATE | Nullable |
| start_date | DATE | Nullable |
| tags | TEXT[] DEFAULT '{}' | Array of tag strings |
| sort_order | INT DEFAULT 0 | Within status group |
| is_archived | BOOLEAN DEFAULT false | Soft delete |
| completed_at | TIMESTAMPTZ | Set when moved to closed status |
| related_entity_type | TEXT | 'employee', 'department', etc. |
| related_entity_id | UUID | ID of the linked entity |
| notification_enabled | BOOLEAN DEFAULT true | Per-task notification toggle |
| recurrence | TEXT | Optional recurrence rule |
| created_at | TIMESTAMPTZ DEFAULT now() | |
| updated_at | TIMESTAMPTZ DEFAULT now() | |

**5. `task_checklists`**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| organization_id | UUID FK | |
| task_id | UUID FK -> tasks ON DELETE CASCADE | |
| title | TEXT NOT NULL | |
| is_done | BOOLEAN DEFAULT false | |
| assignee_id | UUID FK -> employees | Optional |
| due_date | DATE | Optional |
| sort_order | INT DEFAULT 0 | |

**6. `task_comments`**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| organization_id | UUID FK | |
| task_id | UUID FK -> tasks ON DELETE CASCADE | |
| employee_id | UUID FK -> employees | Author |
| content | TEXT NOT NULL | |
| created_at | TIMESTAMPTZ DEFAULT now() | |
| updated_at | TIMESTAMPTZ DEFAULT now() | |

**7. `task_attachments`**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| organization_id | UUID FK | |
| task_id | UUID FK -> tasks ON DELETE CASCADE | |
| file_name | TEXT NOT NULL | |
| file_path | TEXT NOT NULL | Storage path |
| file_type | TEXT | MIME type |
| file_size | BIGINT | Bytes |
| uploaded_by | UUID FK -> employees | |
| created_at | TIMESTAMPTZ DEFAULT now() | |

**8. `task_followers`**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| organization_id | UUID FK | |
| task_id | UUID FK -> tasks ON DELETE CASCADE | |
| employee_id | UUID FK -> employees | |
| UNIQUE(task_id, employee_id) | | |

**9. `task_activity_logs`**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| organization_id | UUID FK | |
| task_id | UUID FK -> tasks ON DELETE CASCADE | |
| actor_id | UUID FK -> employees | |
| action_type | TEXT NOT NULL | 'created', 'status_changed', 'assignee_changed', 'priority_changed', 'category_changed', 'comment_added', etc. |
| old_value | JSONB | Previous state |
| new_value | JSONB | New state |
| created_at | TIMESTAMPTZ DEFAULT now() | |

All tables get RLS policies using `is_org_member(auth.uid(), organization_id)` for SELECT, INSERT, UPDATE, DELETE -- following the exact same pattern as existing tables.

A storage bucket `task-attachments` will be created for file uploads.

---

### Routing

The existing single route `tasks` will be expanded to nested routes:

| Route | Component | Purpose |
|-------|-----------|---------|
| `tasks` | TasksLayout | Two-pane layout: inner sidebar + content |
| `tasks` (index) | TasksHome | My Tasks default view |
| `tasks/spaces/:spaceId` | TaskSpaceList | List view for a space |
| `tasks/spaces/:spaceId/board` | TaskSpaceBoard | Kanban board for a space |
| `tasks/:taskId` | TaskDetail | Full task detail page |

---

### Phase 1: Database + CRUD + List View (This Implementation)

This first phase delivers:

1. **Migration SQL**: Create all 9 tables + RLS + auto-seed trigger (when a space is created, auto-insert 4 default statuses: To Do, In Progress, In Review, Completed; and 4 default categories: Email, Call, Call Back, Reminder)

2. **Types**: `src/types/task.ts` with TypeScript interfaces for all entities

3. **Service Hooks**: `src/services/useTasks.ts`
   - `useTaskSpaces(orgId)` -- fetch spaces tree
   - `useTaskStatuses(spaceId)` -- statuses for a space
   - `useTaskCategories(spaceId)` -- categories for a space
   - `useTasks(spaceId, filters?)` -- tasks for a space
   - `useTask(taskId)` -- single task with relations
   - `useTaskComments(taskId)` -- comments for a task
   - `useTaskChecklists(taskId)` -- checklist items
   - `useTaskActivityLogs(taskId)` -- activity timeline
   - Mutations: create/update/delete for tasks, spaces, statuses, categories, comments, checklists

4. **Page Components**:
   - `src/pages/Tasks.tsx` -- Rewrite from Coming Soon to TasksLayout (two-pane)
   - `src/components/tasks/TaskInnerSidebar.tsx` -- "Workspace" links + "Spaces" tree with expand/collapse and "+ Add" button
   - `src/components/tasks/TaskListView.tsx` -- Grouped-by-status task list matching mockup
   - `src/components/tasks/TaskRow.tsx` -- Single task row with category icon, assignee avatar, tags, counts, priority
   - `src/components/tasks/TaskQuickAdd.tsx` -- Inline add row (title input + optional category + save)
   - `src/components/tasks/TaskDetailPage.tsx` -- Full task detail with metadata grid, description, checklist, attachments, comments & logs
   - `src/components/tasks/ManageDialog.tsx` -- Dialog with Status/Category tabs, drag-and-drop reorder, add/rename/delete
   - `src/components/tasks/CreateSpaceDialog.tsx` -- Dialog to create a new space

5. **Route Changes**: Update `src/App.tsx` to add nested task routes under the existing `tasks` path

---

### Phase 2: Kanban Board View (Future)

- Board View toggle on space view
- Kanban columns = statuses, cards = tasks
- Drag-and-drop between columns using `@dnd-kit` (already installed)
- Card shows: title, assignee avatar, priority badge, due date, tags, comment/subtask indicators

### Phase 3: Filters, Column Customization, Search (Future)

- Filter panel popover (status, assignee, priority, category, tags, due date range)
- Customize popover for show/hide columns + drag-and-drop column reorder
- Search bar searching title/description/tags
- Persist column settings per user

### Phase 4: AI, Integration Hooks, Polish (Future)

- AI description generation from title
- AI subtask breakdown from description
- AI comment summarization
- Integration API for Boarding module
- "Related To" entity linking with search popover
- Realtime subscriptions
- My Tasks dashboard (Today, This Week, Overdue sections)

---

### Files to Create/Modify in Phase 1

| File | Action | Purpose |
|------|--------|---------|
| Migration SQL | Create | 9 tables + RLS + seed trigger + storage bucket |
| `src/types/task.ts` | Create | TypeScript interfaces |
| `src/services/useTasks.ts` | Create | All query/mutation hooks |
| `src/pages/Tasks.tsx` | Rewrite | Two-pane layout replacing Coming Soon |
| `src/components/tasks/TaskInnerSidebar.tsx` | Create | Workspace + Spaces sidebar |
| `src/components/tasks/TaskListView.tsx` | Create | Status-grouped task list |
| `src/components/tasks/TaskRow.tsx` | Create | Single task row |
| `src/components/tasks/TaskQuickAdd.tsx` | Create | Inline task creation |
| `src/components/tasks/TaskDetailPage.tsx` | Create | Full task detail view |
| `src/components/tasks/ManageDialog.tsx` | Create | Status/Category management |
| `src/components/tasks/CreateSpaceDialog.tsx` | Create | New space creation |
| `src/App.tsx` | Modify | Add nested task routes |
| `src/services/index.ts` | Modify | Export new hooks |

### Technical Notes

- The inner sidebar (Workspace + Spaces) is rendered **inside** the Tasks content area, not as part of the app-level navigation. The app sidebar and top bar are untouched.
- The Wiki module uses the same two-pane pattern (WikiSidebar + content) -- we follow the same approach.
- Default statuses are auto-seeded via a database trigger when a space is created, matching the mockup groups: To Do, In Progress, In Review, Completed.
- Default categories: Email, Call, Call Back, Reminder (with appropriate icons).
- All data access is scoped by `organization_id` using existing `is_org_member` RLS helper.
- The Figma link requires authentication to view, so the plan is based entirely on the PDF mockups provided.

