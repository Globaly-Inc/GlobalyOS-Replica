

## Plan: Replicate Wiki Sharing UI/UX for Task Sharing — ✅ COMPLETED

### Summary
Replaced the basic `TaskSharingDialog` with a full-featured sharing dialog that mirrors the Wiki's sharing system.

### What Was Implemented

1. **DB Migration** — Added `task_entity_offices`, `task_entity_departments`, `task_entity_projects` junction tables + `access_scope`/`created_by` columns on `task_spaces`, `task_folders`, `task_lists`. RLS policies scoped by org.

2. **`TaskInviteMember.tsx`** — Multi-select searchable Command popover with Everyone, Offices, Departments, Projects, and individual members. Colored badges, online status indicators, member counts.

3. **`TaskMembersWithAccess.tsx`** — Owner with crown badge + transfer button, company-wide/office/department/project group rows, individual members with view/edit/admin permission dropdowns and remove buttons.

4. **`TaskTransferOwnershipDialog.tsx`** — Full ownership transfer dialog with search, confirmation warning, and loading states.

5. **`TaskSharingDialog.tsx`** — Full rewrite mirroring WikiShareDialog: header with entity stats, Add People section, Who Has Access section, confirmation AlertDialogs for destructive actions, copy link button, loading skeletons.

All existing sidebar integrations (`TaskInnerSidebar.tsx`) continue to work unchanged.
