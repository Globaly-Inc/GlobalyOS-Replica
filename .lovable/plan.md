
# Plan: Fix Spaces Functionality and Improve UI/UX

## Problem Summary

The Spaces feature is broken because of a **critical database issue**: the `is_org_admin_or_owner` function references `e.role` on the `employees` table, but this column doesn't exist. User roles are stored in the `organization_members` table instead. This causes all RLS policies for `chat_spaces` to fail with error `"column e.role does not exist"`.

**Evidence from network logs:**
```
Status: 400
Response: {"code":"42703","message":"column e.role does not exist"}
```

---

## Root Cause Analysis

| Component | Issue |
|-----------|-------|
| `is_org_admin_or_owner()` function | References `e.role IN ('owner', 'admin')` on `employees` table |
| `employees` table | Has NO `role` column - roles are in `organization_members` |
| `chat_spaces` RLS policies | All depend on the broken function, causing SELECT/UPDATE/DELETE to fail |

The spaces data exists in the database:
- "GlobalyOS" (access_scope: projects)
- "Development" (access_scope: members)  
- "Agentcis All" (access_scope: projects)
- "GlobalyOS" (access_scope: members)

---

## Fix Plan

### Phase 1: Database Fix (Critical)

**1.1 Fix `is_org_admin_or_owner` function**

Update the function to correctly query the `organization_members` table:

```sql
CREATE OR REPLACE FUNCTION public.is_org_admin_or_owner(
  p_org_id uuid, 
  p_employee_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get user_id from employee
  SELECT user_id INTO v_user_id
  FROM employees
  WHERE id = p_employee_id
    AND organization_id = p_org_id;

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check role in organization_members
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = v_user_id
      AND organization_id = p_org_id
      AND role IN ('owner', 'admin')
  );
END;
$$;
```

**1.2 Verify RLS policies work correctly after fix**

---

### Phase 2: Code Quality Improvements

**2.1 Error Handling Enhancement**

In `useSpaces` hook, add proper error handling to show user-friendly messages:

```typescript
// In useSpaces hook - add error handling
const { data: spaces = [], isLoading, error } = useSpaces();

// In ChatSidebar - show error state
{error && (
  <div className="text-sm text-destructive px-2">
    Failed to load spaces
  </div>
)}
```

**2.2 Remove Redundant RLS Policy**

The policy `"Org members can create spaces"` appears to be a duplicate of `chat_spaces_insert`. One should be removed to avoid confusion:

```sql
DROP POLICY IF EXISTS "Org members can create spaces" ON chat_spaces;
```

---

### Phase 3: UI/UX Improvements

**3.1 Loading States**

Add skeleton loaders for spaces list instead of text "Loading...":

```tsx
{loadingSpaces ? (
  <div className="space-y-1 px-2">
    {[1, 2, 3].map(i => (
      <div key={i} className="h-8 bg-muted/50 rounded-md animate-pulse" />
    ))}
  </div>
) : /* ... */}
```

**3.2 Empty State Enhancement**

Replace plain text with a more engaging empty state:

```tsx
{spaces.length === 0 && !loadingSpaces && (
  <div className="flex flex-col items-center py-4 text-center">
    <Hash className="h-8 w-8 text-muted-foreground/50 mb-2" />
    <p className="text-sm text-muted-foreground">No spaces yet</p>
    <Button variant="link" size="sm" onClick={onNewSpace}>
      Create your first space
    </Button>
  </div>
)}
```

**3.3 Space Icons Display**

Currently spaces with custom icons don't show them in the sidebar. Add icon support:

```tsx
{space.icon_url ? (
  <img 
    src={space.icon_url} 
    alt="" 
    className="h-4 w-4 rounded flex-shrink-0" 
  />
) : (
  <Hash className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
)}
```

**3.4 Space Type Indicator**

Show collaboration vs announcements type with a subtle badge:

```tsx
{space.space_type === 'announcements' && (
  <Megaphone className="h-3 w-3 text-muted-foreground" />
)}
```

---

### Phase 4: Feature Improvements

**4.1 Space Access Scope Display**

Show what access scope a space has (company/offices/projects/members) in the sidebar on hover or in the right panel.

**4.2 Quick Actions Enhancement**

Current quick actions only show for admins. Add a "Leave space" option for regular members:

```tsx
{!canManage && (
  <DropdownMenuItem onClick={() => handleLeaveSpace(space.id)}>
    <LogOut className="h-4 w-4 mr-2" />
    Leave space
  </DropdownMenuItem>
)}
```

**4.3 Search Spaces in Sidebar**

For organizations with many spaces, add a quick filter/search within the Spaces section.

**4.4 Recent Activity Indicator**

Show a subtle indicator for spaces with recent activity (beyond just unread count).

---

## Files to Modify

| File | Changes |
|------|---------|
| Database function `is_org_admin_or_owner` | Fix to use `organization_members` table |
| `src/components/chat/ChatSidebar.tsx` | Loading skeletons, empty state, space icons, error handling |
| `src/services/useChat.ts` | Ensure `useSpaces` returns proper error state |
| RLS policies on `chat_spaces` | Remove duplicate policy |

---

## Technical Details

### Current Broken Function
```sql
-- BROKEN: employees.role doesn't exist
SELECT 1 FROM employees e
WHERE e.id = p_employee_id
  AND e.organization_id = p_org_id
  AND e.role IN ('owner', 'admin')
```

### Fixed Function
```sql
-- CORRECT: uses organization_members table
SELECT 1 FROM organization_members
WHERE user_id = (SELECT user_id FROM employees WHERE id = p_employee_id)
  AND organization_id = p_org_id
  AND role IN ('owner', 'admin')
```

---

## Expected Outcome

After implementing this plan:

1. All existing spaces (including "GlobalyOS") will appear in the sidebar
2. Users can create, join, and manage spaces without errors
3. RLS policies will correctly enforce access control
4. UI will have better loading states, empty states, and visual feedback
5. Space icons and types will be properly displayed
