

## Plan: Fix Chat Scroll — Root Cause Analysis and Proper Fix

### Root Causes Identified

**1. Chat switch doesn't reset scroll tracking**
In `VirtualizedMessageList.tsx` line 405, `initialScrollDoneRef` resets when `groupedMessages === undefined`. But React Query caches data, so when switching chats the old messages briefly remain — the ref never resets, so the initial scroll-to-bottom for the new chat never fires.

**2. Send message causes full refetch → scroll reset**
In `useMessageMutations.ts` line 126-138, `onSettled` removes temp messages then calls `invalidateQueries` for `chat-messages`. This triggers a full refetch that replaces the cache, causing react-window to re-render with new item references, losing scroll position. The realtime handler in `ConversationView.tsx` also does cache manipulation for the same message — creating a race.

**3. scrollToRow with dynamic heights is unreliable on first call**
react-window v2's `scrollToRow` with `useDynamicRowHeight` needs rows to be measured first. On initial render, row heights aren't measured yet, so `scrollToRow({ index: last, align: 'end' })` scrolls to an estimated position that's often wrong.

### Changes

**1. `VirtualizedMessageList.tsx` — Fix initial scroll reset and reliable bottom-anchoring**

- Reset `initialScrollDoneRef` based on a **conversation/space key prop** instead of checking `groupedMessages === undefined`. Add a `chatKey` prop (the conversation or space ID).
- Use a **double-`requestAnimationFrame`** pattern for initial scroll to ensure react-window has measured at least one render cycle before scrolling.
- After initial scroll, add a `setTimeout(scrollToBottom, 100)` fallback to handle dynamic height measurement delays.
- Always auto-scroll on new messages (per user preference: always jump for both own and others' messages).
- Track `isAtBottom` with a wider threshold (150px instead of 100px) to be more forgiving.

**2. `useMessageMutations.ts` — Stop full refetch after sending**

- In `onSettled`: remove `invalidateQueries` for `chat-messages`. The realtime handler in `ConversationView.tsx` already handles merging the real message into cache via delta sync. The invalidation is redundant and destructive.
- Keep invalidation for `chat-conversations` and `chat-spaces` (sidebar updates).

**3. `ConversationView.tsx` — Pass chatKey and simplify realtime handler**

- Pass `chatKey={conversationId || spaceId}` to `VirtualizedMessageList`.
- In the realtime INSERT handler (line 391-456): after merging new messages, call `virtualizedListRef.current?.scrollToBottom()` to ensure auto-scroll for incoming messages.

**4. `ScrollToBottom.tsx` — No changes needed** (animation already works)

### Technical Details

```text
Current flow (broken):
  Switch chat → React Query returns cached data → initialScrollDoneRef still true
  → scroll-to-bottom never fires → user sees middle of chat

  Send msg → optimistic add → onSettled invalidates → full refetch
  → new cache reference → react-window re-renders → scroll resets

Fixed flow:
  Switch chat → chatKey changes → initialScrollDoneRef reset to false
  → double-rAF scroll to bottom fires → user sees latest messages

  Send msg → optimistic add → realtime merges real msg → no refetch
  → cache updated in-place → scroll stays at bottom
```

### Files to Edit

| File | Change |
|------|--------|
| `VirtualizedMessageList.tsx` | Add `chatKey` prop, fix reset logic, double-rAF scroll, always auto-scroll |
| `ConversationView.tsx` | Pass `chatKey`, scroll on new messages from realtime |
| `useMessageMutations.ts` | Remove `invalidateQueries` for `chat-messages` in `onSettled` |

