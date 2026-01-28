
# Auto-Sync Members Feature for Spaces

## Overview
Implement an "Auto Sync Members" toggle for Spaces that automatically manages membership based on the space's access scope (offices/projects). When enabled, it prevents manual member management while syncing members automatically. Exempt roles (Owner, Admin, HR) can always be manually added/removed regardless of auto-sync status.

---

## Suggested UI Design

### 1. Auto-Sync Toggle in Space Settings
**Location:** `SpaceSettingsDialog.tsx` - Add a new section below "Space type"

```text
+---------------------------------------------+
|  Auto-sync members                          |
|  ┌─────────────────────────────────────────┐|
|  │ ○ Off - Manually manage members         │|
|  │ ● On - Auto-sync based on access scope  │|
|  └─────────────────────────────────────────┘|
|                                             |
|  ℹ️ When enabled, members are automatically |
|  added/removed based on the space's access  |
|  scope. Owner, Admin, and HR roles are      |
|  exempt from auto-sync.                     |
+---------------------------------------------+
```

### 2. Sync Preview Dialog (When Enabling Auto-Sync)
**Trigger:** When admin enables auto-sync and there are discrepancies

```text
+-----------------------------------------------+
|  Sync Members                           [X]   |
+-----------------------------------------------+
|  Enabling auto-sync will make these changes:  |
|                                               |
|  ⊕ 5 members to be added                      |
|  ┌───────────────────────────────────────┐    |
|  │ 👤 John Smith (Developer)             │    |
|  │ 👤 Jane Doe (Designer)                │    |
|  │ 👤 ... +3 more                        │    |
|  └───────────────────────────────────────┘    |
|                                               |
|  ⊖ 2 members to be removed                    |
|  ┌───────────────────────────────────────┐    |
|  │ 👤 Mike Wilson (Contractor)           │    |
|  │ 👤 Sarah Brown (Intern)               │    |
|  └───────────────────────────────────────┘    |
|                                               |
|  ⚠️ Owner, Admin, and HR members are          |
|  exempt and will not be removed.              |
|                                               |
|  [Cancel]              [Proceed with Sync]    |
+-----------------------------------------------+
```

### 3. Disabled Member Management UI (When Auto-Sync is ON)
**Location:** Members section in `ChatRightPanelEnhanced.tsx`

```text
+-------------------------------------------+
|  Members (12)                             |
|  ┌───────────────────────────────────────┐|
|  │ 🔄 Auto-sync enabled                  │|
|  │ Members are synced automatically      │|
|  └───────────────────────────────────────┘|
|                                           |
|  👤 John Smith (Admin) ✓                  |
|  👤 Jane Doe                              |
|  👤 Mike Wilson                           |
|                                           |
|  [+ Add] ← Disabled/greyed out            |
|                                           |
|  ℹ️ Disable auto-sync in settings to      |
|  manually manage members                  |
+-------------------------------------------+
```

The "+ Add Member" button will be:
- **Greyed out** when auto-sync is enabled
- Shows a tooltip: "Disable auto-sync in space settings to add members manually"
- **Exception:** Clicking shows only Owner/Admin/HR roles to add (exempt members)

### 4. Member Row Actions (When Auto-Sync is ON)
For regular members:
- Remove option is **disabled** with tooltip: "Cannot remove - auto-sync is enabled"

For exempt roles (Owner/Admin/HR from user_roles table):
- Full remove capability regardless of auto-sync status
- Small badge: "Exempt from sync"

---

## Implementation Steps

### Phase 1: Database & Type Updates

#### 1.1 Update `useSpace` hook to include `auto_sync_members`
**File:** `src/services/useChat.ts`

Add `auto_sync_members` to the return object in the `useSpace` hook (around line 1233-1245).

#### 1.2 Update `useUpdateSpace` mutation
**File:** `src/services/useChat.ts`

Add `autoSyncMembers?: boolean` parameter to the mutation and update accordingly.

### Phase 2: Create Auto-Sync Preview Hook

#### 2.1 Create `useAutoSyncPreview` hook
**File:** `src/services/useChat.ts`

This hook calculates the diff between current space members and expected members based on access scope:

```typescript
export const useAutoSyncPreview = (spaceId: string | null) => {
  // Returns:
  // - membersToAdd: employees in scope but not in space
  // - membersToRemove: employees in space but not in scope (excluding exempt roles)
  // - exemptMembers: Owner/Admin/HR members that won't be affected
}
```

#### 2.2 Create `useExecuteAutoSync` mutation
**File:** `src/services/useChat.ts`

Executes the sync operation:
- Adds missing members
- Removes out-of-scope members (non-exempt only)
- Preserves exempt roles

### Phase 3: UI Components

#### 3.1 Create `AutoSyncPreviewDialog` component
**File:** `src/components/chat/AutoSyncPreviewDialog.tsx`

Dialog that shows:
- Members to be added
- Members to be removed
- Exempt members notice
- Confirm/Cancel buttons

#### 3.2 Update `SpaceSettingsDialog`
**File:** `src/components/chat/SpaceSettingsDialog.tsx`

Add auto-sync toggle section:
- RadioGroup for Off/On
- Info text explaining exempt roles
- Triggers `AutoSyncPreviewDialog` when enabling

#### 3.3 Update `ChatRightPanelEnhanced`
**File:** `src/components/chat/ChatRightPanelEnhanced.tsx`

Modify members section:
- Show "Auto-sync enabled" banner when active
- Disable "+ Add" button (except for exempt roles)
- Disable "Remove" action in member dropdown (except for exempt roles)
- Add helper text directing to settings

#### 3.4 Update `AddSpaceMembersDialog`
**File:** `src/components/chat/AddSpaceMembersDialog.tsx`

When auto-sync is enabled:
- Only show Owner/Admin/HR employees in the list
- Update header text: "Add exempt members to {spaceName}"
- Add info notice about auto-sync

#### 3.5 Update `SpaceMembersDialog`
**File:** `src/components/chat/SpaceMembersDialog.tsx`

When auto-sync is enabled:
- Disable remove actions for non-exempt members
- Show badge for exempt members
- Add banner explaining auto-sync status

### Phase 4: Exempt Role Detection

#### 4.1 Create `useEmployeeSystemRoles` hook
**File:** `src/services/useChat.ts` or new file

Fetches system roles for employees in a space:

```typescript
export const useEmployeeSystemRoles = (employeeIds: string[], orgId: string) => {
  // Query user_roles table to get role for each employee
  // Returns map: { employeeId: 'owner' | 'admin' | 'hr' | 'member' }
}
```

#### 4.2 Helper function `isExemptFromAutoSync`
```typescript
const isExemptFromAutoSync = (role: UserRole) => {
  return role === 'owner' || role === 'admin' || role === 'hr';
}
```

---

## Technical Details

### Auto-Sync Logic (for `useExecuteAutoSync`)

```typescript
// 1. Get space access scope
const space = await getSpace(spaceId);

// 2. Get expected members based on scope
let expectedEmployeeIds: string[] = [];

if (space.access_scope === 'company') {
  // All active employees
  expectedEmployeeIds = await getAllActiveEmployees(orgId);
} else if (space.access_scope === 'offices') {
  // Employees in linked offices
  expectedEmployeeIds = await getEmployeesByOffices(space.offices);
} else if (space.access_scope === 'projects') {
  // Employees in linked projects  
  expectedEmployeeIds = await getEmployeesByProjects(space.projects);
}

// 3. Get current space members
const currentMembers = await getSpaceMembers(spaceId);

// 4. Get exempt members (Owner/Admin/HR)
const exemptEmployeeIds = await getExemptEmployees(currentMembers, orgId);

// 5. Calculate diff
const toAdd = expectedEmployeeIds.filter(id => !currentMembers.includes(id));
const toRemove = currentMembers.filter(id => 
  !expectedEmployeeIds.includes(id) && !exemptEmployeeIds.includes(id)
);

// 6. Execute
await addMembers(spaceId, toAdd);
await removeMembers(spaceId, toRemove);
```

### Exempt Role Query

```sql
SELECT ur.user_id, ur.role, e.id as employee_id
FROM user_roles ur
JOIN employees e ON e.user_id = ur.user_id
WHERE e.id = ANY($1) -- employee IDs
  AND ur.organization_id = $2
  AND ur.role IN ('owner', 'admin', 'hr')
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/useChat.ts` | Add `auto_sync_members` to `useSpace`, update `useUpdateSpace`, add new hooks |
| `src/components/chat/SpaceSettingsDialog.tsx` | Add auto-sync toggle section |
| `src/components/chat/AutoSyncPreviewDialog.tsx` | **NEW** - Sync preview and confirm dialog |
| `src/components/chat/ChatRightPanelEnhanced.tsx` | Conditional disable of add/remove based on auto-sync |
| `src/components/chat/AddSpaceMembersDialog.tsx` | Filter to exempt roles only when auto-sync enabled |
| `src/components/chat/SpaceMembersDialog.tsx` | Disable remove for non-exempt, show badges |

---

## Edge Cases Handled

1. **Space with `access_scope = 'members'`**: Auto-sync toggle hidden (not applicable)
2. **All members are exempt**: No members removed during sync
3. **Admin tries to remove exempt member**: Allowed (exempt from sync rules)
4. **New employee joins office**: Added on next sync (or real-time with DB triggers)
5. **Employee leaves office**: Removed on next sync (if not exempt)
6. **Space admin is also org Owner**: Can manage all members regardless

---

## Future Enhancement (Optional)

For real-time auto-sync (instead of manual trigger on toggle):
- Create a PostgreSQL trigger on `employees.office_id` changes
- Trigger syncs relevant spaces when employee office changes
- This can be implemented as a Phase 2 enhancement
