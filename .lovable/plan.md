
# System Event Logs for Spaces

## Overview
Add system event logging to Spaces (similar to group chats) to track and display member changes, admin role changes, space name changes, and space photo changes.

---

## Current State Analysis

### What Works (Group Chats)
| Action | Logs System Event? | Where |
|--------|-------------------|-------|
| Add member to group | Yes | `useAddGroupMembers` |
| Remove member from group | Yes | `useRemoveGroupMember` |
| Member leaves group | Yes | `useLeaveConversation` |
| Promote to admin | Yes | `useUpdateGroupMemberRole` |
| Demote from admin | Yes | `useUpdateGroupMemberRole` |
| Change group name | Yes | `ChatHeader.tsx` |
| Change group photo | Yes | `ChatHeader.tsx` |

### What's Missing (Spaces)
| Action | Logs System Event? | Where |
|--------|-------------------|-------|
| Add member to space | **No** | `useAddSpaceMembers` |
| Remove member from space | **No** | `useRemoveSpaceMember` |
| Member leaves space | **No** | `useLeaveSpace` |
| Promote to admin | **No** | `useUpdateSpaceMemberRole` |
| Demote from admin | **No** | `useUpdateSpaceMemberRole` |
| Change space name | **No** | `useUpdateSpace` |
| Change space photo | **No** | `useUpdateSpace` |

---

## Implementation Plan

### Part 1: Update Types to Support Space Events

**File:** `src/types/chat.ts`

Expand the `SystemEventData` event types to include space-specific events:

```tsx
// Current
event_type: 'member_added' | 'member_removed' | 'member_left' | 'admin_added' | 'admin_removed' | 'group_name_changed' | 'group_photo_changed';

// New (add space variants)
event_type: 
  | 'member_added' 
  | 'member_removed' 
  | 'member_left' 
  | 'admin_added' 
  | 'admin_removed' 
  | 'group_name_changed' 
  | 'group_photo_changed'
  | 'space_name_changed'
  | 'space_photo_changed';
```

---

### Part 2: Update SystemEventMessage Component

**File:** `src/components/chat/SystemEventMessage.tsx`

Add new event configurations for space-specific events:

```tsx
const eventConfig = {
  // ... existing configs ...
  
  space_name_changed: {
    icon: Pencil,
    getText: (data: SystemEventData) => 
      data.old_value 
        ? `${data.actor_name} changed the space name from "${data.old_value}" to "${data.new_value}"`
        : `${data.actor_name} changed the space name to "${data.new_value}"`,
    className: "text-blue-600 dark:text-blue-400",
  },
  space_photo_changed: {
    icon: Camera,
    getText: (data: SystemEventData) => 
      `${data.actor_name} updated the space photo`,
    className: "text-blue-600 dark:text-blue-400",
  },
};
```

---

### Part 3: Add System Events to Space Member Operations

**File:** `src/services/useChat.ts`

#### 3A. `useAddSpaceMembers` (lines 1512-1544)
Update to accept employee names and log system events:

```tsx
export const useAddSpaceMembers = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({
      spaceId,
      employeeIds,
      employeeNames, // NEW parameter
    }: {
      spaceId: string;
      employeeIds: string[];
      employeeNames?: string[]; // Optional for backwards compatibility
    }) => {
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error('Not authenticated');

      // Insert members
      const members = employeeIds.map((empId) => ({
        space_id: spaceId,
        employee_id: empId,
        organization_id: currentOrg.id,
        role: 'member' as const,
      }));

      const { error } = await supabase
        .from('chat_space_members')
        .insert(members);

      if (error) throw error;

      // Log system events if names provided
      if (employeeNames?.length) {
        const actorName = currentEmployee.profiles?.full_name || 'Someone';
        
        for (let i = 0; i < employeeIds.length; i++) {
          const empId = employeeIds[i];
          const empName = employeeNames[i] || 'Someone';

          await supabase.from('chat_messages').insert({
            organization_id: currentOrg.id,
            space_id: spaceId,
            sender_id: currentEmployee.id,
            content: `${empName} was added by ${actorName}`,
            content_type: 'system_event',
            system_event_data: {
              event_type: 'member_added',
              target_employee_id: empId,
              target_name: empName,
              actor_employee_id: currentEmployee.id,
              actor_name: actorName
            }
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-space-members'] });
      queryClient.invalidateQueries({ queryKey: ['chat-spaces'] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    },
  });
};
```

#### 3B. `useUpdateSpaceMemberRole` (lines 1547-1572)
Add employee name parameter and log admin role changes:

```tsx
export const useUpdateSpaceMemberRole = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({
      spaceId,
      employeeId,
      employeeName, // NEW parameter
      role,
    }: {
      spaceId: string;
      employeeId: string;
      employeeName?: string; // Optional for backwards compatibility
      role: 'admin' | 'member';
    }) => {
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('chat_space_members')
        .update({ role })
        .eq('space_id', spaceId)
        .eq('employee_id', employeeId);

      if (error) throw error;

      // Log system event for role change
      if (employeeName) {
        const eventType = role === 'admin' ? 'admin_added' : 'admin_removed';
        const actorName = currentEmployee.profiles?.full_name || 'Someone';

        await supabase.from('chat_messages').insert({
          organization_id: currentOrg.id,
          space_id: spaceId,
          sender_id: currentEmployee.id,
          content: role === 'admin' 
            ? `${employeeName} was made an admin`
            : `${employeeName} is no longer an admin`,
          content_type: 'system_event',
          system_event_data: {
            event_type: eventType,
            target_employee_id: employeeId,
            target_name: employeeName,
            actor_employee_id: currentEmployee.id,
            actor_name: actorName
          }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-space-members'] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    },
  });
};
```

#### 3C. `useRemoveSpaceMember` (lines 1575-1599)
Add employee name parameter and log removal:

```tsx
export const useRemoveSpaceMember = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({
      spaceId,
      employeeId,
      employeeName, // NEW parameter
    }: {
      spaceId: string;
      employeeId: string;
      employeeName?: string; // Optional for backwards compatibility
    }) => {
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error('Not authenticated');

      // Log system event before delete (if name provided)
      if (employeeName) {
        const actorName = currentEmployee.profiles?.full_name || 'Someone';

        await supabase.from('chat_messages').insert({
          organization_id: currentOrg.id,
          space_id: spaceId,
          sender_id: currentEmployee.id,
          content: `${employeeName} was removed by ${actorName}`,
          content_type: 'system_event',
          system_event_data: {
            event_type: 'member_removed',
            target_employee_id: employeeId,
            target_name: employeeName,
            actor_employee_id: currentEmployee.id,
            actor_name: actorName
          }
        });
      }

      const { error } = await supabase
        .from('chat_space_members')
        .delete()
        .eq('space_id', spaceId)
        .eq('employee_id', employeeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-space-members'] });
      queryClient.invalidateQueries({ queryKey: ['chat-spaces'] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    },
  });
};
```

#### 3D. `useLeaveSpace` (lines 2040-2062)
Log when a member leaves:

```tsx
export const useLeaveSpace = () => {
  const queryClient = useQueryClient();
  const { data: currentEmployee } = useCurrentEmployee();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async (spaceId: string) => {
      if (!currentEmployee?.id || !currentOrg?.id) throw new Error('Not authenticated');

      const leavingEmployeeName = currentEmployee.profiles?.full_name || 'Someone';

      // Log system event for leaving
      await supabase.from('chat_messages').insert({
        organization_id: currentOrg.id,
        space_id: spaceId,
        sender_id: currentEmployee.id,
        content: `${leavingEmployeeName} left the space`,
        content_type: 'system_event',
        system_event_data: {
          event_type: 'member_left',
          target_employee_id: currentEmployee.id,
          target_name: leavingEmployeeName
        }
      });

      const { error } = await supabase
        .from('chat_space_members')
        .delete()
        .eq('space_id', spaceId)
        .eq('employee_id', currentEmployee.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-spaces', currentOrg?.id] });
      queryClient.invalidateQueries({ queryKey: ['chat-space-members'] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    },
  });
};
```

#### 3E. `useUpdateSpace` (lines 1306-1347)
Log name and photo changes:

```tsx
export const useUpdateSpace = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({
      spaceId,
      name,
      description,
      spaceType,
      iconUrl,
      autoSyncMembers,
      oldName,      // NEW: for logging name changes
      oldIconUrl,   // NEW: for logging photo changes
    }: {
      spaceId: string;
      name?: string;
      description?: string | null;
      spaceType?: 'collaboration' | 'announcements';
      iconUrl?: string | null;
      autoSyncMembers?: boolean;
      oldName?: string;
      oldIconUrl?: string | null;
    }) => {
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error('Not authenticated');

      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (spaceType !== undefined) updateData.space_type = spaceType;
      if (iconUrl !== undefined) updateData.icon_url = iconUrl;
      if (autoSyncMembers !== undefined) updateData.auto_sync_members = autoSyncMembers;

      const { error } = await supabase
        .from('chat_spaces')
        .update(updateData)
        .eq('id', spaceId);

      if (error) throw error;

      const actorName = currentEmployee.profiles?.full_name || 'Someone';

      // Log name change
      if (name !== undefined && oldName !== undefined && name !== oldName) {
        await supabase.from('chat_messages').insert({
          organization_id: currentOrg.id,
          space_id: spaceId,
          sender_id: currentEmployee.id,
          content: `${actorName} changed the space name`,
          content_type: 'system_event',
          system_event_data: {
            event_type: 'space_name_changed',
            target_employee_id: currentEmployee.id,
            target_name: actorName,
            actor_employee_id: currentEmployee.id,
            actor_name: actorName,
            old_value: oldName,
            new_value: name
          }
        });
      }

      // Log photo change
      if (iconUrl !== undefined && oldIconUrl !== iconUrl) {
        await supabase.from('chat_messages').insert({
          organization_id: currentOrg.id,
          space_id: spaceId,
          sender_id: currentEmployee.id,
          content: `${actorName} updated the space photo`,
          content_type: 'system_event',
          system_event_data: {
            event_type: 'space_photo_changed',
            target_employee_id: currentEmployee.id,
            target_name: actorName,
            actor_employee_id: currentEmployee.id,
            actor_name: actorName
          }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-spaces'] });
      queryClient.invalidateQueries({ queryKey: ['chat-space'] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    },
  });
};
```

---

### Part 4: Update Call Sites to Pass Employee Names

**File:** `src/components/chat/SpaceMembersDialog.tsx`

Update the `handlePromote`, `handleDemote`, and `handleRemove` functions to pass employee names:

```tsx
// handlePromote
await updateRole.mutateAsync({
  spaceId,
  employeeId: member.employee_id,
  employeeName: member.employee?.profiles?.full_name, // ADD
  role: 'admin'
});

// handleDemote  
await updateRole.mutateAsync({
  spaceId,
  employeeId: member.employee_id,
  employeeName: member.employee?.profiles?.full_name, // ADD
  role: 'member'
});

// handleRemove
await removeMember.mutateAsync({
  spaceId,
  employeeId: member.employee_id,
  employeeName: member.employee?.profiles?.full_name // ADD
});
```

**File:** `src/components/chat/AddSpaceMembersDialog.tsx`

Update to pass employee names when adding members.

**File:** `src/components/chat/SpaceSettingsDialog.tsx`

Update `handleSave` to pass old values for name/photo change logging:

```tsx
await updateSpace.mutateAsync({
  spaceId,
  name: name.trim(),
  description: description.trim() || null,
  spaceType,
  autoSyncMembers,
  oldName: space?.name, // ADD for logging
});
```

**File:** `src/components/chat/ChatRightPanelEnhanced.tsx`

Update role change and member removal calls to pass employee names.

---

## Summary of Changes

| File | Type | Description |
|------|------|-------------|
| `src/types/chat.ts` | Modify | Add `space_name_changed` and `space_photo_changed` event types |
| `src/components/chat/SystemEventMessage.tsx` | Modify | Add event configs for space name/photo changes |
| `src/services/useChat.ts` | Modify | Add system event logging to `useAddSpaceMembers`, `useUpdateSpaceMemberRole`, `useRemoveSpaceMember`, `useLeaveSpace`, and `useUpdateSpace` |
| `src/components/chat/SpaceMembersDialog.tsx` | Modify | Pass employee names to mutation calls |
| `src/components/chat/AddSpaceMembersDialog.tsx` | Modify | Pass employee names when adding members |
| `src/components/chat/SpaceSettingsDialog.tsx` | Modify | Pass old name for change logging |
| `src/components/chat/ChatRightPanelEnhanced.tsx` | Modify | Pass employee names to role/removal mutations |

---

## System Event Messages Display

The existing `ConversationView.tsx` already handles displaying `system_event` messages for both conversations and spaces (line 832-840):

```tsx
if (message.content_type === 'system_event' && message.system_event_data) {
  return (
    <SystemEventMessage
      key={message.id}
      eventData={message.system_event_data}
      timestamp={message.created_at}
    />
  );
}
```

No changes needed - once system events are logged to spaces, they will automatically display.

---

## Expected Result

After implementation, Space channels will show system event logs like:
- "John Smith was added by Jane Doe" (member added)
- "John Smith was removed by Jane Doe" (member removed)  
- "John Smith left the space" (member left)
- "John Smith was made an admin" (admin promoted)
- "John Smith is no longer an admin" (admin demoted)
- "Jane Doe changed the space name from 'Old Name' to 'New Name'" (name changed)
- "Jane Doe updated the space photo" (photo changed)
