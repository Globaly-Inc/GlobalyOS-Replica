

# Restrict Group Editing to Admins and Add Change Logs

## Overview

Restrict the ability to edit group name and photo to group admins only, and add system event logs when these changes are made (similar to member change logs).

---

## Changes Required

### 1. Extend SystemEventData Type

**File: `src/types/chat.ts`**

Add new event types for group changes:

```typescript
// Line 99 - Update the event_type union
export interface SystemEventData {
  event_type: 
    | 'member_added' 
    | 'member_removed' 
    | 'member_left' 
    | 'admin_added' 
    | 'admin_removed'
    | 'group_name_changed'    // NEW
    | 'group_photo_changed';  // NEW
  target_employee_id: string;
  target_name: string;
  actor_employee_id?: string;
  actor_name?: string;
  old_value?: string;  // NEW - for storing previous name
  new_value?: string;  // NEW - for storing new name
}
```

---

### 2. Update SystemEventMessage Component

**File: `src/components/chat/SystemEventMessage.tsx`**

Add new event configurations for group changes:

```typescript
const eventConfig = {
  // ... existing events ...
  
  group_name_changed: {
    icon: Pencil,  // Import from lucide-react
    getText: (data: SystemEventData) => 
      data.old_value 
        ? `${data.actor_name} changed the group name from "${data.old_value}" to "${data.new_value}"`
        : `${data.actor_name} changed the group name to "${data.new_value}"`,
    className: "text-blue-600 dark:text-blue-400",
  },
  group_photo_changed: {
    icon: Camera,  // Import from lucide-react
    getText: (data: SystemEventData) => 
      `${data.actor_name} updated the group photo`,
    className: "text-blue-600 dark:text-blue-400",
  },
};
```

---

### 3. Update ChatHeader.tsx to Check Admin Role

**File: `src/components/chat/ChatHeader.tsx`**

**3a. Add isGroupAdmin check (after line 78):**

```typescript
// Check if current user is a group admin
const currentGroupMembership = conversationParticipants.find(
  p => p.employee_id === currentEmployee?.id
);
const isGroupAdmin = activeChat.isGroup && currentGroupMembership?.role === 'admin';
```

**3b. Update handleSaveGroupName to log changes (lines 116-136):**

Add logging before the toast and add admin check:

```typescript
const handleSaveGroupName = async () => {
  if (!conversationId || editNameValue.trim() === groupName) {
    setIsEditingName(false);
    return;
  }
  
  // Admin check
  if (!isGroupAdmin) {
    toast.error("Only group admins can change the group name");
    setIsEditingName(false);
    return;
  }
  
  setIsSavingName(true);
  const previousName = groupName;
  
  try {
    await updateConversation.mutateAsync({
      conversationId,
      name: editNameValue.trim()
    });
    
    // Log the change as a system event
    const actorName = currentEmployee?.profiles?.full_name || 'Someone';
    await supabase.from('chat_messages').insert({
      organization_id: currentOrg.id,
      conversation_id: conversationId,
      sender_id: currentEmployee.id,
      content: `${actorName} changed the group name`,
      content_type: 'system_event',
      system_event_data: {
        event_type: 'group_name_changed',
        target_employee_id: currentEmployee.id,
        target_name: actorName,
        actor_employee_id: currentEmployee.id,
        actor_name: actorName,
        old_value: previousName,
        new_value: editNameValue.trim()
      }
    });
    
    setGroupName(editNameValue.trim());
    toast.success("Group name updated");
  } catch (error) {
    toast.error("Failed to update group name");
  } finally {
    setIsSavingName(false);
    setIsEditingName(false);
  }
};
```

**3c. Update handlePhotoSelect to log changes (lines 144-186):**

Add admin check and logging:

```typescript
const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file || !currentOrg?.id || !conversationId) return;

  // Admin check
  if (!isGroupAdmin) {
    toast.error("Only group admins can change the group photo");
    return;
  }

  // ... existing validation code ...

  setIsUploadingPhoto(true);
  try {
    // ... existing upload code ...

    await updateConversation.mutateAsync({
      conversationId,
      iconUrl: publicUrl
    });

    // Log the change as a system event
    const actorName = currentEmployee?.profiles?.full_name || 'Someone';
    await supabase.from('chat_messages').insert({
      organization_id: currentOrg.id,
      conversation_id: conversationId,
      sender_id: currentEmployee.id,
      content: `${actorName} updated the group photo`,
      content_type: 'system_event',
      system_event_data: {
        event_type: 'group_photo_changed',
        target_employee_id: currentEmployee.id,
        target_name: actorName,
        actor_employee_id: currentEmployee.id,
        actor_name: actorName
      }
    });

    setGroupIconUrl(publicUrl);
    toast.success("Group photo updated");
  } catch (error) {
    toast.error("Failed to update group photo");
  } finally {
    // ... existing cleanup ...
  }
};
```

**3d. Hide edit UI for non-admins (lines 312-345, 360-415):**

Wrap the photo upload hover overlay to only show for admins:

```tsx
// Photo section (line 322-344) - only show camera overlay for admins
<div 
  className={cn(
    "relative h-10 w-10 rounded-full flex-shrink-0",
    isGroupAdmin ? "cursor-pointer group" : ""
  )}
  onClick={() => isGroupAdmin && !isUploadingPhoto && fileInputRef.current?.click()}
>
  {/* Avatar content */}
  {isGroupAdmin && (
    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
      {isUploadingPhoto ? (
        <Loader2 className="h-4 w-4 text-white animate-spin" />
      ) : (
        <Camera className="h-4 w-4 text-white" />
      )}
    </div>
  )}
</div>
```

For name section (lines 360-415), only show pencil icon and allow editing for admins:

```tsx
{isGroupAdmin ? (
  // Editable view for admins
  <div 
    className="cursor-pointer"
    onClick={() => {
      setEditNameValue(groupName);
      setIsEditingName(true);
    }}
  >
    <h2 className="font-semibold text-foreground text-base flex items-center gap-1 truncate">
      {groupName}
      <Pencil className="h-3 w-3 text-muted-foreground flex-shrink-0 opacity-0 group-hover/name:opacity-100 transition-opacity" />
    </h2>
  </div>
) : (
  // Read-only view for non-admins
  <h2 className="font-semibold text-foreground text-base truncate">
    {groupName}
  </h2>
)}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/types/chat.ts` | Add `group_name_changed` and `group_photo_changed` event types, add `old_value`/`new_value` fields |
| `src/components/chat/SystemEventMessage.tsx` | Add event configurations for new event types with Pencil/Camera icons |
| `src/components/chat/ChatHeader.tsx` | Add isGroupAdmin check, hide edit UI for non-admins, add logging for name/photo changes |

---

## Visual Result

**For Group Admins:**
- Can hover over group photo to see camera overlay and update it
- Can click group name to edit it inline with pencil icon shown on hover
- Changes are logged in conversation

**For Regular Members:**
- Group photo shows without hover effect (non-clickable)
- Group name displays without pencil icon (non-editable)
- Can see the system event logs when admins make changes

**System Event Log Examples:**

```text
+-------------------------------------------------------+
| [Pencil] John changed the group name from             |
|          "Team Alpha" to "Team Beta"  · 2:30 PM       |
+-------------------------------------------------------+

+-------------------------------------------------------+
| [Camera] Sarah updated the group photo  · 2:35 PM     |
+-------------------------------------------------------+
```

