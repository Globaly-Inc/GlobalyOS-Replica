

## Enforce Unique Names for Spaces and Group Chats

### Problem
Users can create Spaces and Group Chats with duplicate names, leading to confusion. Names should be unique across both spaces and group conversations within an organization.

### Changes

**1. `src/components/chat/CreateSpaceDialog.tsx`** — Add uniqueness validation before creating a space
- In the `validateForm` function (or in `handleCreate` before calling the mutation), query both `chat_spaces` (non-archived, same org) and `chat_conversations` (where `is_group = true`, same org) to check if the trimmed name already exists (case-insensitive)
- Show a toast error like "A space or group with this name already exists" if a match is found

**2. `src/components/chat/NewChatDialog.tsx`** — Add uniqueness validation before creating a group chat
- In `handleCreate`, when `isGroup` is true and `groupName` is provided, query both `chat_spaces` and `chat_conversations` (group only) for the same org to check for duplicate names
- Show a toast error if a match is found and prevent creation

**3. `src/components/chat/EditGroupChatDialog.tsx`** — Add uniqueness validation when renaming a group
- Before saving the updated name, run the same cross-table uniqueness check (excluding the current conversation's own ID)

**4. `src/components/chat/SpaceSettingsDialog.tsx`** — Add uniqueness validation when renaming a space
- Before saving the updated name, run the same cross-table uniqueness check (excluding the current space's own ID)

### Technical Detail
Each validation will perform two quick queries:
```typescript
// Check spaces
const { data: existingSpace } = await supabase
  .from('chat_spaces')
  .select('id')
  .eq('organization_id', orgId)
  .ilike('name', name.trim())
  .is('archived_at', null)
  .limit(1);

// Check group conversations
const { data: existingGroup } = await supabase
  .from('chat_conversations')
  .select('id')
  .eq('organization_id', orgId)
  .eq('is_group', true)
  .ilike('name', name.trim())
  .limit(1);

if (existingSpace?.length || existingGroup?.length) {
  toast.error("A space or group with this name already exists");
  return;
}
```

For edit dialogs, an additional `.neq('id', currentId)` filter excludes the item being edited.

