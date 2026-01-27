
# Inline Group Name Editing and Photo Change on Hover

## Overview

Update the `ChatHeader.tsx` component to:
1. Hide the pencil icon until the group name area is hovered
2. Allow inline editing of the group name when clicked (instead of opening a dialog)
3. Enable changing group photo by clicking on the avatar (hover shows camera icon)

---

## Visual Design

```text
Normal State:
+------------------------------------------------------------------+
| [Group Photo]  Test Group                    [bell] [star] [search]
|               Sarah, John, Mary
+------------------------------------------------------------------+

Hover over name area:
+------------------------------------------------------------------+
| [Group Photo]  Test Group ✏️                [bell] [star] [search]
|               Sarah, John, Mary
+------------------------------------------------------------------+

Click on name (inline editing):
+------------------------------------------------------------------+
| [Group Photo]  [Test Group____] ✓ ✗        [bell] [star] [search]
|               Sarah, John, Mary
+------------------------------------------------------------------+

Hover over photo:
+------------------------------------------------------------------+
| [Photo+Camera] Test Group                   [bell] [star] [search]
|    overlay    Sarah, John, Mary
+------------------------------------------------------------------+
```

---

## Implementation

### File: `src/components/chat/ChatHeader.tsx`

#### 1. Add new state variables

```typescript
const [isEditingName, setIsEditingName] = useState(false);
const [editNameValue, setEditNameValue] = useState(groupName);
const [isSavingName, setIsSavingName] = useState(false);
const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
const fileInputRef = useRef<HTMLInputElement>(null);
```

#### 2. Import additional hooks and components

```typescript
import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Check, X, Loader2 } from "lucide-react";
import { useUpdateConversation } from "@/services/useChat";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
```

#### 3. Add inline name save handler

```typescript
const handleSaveGroupName = async () => {
  if (!conversationId || editNameValue === groupName) {
    setIsEditingName(false);
    return;
  }
  
  setIsSavingName(true);
  try {
    await updateConversation.mutateAsync({
      conversationId,
      name: editNameValue
    });
    setGroupName(editNameValue);
    toast.success("Group name updated");
  } catch (error) {
    toast.error("Failed to update group name");
  } finally {
    setIsSavingName(false);
    setIsEditingName(false);
  }
};

const handleCancelEdit = () => {
  setEditNameValue(groupName);
  setIsEditingName(false);
};
```

#### 4. Add direct photo upload handler

```typescript
const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file || !currentOrg?.id || !conversationId) return;

  // Validate file
  if (file.size > 5 * 1024 * 1024) {
    toast.error("Image must be less than 5MB");
    return;
  }
  if (!file.type.startsWith("image/")) {
    toast.error("Please select an image file");
    return;
  }

  setIsUploadingPhoto(true);
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${currentOrg.id}/group-icons/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('chat-attachments')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(filePath);

    await updateConversation.mutateAsync({
      conversationId,
      iconUrl: publicUrl
    });

    setGroupIconUrl(publicUrl);
    toast.success("Group photo updated");
  } catch (error) {
    toast.error("Failed to update group photo");
  } finally {
    setIsUploadingPhoto(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }
};
```

#### 5. Update group photo section (lines 224-244)

Replace the current div that opens the dialog with a file input trigger:

```tsx
{/* Hidden file input */}
<input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  className="hidden"
  onChange={handlePhotoSelect}
/>

<div 
  className="relative h-10 w-10 rounded-full cursor-pointer group flex-shrink-0"
  onClick={() => !isUploadingPhoto && fileInputRef.current?.click()}
>
  {groupIconUrl ? (
    <img 
      src={groupIconUrl} 
      alt={groupName} 
      className="h-full w-full rounded-full object-cover"
    />
  ) : (
    <div className="flex items-center justify-center h-full w-full rounded-full bg-primary/10 text-primary font-semibold text-sm">
      {getInitials(groupName || "GC")}
    </div>
  )}
  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
    {isUploadingPhoto ? (
      <Loader2 className="h-4 w-4 text-white animate-spin" />
    ) : (
      <Camera className="h-4 w-4 text-white" />
    )}
  </div>
</div>
```

#### 6. Update group name section (lines 257-274)

Replace the current div with inline editing support:

```tsx
{activeChat.type === 'conversation' && activeChat.isGroup ? (
  // Group chat info with inline editing
  <div className="group">
    {isEditingName ? (
      // Editing mode
      <div className="flex items-center gap-1.5">
        <Input
          value={editNameValue}
          onChange={(e) => setEditNameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSaveGroupName();
            if (e.key === 'Escape') handleCancelEdit();
          }}
          className="h-7 text-base font-semibold py-0 px-2"
          autoFocus
        />
        <button
          onClick={handleSaveGroupName}
          disabled={isSavingName}
          className="p-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isSavingName ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
        </button>
        <button
          onClick={handleCancelEdit}
          disabled={isSavingName}
          className="p-1 rounded bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    ) : (
      // Display mode
      <div 
        className="cursor-pointer"
        onClick={() => {
          setEditNameValue(groupName);
          setIsEditingName(true);
        }}
      >
        <h2 className="font-semibold text-foreground text-base flex items-center gap-1 truncate">
          {groupName}
          <Pencil className="h-3 w-3 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </h2>
      </div>
    )}
    <p className="text-xs text-muted-foreground truncate">
      {conversationParticipants
        .filter(p => p.employee_id !== currentEmployee?.id)
        .map(p => p.employee?.profiles?.full_name?.split(' ')[0])
        .filter(Boolean)
        .join(', ') || 'Group members'}
    </p>
  </div>
) : ...
```

#### 7. Remove EditGroupChatDialog usage for quick edits

The dialog can still be kept for member management via the right panel, but the header now handles name and photo changes directly.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/chat/ChatHeader.tsx` | Add inline editing for group name with hover-to-show pencil icon, direct photo upload on avatar click |

---

## Behavior Summary

| Element | Normal | Hover | Click |
|---------|--------|-------|-------|
| Group Name | Shows name only | Pencil icon appears | Switches to input field with check/X buttons |
| Group Photo | Shows photo/initials | Camera overlay appears | Opens file picker for direct upload |

---

## Technical Notes

1. **Pencil Icon Visibility**: Uses `opacity-0 group-hover:opacity-100 transition-opacity` classes on the Pencil icon

2. **Inline Editing Pattern**: Similar to `EditableField.tsx` but simplified for the header context

3. **Direct Photo Upload**: Bypasses the dialog for photo changes - clicks on avatar directly triggers file picker

4. **Keyboard Support**: 
   - `Enter` saves the name
   - `Escape` cancels editing

5. **Loading States**: Both name saving and photo upload show loading spinners during async operations
