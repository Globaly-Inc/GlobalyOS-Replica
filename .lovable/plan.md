

## Plan: Replicate Wiki Sharing UI/UX for Task Sharing

### Summary
Replace the basic `TaskSharingDialog` with a full-featured sharing dialog that mirrors the Wiki's sharing system. This includes group-based access (Everyone, Offices, Departments, Projects), individual member invites with a searchable Command popover, permission level management (view/edit/admin), owner display, and confirmation dialogs for destructive actions.

### Current State
- `TaskSharingDialog` is a simple dialog with a text search, basic add/remove, and a flat member list
- Uses `task_sharing_permissions` table with `entity_type`, `entity_id`, `employee_id`, `team_id`, `permission_level`
- No group-based access (offices, departments, projects, company-wide)
- No owner display or transfer ownership

### What Changes

**1. Rewrite `TaskSharingDialog.tsx` (~1100 lines)**

Mirror WikiShareDialog structure:
- Header with icon, entity name, and description (with stats for spaces/folders)
- **Add People** section using a multi-select searchable input (same as `WikiAddMember`/`WikiInviteMember`) that shows:
  - "Everyone" quick action
  - Offices (with member counts)
  - Departments (with member counts)
  - Projects (with member counts)
  - Individual members (with avatars and online status)
- Selected items shown as colored badges in the input field
- Permission dropdown (view/edit/admin) + Invite button
- **Who has access** section showing:
  - Owner (with crown badge, transfer ownership button)
  - Company-wide access row (with permission dropdown and remove)
  - Office/Department/Project group rows (with permission dropdown and remove)
  - Individual members (with permission dropdown and remove)
- Copy link button
- Loading skeletons while data loads
- Confirmation AlertDialog for destructive group removal actions

**2. New `TaskMembersWithAccess.tsx` component**

Adapted from `WikiMembersWithAccess.tsx`:
- Shows owner with crown badge
- Group access rows (company, offices, departments, projects) with permission dropdowns
- Individual member rows with permission dropdowns and remove buttons
- Supports `admin` permission level in addition to `view`/`edit`

**3. New `TaskInviteMember.tsx` component**

Adapted from `WikiInviteMember.tsx`:
- Multi-select searchable Command popover
- Groups (Everyone, Offices, Departments, Projects) with colored badges
- Individual members with avatars and online status indicators
- Permission selector and Invite button

**4. Update `src/services/useTasks.ts`**

Add new hooks to support group-based sharing:
- `useUpdateTaskSharingPermission` -- update permission level for a member
- Enhance `useTaskSharingPermissions` to also load group access data (offices, departments, projects associated with the entity)
- Add hooks for loading org offices, departments, projects, and employees (or reuse existing ones)

**5. Database: Add group access junction tables**

New tables (mirroring wiki pattern):
- `task_entity_offices` (entity_type, entity_id, office_id, organization_id)
- `task_entity_departments` (entity_type, entity_id, department, organization_id)
- `task_entity_projects` (entity_type, entity_id, project_id, organization_id)

Add `access_scope` and `created_by` columns to `task_spaces`, `task_folders`, and `task_lists` tables.

RLS policies scoped by organization_id for all new tables.

**6. No changes needed to:**
- `TaskInnerSidebar.tsx` (already opens the sharing dialog)
- Wiki components (they remain unchanged)

### Files Summary

| File | Action |
|------|--------|
| DB migration | New junction tables, alter spaces/folders/lists |
| `src/components/tasks/TaskSharingDialog.tsx` | Full rewrite to match Wiki UX |
| `src/components/tasks/TaskMembersWithAccess.tsx` | **New** -- adapted from Wiki |
| `src/components/tasks/TaskInviteMember.tsx` | **New** -- adapted from Wiki |
| `src/services/useTasks.ts` | Add group sharing hooks |

### Key UX Details
- Colored badges for selection types: green (Everyone), blue (Office), purple (Department), amber (Project), primary (Member)
- Confirmation dialogs before removing group access
- Loading skeletons during data fetch
- Owner shown with crown icon and "Transfer" button
- Permission levels: view, edit, admin (task-specific, extends wiki's view/edit)
