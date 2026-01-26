

## Plan: Fix Content Loading Delay for Sent Messages with Attachments

### Problem Analysis

When a user sends a message with attachments (image, video, PDF), there's a noticeable delay before the content appears. The issue is a race condition in the real-time subscription handling:

**Current Flow (Problematic):**
1. User sends message with attachments
2. Optimistic update adds message WITH attachments to cache - appears immediately
3. Real-time INSERT event fires for the message
4. Code removes ALL temp messages (including the one with attachments)
5. Adds real message with `attachments: []` (empty!)
6. Real-time INSERT event for attachments fires later
7. Attachments finally appear

The gap between steps 5 and 7 is when the user sees their message without the attachments.

---

### Solution

Modify the real-time message INSERT handler in `ConversationView.tsx` to preserve attachment data when replacing optimistic messages for the current user's own messages.

**Key Changes:**

#### 1. Preserve Attachments from Optimistic Message

In `src/components/chat/ConversationView.tsx` (lines 408-448), when processing an INSERT event for the current user's own message:
- Find the optimistic message that's being replaced
- Carry over its attachments to the real message

**Current code (lines 408-448):**
```typescript
if (newMessage.sender_id === currentEmployee?.id) {
  // Just remove temp messages and let the real one through
  queryClient.setQueryData<ChatMessage[]>(
    ['chat-messages', conversationId, spaceId],
    (old) => old?.filter(m => !m.id.startsWith('temp-')) || []
  );
}
// ... then adds message with attachments: []
```

**New code:**
```typescript
if (newMessage.sender_id === currentEmployee?.id) {
  // Get optimistic attachments before removing temp message
  const previousMessages = queryClient.getQueryData<ChatMessage[]>(
    ['chat-messages', conversationId, spaceId]
  );
  const optimisticMessage = previousMessages?.find(m => m.id.startsWith('temp-'));
  const optimisticAttachments = optimisticMessage?.attachments || [];
  
  // Remove temp messages
  queryClient.setQueryData<ChatMessage[]>(
    ['chat-messages', conversationId, spaceId],
    (old) => old?.filter(m => !m.id.startsWith('temp-')) || []
  );
  
  // Later when adding the real message, use optimisticAttachments
  // instead of []
}
```

Then in the merge step (lines 437-448), use the preserved attachments:
```typescript
queryClient.setQueryData<ChatMessage[]>(
  ['chat-messages', conversationId, spaceId],
  (old) => {
    if (!old) return [{ ...newMessage, sender: senderData, attachments: optimisticAttachments }];
    const exists = old.some(m => m.id === newMessage.id);
    if (exists) return old;
    const filtered = old.filter(m => !m.id.startsWith('temp-'));
    return [...filtered, { ...newMessage, sender: senderData, attachments: optimisticAttachments }];
  }
);
```

#### 2. Also Fetch Attachments for Own Messages

As a backup, when the INSERT event is for the current user's message, also fetch attachments from the database to ensure they display correctly:

```typescript
// Fetch attachments for own messages immediately
let attachmentsData: ChatAttachment[] = [];
if (newMessage.sender_id === currentEmployee?.id) {
  const { data } = await supabase
    .from('chat_attachments')
    .select('*')
    .eq('message_id', newMessage.id);
  attachmentsData = data || [];
}
```

Then use `attachmentsData.length > 0 ? attachmentsData : optimisticAttachments` when adding the message.

---

### Summary of Changes

| File | Change |
|------|--------|
| `src/components/chat/ConversationView.tsx` | Preserve optimistic attachments when replacing temp messages; fetch attachments for own messages as backup |

---

### Technical Notes

1. **Race condition mitigation**: By preserving optimistic attachments, we ensure the UI never shows an empty state
2. **Backup fetch**: Fetching attachments for own messages ensures correctness even if optimistic data is stale
3. **No UI flicker**: The attachments will transition smoothly from optimistic to real data
4. **Existing realtime attachment handler**: The existing attachment INSERT handler (lines 496-506) will still work as a safety net to add any missing attachments

---

### Expected Result

After this change:
- User sends a message with attachments
- Message appears IMMEDIATELY with attachments visible
- When real-time events process, attachments remain visible (no disappear/reappear)
- Content loading feels instant

