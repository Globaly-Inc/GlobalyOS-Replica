

# Prevent Duplicate Individual Chats & Filter Spaces by Membership

## Overview

Three fixes are needed:
1. Update `NewChatDialog` to check for existing 1:1 conversations and navigate to them instead of creating duplicates
2. Update `useSpaces` hook to only return spaces where the current user is a member
3. Apply the same filtering to both desktop (`ChatSidebar`) and mobile (`MobileChatHome`)

---

## Issue Analysis

### Issue 1: Duplicate Individual Chats
**Current behavior:** `NewChatDialog` always creates a new conversation, even when one exists with the same person.

**Expected behavior:** When selecting a single team member:
- Check if a 1:1 conversation already exists with that person
- If yes, navigate to existing conversation
- If no, create a new conversation

**Reference:** `ChatSidebar.handleStartDM()` already has this logic (lines 280-312)

### Issue 2: Spaces Visible Without Membership
**Current behavior:** `useSpaces()` returns all non-archived spaces in the organization.

**Expected behavior:** Only return spaces where the current user is a member (exists in `chat_space_members`).

---

## Implementation Plan

### Part 1: Fix NewChatDialog - Check Existing Conversations

**File:** `src/components/chat/NewChatDialog.tsx`

Add a check for existing conversations before creating a new one:

```tsx
// Add useConversations to imports
import { useCreateConversation, useConversations } from "@/services/useChat";

// Get existing conversations
const { data: conversations = [] } = useConversations();

const handleCreate = async () => {
  if (selectedEmployees.length === 0) {
    toast.error("Please select at least one person");
    return;
  }

  try {
    setIsUploading(true);
    const isGroup = selectedEmployees.length > 1;
    
    // FOR 1:1 CHATS: Check if conversation already exists
    if (!isGroup) {
      const targetEmployeeId = selectedEmployees[0];
      const existingConv = conversations.find(conv => {
        if (conv.is_group) return false;
        return conv.participants?.some(p => p.employee_id === targetEmployeeId);
      });

      if (existingConv) {
        // Navigate to existing conversation instead of creating new
        const otherParticipant = existingConv.participants?.find(
          p => p.employee_id !== currentEmployee?.id
        );
        const name = otherParticipant?.employee?.profiles?.full_name || "Chat";
        
        onChatCreated({
          type: 'conversation',
          id: existingConv.id,
          name,
          isGroup: false,
        });
        
        // Reset and close
        setSelectedEmployees([]);
        setSearchQuery("");
        onOpenChange(false);
        toast.info("Opened existing conversation");
        return;
      }
    }

    // ... rest of existing create logic for new conversations ...
  }
};
```

---

### Part 2: Filter Spaces by Membership

**File:** `src/services/useChat.ts`

Update `useSpaces` hook to filter by current employee membership:

```tsx
export const useSpaces = (includeArchived = false) => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();  // ADD THIS

  return useQuery({
    queryKey: ['chat-spaces', currentOrg?.id, currentEmployee?.id, includeArchived],  // Add employee to key
    queryFn: async () => {
      if (!currentOrg?.id || !currentEmployee?.id) return [];  // Also check employee

      let query = supabase
        .from('chat_spaces')
        .select(`
          *,
          chat_space_members!inner (
            id,
            employee_id,
            role
          )
        `)
        .eq('organization_id', currentOrg.id)
        .eq('chat_space_members.employee_id', currentEmployee.id);  // ADD: Filter by membership

      // Filter out archived spaces unless explicitly requested
      if (!includeArchived) {
        query = query.is('archived_at', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((space: any) => ({
        ...space,
        member_count: space.chat_space_members?.length || 0
      })) as ChatSpace[];
    },
    enabled: !!currentOrg?.id && !!currentEmployee?.id,  // Require employee
  });
};
```

**Key change:** Using `!inner` join ensures only spaces where the employee is a member are returned.

---

### Part 3: MobileChatHome - Already Uses useSpaces

**File:** `src/components/chat/MobileChatHome.tsx`

No changes needed - it already uses `useSpaces()` which will automatically be filtered after Part 2.

---

### Part 4: ChatSidebar - Already Uses useSpaces

**File:** `src/components/chat/ChatSidebar.tsx`

No changes needed - it already uses `useSpaces()` which will automatically be filtered after Part 2.

---

### Part 5: Update BrowseSpacesDialog (if needed)

The `BrowseSpacesDialog` may need to use a different hook if it's meant to show ALL joinable spaces (not just member spaces). Let me verify:

If `BrowseSpacesDialog` is for discovering and joining new spaces, it should continue to show all public spaces. We may need to create a separate `useAllSpaces()` hook or add a parameter:

```tsx
// Option A: Add parameter to useSpaces
export const useSpaces = (includeArchived = false, membersOnly = true) => {
  // If membersOnly = false, don't filter by membership
}

// Option B: Create separate hook
export const useAllPublicSpaces = () => {
  // Returns all public spaces for browsing
}
```

This depends on how `BrowseSpacesDialog` currently works.

---

## Summary of Changes

| File | Type | Description |
|------|------|-------------|
| `src/components/chat/NewChatDialog.tsx` | Modify | Add existing conversation check for 1:1 chats, navigate instead of create |
| `src/services/useChat.ts` | Modify | Update `useSpaces` to filter by current employee membership using inner join |

---

## Technical Notes

- **Query optimization:** Using `!inner` join in Supabase is efficient as it filters at database level
- **Query key update:** Adding `currentEmployee?.id` to the query key ensures cache invalidation when user changes
- **Toast feedback:** Using `toast.info()` to notify user they're being redirected to existing conversation
- **Backward compatibility:** Group chats still create as normal; only 1:1 chats are deduplicated

