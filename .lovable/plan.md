
# Implement Group Admins for Chat Conversations

## Overview

Add admin functionality to group conversations, mirroring the existing space admin system. Group admins can manage members, update group settings, and control admin privileges.

---

## Database Schema Changes

### 1. Add `role` column to `chat_participants` table

```sql
ALTER TABLE chat_participants 
ADD COLUMN role text NOT NULL DEFAULT 'member';
```

### 2. Create trigger to auto-assign creator as admin

```sql
CREATE OR REPLACE FUNCTION auto_add_conversation_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Only for group conversations
  IF NEW.is_group = true THEN
    -- Update the creator's participant record to admin role
    -- (creator is added in the same transaction by useCreateConversation)
    UPDATE public.chat_participants
    SET role = 'admin'
    WHERE conversation_id = NEW.id
    AND employee_id = NEW.created_by;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_set_group_creator_admin
  AFTER INSERT ON public.chat_conversations
  FOR EACH ROW
  WHEN (NEW.is_group = true)
  EXECUTE FUNCTION auto_add_conversation_creator_as_admin();
```

**Note**: Since participants are inserted after the conversation in `useCreateConversation`, we'll handle this in the frontend mutation or use a deferred trigger approach.

---

## TypeScript Type Updates

### File: `src/types/chat.ts`

Update `ChatParticipant` interface:

```typescript
export interface ChatParticipant {
  id: string;
  conversation_id: string;
  employee_id: string;
  organization_id: string;
  joined_at: string;
  last_read_at: string | null;
  is_muted: boolean;
  role: 'admin' | 'member';  // NEW
  employee?: { ... };
}
```

---

## Service Hooks (useChat.ts)

### 1. Update `useCreateConversation` to set creator as admin

Modify the participant insertion to set `role: 'admin'` for the creator:

```typescript
const allParticipants = [...new Set([currentEmployee.id, ...participantIds])];
const { error: partError } = await supabase
  .from('chat_participants')
  .insert(
    allParticipants.map(empId => ({
      conversation_id: conversation.id,
      employee_id: empId,
      organization_id: currentOrg.id,
      role: empId === currentEmployee.id && isGroup ? 'admin' : 'member'  // Creator is admin
    }))
  );
```

### 2. Add `useUpdateGroupMemberRole` hook

```typescript
export const useUpdateGroupMemberRole = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      employeeId, 
      role 
    }: { 
      conversationId: string; 
      employeeId: string; 
      role: 'admin' | 'member' 
    }) => {
      const { error } = await supabase
        .from('chat_participants')
        .update({ role })
        .eq('conversation_id', conversationId)
        .eq('employee_id', employeeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversation-participants'] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    },
  });
};
```

### 3. Add `useRemoveGroupMember` hook

```typescript
export const useRemoveGroupMember = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  
  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      employeeId 
    }: { 
      conversationId: string; 
      employeeId: string 
    }) => {
      const { error } = await supabase
        .from('chat_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('employee_id', employeeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversation-participants'] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations', currentOrg?.id] });
    },
  });
};
```

### 4. Add `useAddGroupMembers` hook

```typescript
export const useAddGroupMembers = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  
  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      employeeIds 
    }: { 
      conversationId: string; 
      employeeIds: string[] 
    }) => {
      if (!currentOrg?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('chat_participants')
        .insert(
          employeeIds.map(empId => ({
            conversation_id: conversationId,
            employee_id: empId,
            organization_id: currentOrg.id,
            role: 'member'
          }))
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversation-participants'] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations', currentOrg?.id] });
    },
  });
};
```

### 5. Update `useConversationParticipants` to include role

```typescript
export const useConversationParticipants = (conversationId: string | null) => {
  return useQuery({
    queryKey: ['chat-conversation-participants', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('chat_participants')
        .select(`
          *,
          employees:employee_id (
            id,
            user_id,
            position,
            profiles:user_id (
              full_name,
              avatar_url,
              email
            )
          )
        `)
        .eq('conversation_id', conversationId);

      if (error) throw error;

      return (data || []).map((p: any) => ({
        ...p,
        employee: p.employees
      })) as ChatParticipant[];
    },
    enabled: !!conversationId,
  });
};
```

### 6. Update `useLeaveConversation` with admin check

```typescript
export const useLeaveConversation = () => {
  const queryClient = useQueryClient();
  const { data: currentEmployee } = useCurrentEmployee();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      transferAdminTo 
    }: { 
      conversationId: string; 
      transferAdminTo?: string 
    }) => {
      if (!currentEmployee?.id) throw new Error('Not authenticated');

      // If transferring admin, update the new admin first
      if (transferAdminTo) {
        const { error: transferError } = await supabase
          .from('chat_participants')
          .update({ role: 'admin' })
          .eq('conversation_id', conversationId)
          .eq('employee_id', transferAdminTo);

        if (transferError) throw transferError;
      }

      // Then remove self
      const { error } = await supabase
        .from('chat_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('employee_id', currentEmployee.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversations', currentOrg?.id] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversation-participants'] });
    },
  });
};
```

---

## UI Updates

### File: `src/components/chat/ChatRightPanelEnhanced.tsx`

#### 1. Import new hooks

```typescript
import {
  // ... existing imports
  useUpdateGroupMemberRole,
  useRemoveGroupMember,
  useAddGroupMembers,
} from "@/services/useChat";
```

#### 2. Add group admin detection

```typescript
// Existing space admin check
const currentMembership = spaceMembers.find(m => m.employee_id === currentEmployee?.id);
const isSpaceAdmin = currentMembership?.role === 'admin';

// NEW: Group admin check
const currentGroupMembership = conversationParticipants.find(
  p => p.employee_id === currentEmployee?.id
);
const isGroupAdmin = activeChat.isGroup && currentGroupMembership?.role === 'admin';

// Combined admin check for UI
const canManageMembers = isSpaceAdmin || isGroupAdmin;

// Group admin counts (for leave logic)
const groupAdminCount = conversationParticipants.filter(p => p.role === 'admin').length;
const nonAdminGroupMembers = conversationParticipants.filter(
  p => p.role !== 'admin' && p.employee_id !== currentEmployee?.id
);
const canGroupAdminLeaveDirectly = groupAdminCount >= 2;
```

#### 3. Update member list dropdown (around line 656)

Change the condition from `isSpaceAdmin && !isSelf` to `canManageMembers && !isSelf`:

```typescript
{/* 3-dot menu - visible on hover for admins */}
{canManageMembers && !isSelf && (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
        <MoreVertical className="h-3.5 w-3.5" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="bg-popover border shadow-lg z-50">
      <DropdownMenuItem onClick={() => handleViewMember(member.employee_id)}>
        <UserCircle className="h-4 w-4 mr-2" />
        View Profile
      </DropdownMenuItem>
      
      {/* Admin actions - show for spaces OR groups */}
      {isAdmin ? (
        <DropdownMenuItem onClick={() => handleDemote(member)}>
          <UserMinus className="h-4 w-4 mr-2" />
          Remove Admin
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem onClick={() => handlePromote(member)}>
          <Crown className="h-4 w-4 mr-2" />
          Make Admin
        </DropdownMenuItem>
      )}
      <DropdownMenuItem 
        onClick={() => handleRemove(member)}
        className="text-destructive focus:text-destructive"
      >
        <UserMinus className="h-4 w-4 mr-2" />
        {spaceId ? "Remove from Space" : "Remove from Group"}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)}
```

#### 4. Update handler functions

Update promote/demote/remove handlers to work with both spaces and groups:

```typescript
const updateGroupRole = useUpdateGroupMemberRole();
const removeGroupMember = useRemoveGroupMember();

const handlePromote = async (member: any) => {
  const profile = member.employee?.profiles || member.employees?.profiles;
  try {
    if (spaceId) {
      await updateRole.mutateAsync({ spaceId, employeeId: member.employee_id, role: 'admin' });
    } else if (conversationId) {
      await updateGroupRole.mutateAsync({ conversationId, employeeId: member.employee_id, role: 'admin' });
    }
    toast.success(`${profile?.full_name || 'Member'} is now an admin`);
  } catch (error) {
    showErrorToast(error, "Failed to promote member");
  }
};

const handleDemote = async (member: any) => {
  const profile = member.employee?.profiles || member.employees?.profiles;
  try {
    if (spaceId) {
      await updateRole.mutateAsync({ spaceId, employeeId: member.employee_id, role: 'member' });
    } else if (conversationId) {
      await updateGroupRole.mutateAsync({ conversationId, employeeId: member.employee_id, role: 'member' });
    }
    toast.success(`${profile?.full_name || 'Member'} is now a regular member`);
  } catch (error) {
    showErrorToast(error, "Failed to change member role");
  }
};

const handleRemove = async (member: any) => {
  const profile = member.employee?.profiles || member.employees?.profiles;
  try {
    if (spaceId) {
      await removeMember.mutateAsync({ spaceId, employeeId: member.employee_id });
    } else if (conversationId) {
      await removeGroupMember.mutateAsync({ conversationId, employeeId: member.employee_id });
    }
    toast.success(`${profile?.full_name || 'Member'} has been removed`);
  } catch (error) {
    showErrorToast(error, "Failed to remove member");
  }
};
```

#### 5. Add "Add Members" button for group admins

Show the plus button in members section for group admins too:

```typescript
{(isSpaceAdmin || isGroupAdmin) && (
  <Button
    variant="ghost"
    size="icon"
    className="h-6 w-6"
    onClick={(e) => {
      e.stopPropagation();
      setShowAddMembersDialog(true);
    }}
  >
    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
  </Button>
)}
```

#### 6. Update leave group logic

Handle the case where a group admin needs to transfer admin before leaving:

```typescript
// In the leave confirmation dialog
const handleLeave = async () => {
  try {
    if (conversationId) {
      // If group admin and sole admin, must transfer first
      if (isGroupAdmin && !canGroupAdminLeaveDirectly) {
        // Show transfer dialog instead
        setShowTransferAdminDialog(true);
        return;
      }
      await leaveConversation.mutateAsync({ conversationId });
      onBack();
    } else if (spaceId) {
      // ... existing space logic
    }
    setShowLeaveConfirm(false);
  } catch (error) {
    showErrorToast(error, "Failed to leave chat");
  }
};
```

---

## New Component: AddGroupMembersDialog

### File: `src/components/chat/AddGroupMembersDialog.tsx`

Create a dialog similar to `AddSpaceMembersDialog` but for group conversations:

```typescript
interface AddGroupMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  existingMemberIds: string[];
}

const AddGroupMembersDialog = ({ ... }) => {
  // Similar to AddSpaceMembersDialog
  // Uses useAddGroupMembers hook
  // Filters out existing members from employee list
};
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| Database migration | Create | Add `role` column to `chat_participants` |
| `src/types/chat.ts` | Modify | Add `role` to `ChatParticipant` interface |
| `src/services/useChat.ts` | Modify | Add group admin hooks, update create/leave hooks |
| `src/components/chat/ChatRightPanelEnhanced.tsx` | Modify | Add group admin UI and handlers |
| `src/components/chat/AddGroupMembersDialog.tsx` | Create | Dialog to add members to group |
| `src/components/chat/GroupSettingsDialog.tsx` | Create | Dialog for group name/logo settings |
| `src/components/chat/TransferGroupAdminDialog.tsx` | Create | Dialog to transfer admin before leaving |

---

## Security Considerations

1. **RLS Policies**: Add policies to ensure only group admins can:
   - Update other participants' roles
   - Remove other participants
   - Update conversation name/icon

2. **Role validation**: Frontend validates admin status before showing actions, but backend RLS provides the real security
