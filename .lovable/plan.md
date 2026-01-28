
# Inactive Team Members: Complete Exclusion from Chat Features

## Overview
Implement comprehensive filtering to exclude inactive team members from all chat-related features, including automatic removal from existing groups and spaces when a team member becomes inactive.

---

## Current State Analysis

### Existing Filtering
| Component | Filters Inactive? | Notes |
|-----------|-------------------|-------|
| `NewChatDialog.tsx` | **No** | Uses `useEmployees()` with no status filter |
| `AddGroupMembersDialog.tsx` | **Yes** | Already filters `.eq('status', 'active')` |
| `AccessScopeSelector.tsx` | **Yes** | Already filters `.eq('status', 'active')` |
| Auto-sync triggers (DB) | **Partial** | Removes from auto-sync spaces but NOT from conversations/groups |

### Missing Features
1. `NewChatDialog.tsx` shows all employees including inactive
2. No trigger to remove inactive members from **chat conversations/groups**
3. Existing auto-sync trigger only handles spaces, not group chats

---

## Implementation Plan

### Part 1: Filter Inactive Members in NewChatDialog

**File:** `src/components/chat/NewChatDialog.tsx`

Currently uses `useEmployees()` without status filtering. Need to filter to only show active employees.

**Change (line 56):**
```tsx
// Before
const filteredEmployees = employees.filter(emp => {
  if (emp.id === currentEmployee?.id) return false;
  const name = emp.profiles?.full_name || "";
  const email = emp.profiles?.email || "";
  return (
    name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.toLowerCase().includes(searchQuery.toLowerCase())
  );
});

// After
const filteredEmployees = employees.filter(emp => {
  // Exclude current user and inactive employees
  if (emp.id === currentEmployee?.id) return false;
  if (emp.status !== 'active') return false;
  
  const name = emp.profiles?.full_name || "";
  const email = emp.profiles?.email || "";
  return (
    name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.toLowerCase().includes(searchQuery.toLowerCase())
  );
});
```

---

### Part 2: Database Trigger to Remove Inactive Members from All Chat

**New Migration:** Add a comprehensive trigger that removes inactive employees from:
1. **Chat conversations** (group chats via `chat_participants` table)
2. **Chat spaces** (already partially handled, but ensure complete coverage)

#### Migration SQL
```sql
-- Function: Remove employee from all chat when made inactive
CREATE OR REPLACE FUNCTION remove_inactive_from_all_chat()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes from active to inactive
  IF OLD.status = 'active' AND NEW.status = 'inactive' THEN
    
    -- 1. Remove from all chat conversations (group chats)
    DELETE FROM chat_participants
    WHERE employee_id = NEW.id
      AND organization_id = NEW.organization_id;
    
    -- 2. Remove from all chat spaces (including non-auto-sync spaces)
    DELETE FROM chat_space_members
    WHERE employee_id = NEW.id
      AND organization_id = NEW.organization_id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_remove_inactive_from_all_chat ON employees;
CREATE TRIGGER trigger_remove_inactive_from_all_chat
  AFTER UPDATE OF status ON employees
  FOR EACH ROW
  EXECUTE FUNCTION remove_inactive_from_all_chat();
```

---

### Part 3: One-Time Data Cleanup

**Migration:** Remove all currently inactive employees from chat memberships.

```sql
-- Remove inactive employees from chat conversations (groups)
DELETE FROM chat_participants cp
USING employees e
WHERE cp.employee_id = e.id
  AND e.status = 'inactive';

-- Remove inactive employees from chat spaces
DELETE FROM chat_space_members csm
USING employees e
WHERE csm.employee_id = e.id
  AND e.status = 'inactive';
```

---

### Part 4: Update Existing Auto-Sync Functions

The existing `sync_company_space_members()` function already handles removal from auto-sync spaces. The new trigger will handle ALL spaces and conversations, but we should ensure no conflicts.

**Note:** The new trigger specifically handles the status change, while the existing function handles both add (when becoming active) and remove (when becoming inactive). The new trigger will execute first and clean up everything, so both can coexist.

---

## Summary of Changes

| File/Location | Type | Description |
|---------------|------|-------------|
| `src/components/chat/NewChatDialog.tsx` | Modify | Add `emp.status !== 'active'` filter to exclude inactive employees |
| New migration | Create | Add `remove_inactive_from_all_chat()` function and trigger |
| New migration | Create | One-time cleanup of existing inactive members from chat |

---

## Verification Points

After implementation, verify:
1. New Chat dialog only shows active team members
2. Add Group Members dialog only shows active team members (already working)
3. Access Scope Selector only shows active team members (already working)
4. When a team member is made inactive:
   - They are removed from all chat conversations/groups
   - They are removed from all chat spaces
5. Existing inactive members are cleaned up from all chat memberships

---

## Technical Notes

- The trigger uses `SECURITY DEFINER` to ensure it can delete records regardless of RLS policies
- The cleanup migration runs once to fix existing data
- No changes needed to `AddGroupMembersDialog.tsx` or `AccessScopeSelector.tsx` as they already filter by `status = 'active'`
- The trigger fires `AFTER UPDATE OF status` to ensure it only runs when status changes
