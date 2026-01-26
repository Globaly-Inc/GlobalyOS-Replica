

# Plan: Restrict Social Feed Post Visibility by Office Affiliation and Role

## Overview

This change restricts which offices regular team members can post to in the social feed. Members can only post to:
- **Everyone** (company-wide)
- **Their own office** (if assigned)

While **Owner, Admin, and HR** roles retain full access to post to any office in the organization.

---

## Current Behavior

The `PostVisibilitySelector` component currently:
1. Fetches ALL offices from the organization
2. Allows any user to select any office for post visibility
3. Has no role-based or office-based restrictions

---

## Technical Changes

### 1. Update `PostVisibilitySelector.tsx`

**New Props:**
```typescript
interface PostVisibilitySelectorProps {
  // ... existing props
  currentEmployeeOfficeId?: string | null;  // Current user's office
  canPostToAllOffices?: boolean;            // true for owner/admin/hr
}
```

**Changes:**
1. Add new props for `currentEmployeeOfficeId` and `canPostToAllOffices`
2. Filter the office list based on permissions:
   - If `canPostToAllOffices` is true → show all offices
   - Otherwise → only show the employee's own office (if they have one)
3. If user has no office and isn't owner/admin/hr, hide the "Specific Offices" scope option entirely

**Filtered Office Logic:**
```typescript
const availableOffices = useMemo(() => {
  if (canPostToAllOffices) {
    return offices; // All offices for privileged roles
  }
  // Regular members: only their own office
  if (currentEmployeeOfficeId) {
    return offices.filter(o => o.id === currentEmployeeOfficeId);
  }
  return []; // No office assigned = can't post to specific offices
}, [offices, canPostToAllOffices, currentEmployeeOfficeId]);
```

**Scope Options Filtering:**
```typescript
// Only show "Specific Offices" option if user has offices they can post to
const availableScopeOptions = SCOPE_OPTIONS.filter(option => {
  if (option.value === 'offices') {
    return availableOffices.length > 0;
  }
  return true;
});
```

---

### 2. Update `InlinePostComposer.tsx`

**Changes:**
1. Import `useUserRole` hook
2. Pass current employee's `office_id` and role-based permission to `PostVisibilitySelector`

```typescript
import { useUserRole } from '@/hooks/useUserRole';

// Inside component:
const { isHR } = useUserRole(); // isHR includes owner, admin, and hr

// In render:
<PostVisibilitySelector
  accessScope={accessScope}
  onAccessScopeChange={setAccessScope}
  selectedOfficeIds={selectedOfficeIds}
  onOfficeIdsChange={setSelectedOfficeIds}
  selectedDepartments={selectedDepartments}
  onDepartmentsChange={setSelectedDepartments}
  selectedProjectIds={selectedProjectIds}
  onProjectIdsChange={setSelectedProjectIds}
  currentEmployeeOfficeId={currentEmployee?.office_id}
  canPostToAllOffices={isHR}
/>
```

---

### 3. Update `CreatePostModal.tsx`

**Changes:**
1. Import `useUserRole` hook and `useCurrentEmployee` hook
2. Pass the same props to `PostVisibilitySelector`

```typescript
import { useUserRole } from '@/hooks/useUserRole';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';

// Inside component:
const { data: currentEmployee } = useCurrentEmployee();
const { isHR } = useUserRole();

// In render:
<PostVisibilitySelector
  accessScope={accessScope}
  onAccessScopeChange={setAccessScope}
  selectedOfficeIds={selectedOfficeIds}
  onOfficeIdsChange={setSelectedOfficeIds}
  selectedDepartments={selectedDepartments}
  onDepartmentsChange={setSelectedDepartments}
  selectedProjectIds={selectedProjectIds}
  onProjectIdsChange={setSelectedProjectIds}
  currentEmployeeOfficeId={currentEmployee?.office_id}
  canPostToAllOffices={isHR}
/>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/feed/PostVisibilitySelector.tsx` | Add new props, filter offices and scope options based on permissions |
| `src/components/feed/InlinePostComposer.tsx` | Pass `currentEmployeeOfficeId` and `canPostToAllOffices` props |
| `src/components/feed/CreatePostModal.tsx` | Pass `currentEmployeeOfficeId` and `canPostToAllOffices` props |

---

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| Regular member with no office assigned | "Specific Offices" option hidden; can only post to Everyone, Departments, or Projects |
| Regular member with office assigned | Can post to Everyone, their own office, Departments, or Projects |
| Owner/Admin/HR | Full access to all offices, departments, and projects |
| User selects "Specific Offices" then their permissions change | If they lose access, the selection will be validated on submission |

---

## User Experience

### For Regular Team Members:
- Visibility selector shows "Everyone" as default
- "Specific Offices" option only appears if they have an office assigned
- When selecting "Specific Offices", only their own office is available

### For Owner/Admin/HR:
- Full access to all visibility options
- Can select any combination of offices
- No restrictions on posting scope

---

## Role Hierarchy Reference

The `useUserRole` hook provides `isHR` which returns `true` for:
- `owner`
- `admin`
- `hr`

This covers all privileged roles that should have unrestricted posting access.

