

# Fix: Restrict Posting in Announcement Spaces to Admins Only

## Problem Summary

In announcement spaces (like "GH Announcements"), any space member can currently post messages. The expected behavior is that only space admins should be allowed to post, while regular members should see a disabled compose section with a clear message.

## Current Behavior

- Sarah Smith (non-admin member) was able to send a message in "GH Announcements"
- The `MessageComposer` component is rendered for all users regardless of space type or role

## Solution

Implement a two-layer fix:

1. **Frontend**: Conditionally render the composer based on space type and user role
2. **Database**: Add RLS policy to enforce admin-only posting in announcement spaces (defense-in-depth)

---

## Changes Required

### Part 1: Frontend - Conditional Composer Rendering

**File:** `src/components/chat/ConversationView.tsx`

Add logic to determine if the user can post in the current context:

```typescript
// After line 234 where isSpaceAdmin is defined:
const isAnnouncementSpace = space?.space_type === 'announcements';
const canPostInSpace = !isAnnouncementSpace || isSpaceAdmin;
```

Then modify the MessageComposer section (lines 900-907) to conditionally render:

```typescript
{/* Message Composer with safe area and bottom nav clearance */}
<div className="pb-16 md:pb-0 safe-area-bottom">
  {spaceId && isAnnouncementSpace && !isSpaceAdmin ? (
    // Disabled state for non-admins in announcement spaces
    <div className="border-t border-border bg-muted/30 px-4 py-4">
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Megaphone className="h-4 w-4" />
        <span>Only space admins can post announcements</span>
      </div>
    </div>
  ) : (
    <MessageComposer 
      ref={composerRef}
      conversationId={conversationId}
      spaceId={spaceId}
    />
  )}
</div>
```

Also add the `Megaphone` icon to imports at the top of the file.

---

### Part 2: Database - RLS Policy Enhancement (Defense-in-Depth)

**Migration:** Add a check to the `chat_messages` INSERT policy to verify admin role for announcement spaces

Create a helper function to check if posting is allowed:

```sql
-- Create helper function to check if user can post in a space
CREATE OR REPLACE FUNCTION can_post_in_space(p_space_id uuid, p_employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM chat_spaces cs
    LEFT JOIN chat_space_members csm ON csm.space_id = cs.id AND csm.employee_id = p_employee_id
    WHERE cs.id = p_space_id
    AND (
      -- Collaboration spaces: any member can post
      cs.space_type = 'collaboration'
      OR
      -- Announcement spaces: only admins can post
      (cs.space_type = 'announcements' AND csm.role = 'admin')
    )
  );
$$;
```

Then update the INSERT policy:

```sql
DROP POLICY IF EXISTS "chat_messages_insert" ON chat_messages;

CREATE POLICY "chat_messages_insert" ON chat_messages
FOR INSERT
WITH CHECK (
  is_org_member(auth.uid(), organization_id) 
  AND sender_id = get_current_employee_id_for_org(organization_id)
  AND (
    -- Conversations: must be a participant
    (conversation_id IS NOT NULL AND is_conversation_participant(conversation_id, get_current_employee_id_for_org(organization_id)))
    OR 
    -- Spaces: must be a member AND have permission to post (admin for announcements)
    (space_id IS NOT NULL AND is_space_member(space_id, get_current_employee_id_for_org(organization_id)) AND can_post_in_space(space_id, get_current_employee_id_for_org(organization_id)))
  )
);
```

---

## Summary of Changes

| File/Resource | Type | Description |
|---------------|------|-------------|
| `src/components/chat/ConversationView.tsx` | Modify | Add conditional rendering for MessageComposer based on space type and admin role |
| Database migration | Add | Create `can_post_in_space` helper function |
| Database migration | Modify | Update `chat_messages_insert` RLS policy to enforce admin-only posting in announcement spaces |

---

## After This Fix

1. Non-admin members viewing an announcement space will see: "Only space admins can post announcements" instead of the compose box
2. Space admins will continue to see the normal composer
3. Even if a malicious user bypasses the UI, the database will reject the INSERT operation
4. Collaboration spaces remain unaffected - all members can post

