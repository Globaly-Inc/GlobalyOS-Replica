
# Multi-Criteria Access Settings for Spaces

## Overview
This implementation adds **Department** as an access scope option and changes the access model from "single selection" (radio buttons) to "multi-selection with AND logic" (checkboxes). When multiple access groups are selected (e.g., Project: Agentcis + Department: Engineering), only employees meeting **ALL criteria** will be eligible for membership.

Additionally, the "Add All Members" and "Auto-sync" controls will be moved from the footer to a dedicated section below Access Settings.

---

## Suggested UI Design

### 1. Create Space Dialog - New Access Settings Layout
**Location:** `CreateSpaceDialog.tsx` with updated `AccessScopeSelector.tsx`

```text
+---------------------------------------------------------------+
|  Create a space                                         [X]   |
+---------------------------------------------------------------+
|  [Icon] Space name ________________________                   |
|                                            95/128             |
|                                                               |
|  Description (optional)                                       |
|  ┌───────────────────────────────────────────────────────┐    |
|  │ What is this space about?                             │    |
|  └───────────────────────────────────────────────────────┘    |
|                                            0/500              |
|                                                               |
|  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  |
|  ACCESS SETTINGS                                              |
|  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  |
|                                                               |
|  ○ Company-wide                                               |
|  │ Anyone in GlobalyHub can find, view, and join              |
|                                                               |
|  ○ Custom access (select criteria below)                      |
|  │ Only employees matching ALL selected criteria can access   |
|                                                               |
|     ┌─────────────────────────────────────────────────────┐   |
|     │ ☐ Office                                            │   |
|     │   [Select offices...               ▼]               │   |
|     │   ┌──────────┐ ┌──────────────────┐                 │   |
|     │   │ Sydney ✕ │ │ Melbourne ✕      │                 │   |
|     │   └──────────┘ └──────────────────┘                 │   |
|     │                                                     │   |
|     │ ☑ Department                                        │   |
|     │   [Select departments...           ▼]               │   |
|     │   ┌───────────────┐                                 │   |
|     │   │ Engineering ✕ │                                 │   |
|     │   └───────────────┘                                 │   |
|     │                                                     │   |
|     │ ☑ Project                                           │   |
|     │   [Select projects...              ▼]               │   |
|     │   ┌───────────┐                                     │   |
|     │   │ Agentcis ✕│                                     │   |
|     │   └───────────┘                                     │   |
|     └─────────────────────────────────────────────────────┘   |
|                                                               |
|     💡 Members must be in Engineering AND assigned to         |
|        Agentcis project to access this space.                 |
|                                                               |
|  ○ Invite members manually                                    |
|  │ Only invited members can access                            |
|     [Select team members...              ▼]                   |
|     ┌────────────┐ ┌────────────┐ ┌────────────┐              |
|     │ 👤 John ✕  │ │ 👤 Jane ✕  │ │ 👤 Mike ✕  │              |
|     └────────────┘ └────────────┘ └────────────┘              |
|                                                               |
|  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  |
|  MEMBERSHIP OPTIONS                                           |
|  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  |
|                                                               |
|  ☐ Add all matching members now                               |
|     Add all employees who meet the access criteria            |
|                                                               |
|  ⦿ Auto-sync members                                   [OFF]  |
|     Automatically add/remove members when team changes   ⓘ   |
|                                                               |
|───────────────────────────────────────────────────────────────|
|                                       [Cancel]  [Create]      |
+---------------------------------------------------------------+
```

**Key Changes:**
1. Radio buttons now have 3 options: Company-wide, Custom access, Invite manually
2. Custom access reveals checkboxes for Office, Department, Project
3. Each checked criterion shows its multi-select dropdown
4. Dynamic help text shows the AND logic being applied
5. "Add All Members" and "Auto-sync" moved to MEMBERSHIP OPTIONS section
6. Dialog width increased by ~50% (from `sm:max-w-lg` to `sm:max-w-2xl`)

---

### 2. Space Settings Dialog - Updated Layout
**Location:** `SpaceSettingsDialog.tsx`

```text
+---------------------------------------------------------------+
|  Space Settings                                         [X]   |
+---------------------------------------------------------------+
|  Space name                                                   |
|  [Engineering Discussions________________________]            |
|                                             22/128            |
|                                                               |
|  Description (optional)                                       |
|  ┌───────────────────────────────────────────────────────┐    |
|  │ Discussions for the engineering team                  │    |
|  └───────────────────────────────────────────────────────┘    |
|                                                               |
|  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  |
|  SPACE TYPE                                                   |
|  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  |
|  ○ Collaboration - Everyone can post and reply                |
|  ● Announcements - Only admins can post                       |
|                                                               |
|  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  |
|  ACCESS SETTINGS (read-only)                                  |
|  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  |
|  Current access: Department: Engineering + Project: Agentcis  |
|  ℹ️ Access settings cannot be changed after creation.         |
|                                                               |
|  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  |
|  MEMBERSHIP OPTIONS                                           |
|  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  |
|                                                               |
|  ⦿ Auto-sync members                                   [ON]   |
|     Automatically add/remove members based on criteria   ⓘ   |
|                                                               |
|  ┌───────────────────────────────────────────────────────┐    |
|  │ 🛡 Owner, Admin, and HR members are exempt from       │    |
|  │   auto-sync and can be manually managed.              │    |
|  └───────────────────────────────────────────────────────┘    |
|                                                               |
|  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  |
|  DANGER ZONE                                                  |
|  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  |
|  [📁 Archive space]     [🗑 Delete space]                     |
|                                                               |
|───────────────────────────────────────────────────────────────|
|                                       [Cancel]  [Save]        |
+---------------------------------------------------------------+
```

---

### 3. Chat Header - Multi-Criteria Display
**Location:** `ChatHeader.tsx`

```text
+---------------------------------------------------------------+
|  🎯 Engineering Discussions                             ⚙️    |
|  51 members · Engineering + Agentcis                          |
+---------------------------------------------------------------+
```

For multiple criteria, show abbreviated format:
- Single criterion: `51 members · Engineering`
- Two criteria: `51 members · Engineering + Agentcis`
- Three+ criteria: `51 members · 3 criteria`

---

## Data Model Changes

### New Database Table: `chat_space_departments`
```sql
CREATE TABLE chat_space_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES chat_spaces(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(space_id, department_id)
);

ALTER TABLE chat_space_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view department links for spaces they can access"
  ON chat_space_departments FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM employees 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Space admins can manage department links"
  ON chat_space_departments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_space_members csm
      WHERE csm.space_id = chat_space_departments.space_id
        AND csm.employee_id = (
          SELECT id FROM employees WHERE user_id = auth.uid() AND status = 'active'
        )
        AND csm.role = 'admin'
    )
  );
```

### Update `access_scope` enum
```sql
ALTER TYPE access_scope ADD VALUE IF NOT EXISTS 'custom';
```

The new `custom` scope indicates multi-criteria selection (combinations of offices + departments + projects).

---

## Implementation Steps

### Phase 1: Database Changes

#### 1.1 Create `chat_space_departments` junction table
Add migration to create the table with proper RLS policies.

#### 1.2 Add `custom` value to access_scope
Update the enum to support the new multi-criteria mode.

### Phase 2: Type & Hook Updates

#### 2.1 Update `ChatSpace` type
**File:** `src/types/chat.ts`

```typescript
export interface ChatSpace {
  // ... existing fields
  departments?: { id: string; name: string }[];  // NEW
}
```

#### 2.2 Update `AccessScope` type
**File:** `src/components/chat/AccessScopeSelector.tsx`

```typescript
export type AccessScope = 'company' | 'custom' | 'members';
// 'offices', 'projects' are now represented by 'custom' + selected criteria
```

#### 2.3 Update `useSpace` hook
**File:** `src/services/useChat.ts`

Add join for `chat_space_departments` to fetch department associations.

#### 2.4 Update `useCreateSpace` hook
**File:** `src/services/useChat.ts`

Add `departmentIds` parameter and insert into `chat_space_departments`.

Update the member filtering logic to use AND across all criteria:
```typescript
// Get employees matching ALL criteria
let employeesToAdd = await getAllActiveEmployees(orgId);

if (officeIds?.length) {
  employeesToAdd = employeesToAdd.filter(e => officeIds.includes(e.office_id));
}
if (departmentIds?.length) {
  employeesToAdd = employeesToAdd.filter(e => departmentIds.includes(e.department_id));
}
if (projectIds?.length) {
  const projectEmployees = await getEmployeesInProjects(projectIds);
  const projectEmployeeIds = new Set(projectEmployees.map(e => e.id));
  employeesToAdd = employeesToAdd.filter(e => projectEmployeeIds.has(e.id));
}
```

### Phase 3: UI Component Updates

#### 3.1 Redesign `AccessScopeSelector`
**File:** `src/components/chat/AccessScopeSelector.tsx`

Major changes:
- Replace single-select RadioGroup with 3 options (Company-wide, Custom, Members)
- Add checkboxes for Office, Department, Project under "Custom"
- Fetch departments list from database
- Pass all selected criteria up to parent
- Show dynamic AND logic explanation text

**New Props Interface:**
```typescript
interface AccessScopeSelectorProps {
  value: AccessScope;
  onChange: (scope: AccessScope) => void;
  // Multi-criteria selections (for 'custom' scope)
  selectedOfficeIds: string[];
  onOfficeIdsChange: (ids: string[]) => void;
  selectedDepartmentIds: string[];  // NEW
  onDepartmentIdsChange: (ids: string[]) => void;  // NEW
  selectedProjectIds: string[];
  onProjectIdsChange: (ids: string[]) => void;
  // Member selection (for 'members' scope)
  selectedMemberIds: string[];
  onMemberIdsChange: (ids: string[]) => void;
  currentEmployeeId?: string;
}
```

#### 3.2 Update `CreateSpaceDialog`
**File:** `src/components/chat/CreateSpaceDialog.tsx`

- Add `selectedDepartmentIds` state
- Move "Add All Members" and "Auto-sync" from footer to body (new MEMBERSHIP OPTIONS section)
- Increase dialog width: `sm:max-w-2xl`
- Pass department IDs to `useCreateSpace`
- Update validation for custom scope

#### 3.3 Update `SpaceSettingsDialog`
**File:** `src/components/chat/SpaceSettingsDialog.tsx`

- Display current access criteria (read-only)
- Move Auto-sync to MEMBERSHIP OPTIONS section
- Increase dialog width

#### 3.4 Update `ChatHeader`
**File:** `src/components/chat/ChatHeader.tsx`

Update the access group label logic:
```typescript
const getAccessGroupLabel = () => {
  if (!space) return null;
  if (space.access_scope === 'company') return 'Everyone';
  if (space.access_scope === 'members') return 'Private';
  
  // For 'custom' scope, combine all criteria
  const parts: string[] = [];
  if (space.offices?.length) parts.push(...space.offices.map(o => o.name));
  if (space.departments?.length) parts.push(...space.departments.map(d => d.name));
  if (space.projects?.length) parts.push(...space.projects.map(p => p.name));
  
  if (parts.length === 0) return 'Private';
  if (parts.length <= 2) return parts.join(' + ');
  return `${parts.length} criteria`;
};
```

### Phase 4: Auto-Sync Logic Update

#### 4.1 Update sync preview calculation
**File:** `src/components/chat/SpaceSettingsDialog.tsx`

Update `scopedEmployees` query to apply AND logic across all criteria:
```typescript
let query = supabase.from('employees').select(...);

// Apply AND filters
if (space.offices?.length) {
  query = query.in('office_id', space.offices.map(o => o.id));
}
if (space.departments?.length) {
  query = query.in('department_id', space.departments.map(d => d.id));
}
// For projects, need separate query + intersection
```

---

## Files to Modify/Create

| File | Changes |
|------|---------|
| **Database Migration** | Create `chat_space_departments` table, add 'custom' to access_scope enum |
| `src/types/chat.ts` | Add `departments` to `ChatSpace` interface |
| `src/components/chat/AccessScopeSelector.tsx` | Complete redesign with checkbox-based multi-criteria selection |
| `src/components/chat/CreateSpaceDialog.tsx` | Add department state, move membership options, widen dialog |
| `src/components/chat/SpaceSettingsDialog.tsx` | Show access criteria (read-only), move auto-sync section |
| `src/components/chat/ChatHeader.tsx` | Update label for multi-criteria display |
| `src/services/useChat.ts` | Update `useSpace` to fetch departments, update `useCreateSpace` with AND logic |

---

## Edge Cases Handled

1. **No criteria selected in Custom mode**: Require at least one criterion
2. **Zero matching employees**: Show warning before creating space
3. **Employee changes department/project**: Auto-sync will add/remove on next sync
4. **Legacy spaces with old access_scope**: Continue to work, displayed as single criterion
5. **Exempt roles (Owner/Admin/HR)**: Always manually manageable regardless of criteria

---

## Technical Notes

### AND Logic for Member Filtering
```typescript
// Example: Engineering department + Agentcis project
const engineeringEmployees = employees.filter(e => e.department_id === 'eng-id');
const agentcisEmployees = await getProjectMembers('agentcis-id');
const eligibleMembers = engineeringEmployees.filter(e => 
  agentcisEmployees.some(pe => pe.id === e.id)
);
// Only employees in BOTH Engineering AND Agentcis are eligible
```

### Backward Compatibility
- Existing spaces with `access_scope = 'offices'` or `'projects'` will continue to work
- They will be displayed as single-criterion spaces
- No migration of existing data required

