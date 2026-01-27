
# Fix Missing System Event Logs for Group Member Management

## Problem Identified

The system event logging feature was implemented in the `useChat.ts` service hooks, but **`EditGroupChatDialog.tsx` bypasses these hooks** by directly inserting/deleting from the `chat_participants` table. This means:

- Member additions via the Edit Group dialog are not logged
- Member removals via the Edit Group dialog are not logged

Only actions performed through `ChatRightPanelEnhanced.tsx` (which uses the proper hooks) create system event logs.

---

## Current State vs Expected

| Action | Via ChatRightPanel | Via EditGroupDialog |
|--------|-------------------|---------------------|
| Add member | Logs event | No log (bug) |
| Remove member | Logs event | No log (bug) |
| Make admin | Logs event | N/A |
| Leave group | Logs event | N/A |

---

## Solution

Update `EditGroupChatDialog.tsx` to use the centralized hooks from `useChat.ts` instead of direct database operations.

### File: `src/components/chat/EditGroupChatDialog.tsx`

**Changes required:**

1. Import the hooks:
```typescript
import { 
  useUpdateConversation, 
  useConversationParticipants,
  useAddGroupMembers,
  useRemoveGroupMember
} from "@/services/useChat";
```

2. Initialize the hooks:
```typescript
const addGroupMembers = useAddGroupMembers();
const removeGroupMember = useRemoveGroupMember();
```

3. Update `handleAddMember` (lines 122-150):
```typescript
const handleAddMember = async (employeeId: string) => {
  const employee = employees.find(e => e.id === employeeId);
  const employeeName = employee?.profiles?.full_name || 'Unknown';
  
  try {
    setAddingMember(employeeId);
    
    await addGroupMembers.mutateAsync({
      conversationId,
      employeeIds: [employeeId],
      employeeNames: [employeeName]
    });

    toast.success("Member added");
  } catch (error) {
    showErrorToast(error, "Failed to add member", {
      componentName: "EditGroupChatDialog",
      actionAttempted: "Add group member",
      errorType: "database",
    });
  } finally {
    setAddingMember(null);
  }
};
```

4. Update `handleRemoveMember` (lines 152-176):
```typescript
const handleRemoveMember = async (employeeId: string) => {
  const participant = participants.find(p => p.employee_id === employeeId);
  const employeeName = participant?.employee?.profiles?.full_name || 'Unknown';
  
  try {
    setRemovingMember(employeeId);
    
    await removeGroupMember.mutateAsync({
      conversationId,
      employeeId,
      employeeName
    });

    toast.success("Member removed");
  } catch (error) {
    showErrorToast(error, "Failed to remove member", {
      componentName: "EditGroupChatDialog",
      actionAttempted: "Remove group member",
      errorType: "database",
    });
  } finally {
    setRemovingMember(null);
  }
};
```

5. Remove direct Supabase imports no longer needed:
   - Remove direct `supabase.from('chat_participants')` calls
   - Remove `useQueryClient` if no longer used elsewhere

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/chat/EditGroupChatDialog.tsx` | Use `useAddGroupMembers` and `useRemoveGroupMember` hooks instead of direct DB operations |

---

## Result

After this change:
- All member additions (from any UI) will create "X was added by Y" system event logs
- All member removals (from any UI) will create "X was removed by Y" system event logs
- The chat conversation view will display these events inline with messages

---

## Technical Note

This is a **single-source-of-truth** fix. By routing all member management through the hooks in `useChat.ts`, we ensure:
1. Consistent behavior across all UIs
2. Proper query invalidation
3. System event logging for all actions
4. Easier maintenance (business logic in one place)
