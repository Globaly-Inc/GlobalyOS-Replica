# Plan: Restrict Social Feed Post Visibility by Office Affiliation and Role

## Status: ✅ Completed

## Overview

This change restricts which offices regular team members can post to in the social feed. Members can only post to:
- **Everyone** (company-wide)
- **Their own office** (if assigned)

While **Owner, Admin, and HR** roles retain full access to post to any office in the organization.

---

## Implementation Summary

### Files Modified

| File | Changes |
|------|---------|
| `src/components/feed/PostVisibilitySelector.tsx` | Added `currentEmployeeOfficeId` and `canPostToAllOffices` props; filters available offices and scope options based on permissions |
| `src/components/feed/InlinePostComposer.tsx` | Added `useUserRole` hook; passes `currentEmployeeOfficeId` and `canPostToAllOffices={isHR}` to selector |
| `src/components/feed/CreatePostModal.tsx` | Added `useUserRole` and `useCurrentEmployee` hooks; passes same props to selector |

### Key Logic

```typescript
// Filter offices based on permissions
const availableOffices = useMemo(() => {
  if (canPostToAllOffices) {
    return offices; // Owner/Admin/HR see all offices
  }
  if (currentEmployeeOfficeId) {
    return offices.filter(o => o.id === currentEmployeeOfficeId);
  }
  return []; // No office assigned = can't post to specific offices
}, [offices, canPostToAllOffices, currentEmployeeOfficeId]);

// Filter scope options based on available offices
const availableScopeOptions = useMemo(() => {
  return SCOPE_OPTIONS.filter(option => {
    if (option.value === 'offices') {
      return availableOffices.length > 0;
    }
    return true;
  });
}, [availableOffices]);
```

---

## Behavior

| User Role | Office Visibility Options |
|-----------|---------------------------|
| Regular member (no office) | Everyone, Departments, Projects only |
| Regular member (with office) | Everyone, their own office, Departments, Projects |
| Owner/Admin/HR | All offices, all visibility options |
