

## Plan: Fix Chat Scroll-to-Bottom and Flicker Issues

### Root Cause

There are **two competing scroll systems** causing both bugs:

1. **`ConversationView`** wraps messages in a native scrollable `div` (line 751-753) with `overflow-y-auto`, managed by `useChatInfiniteScroll`
2. **`VirtualizedMessageList`** uses `react-window`'s `List` component which manages its own virtual scroll internally

The `scrollToBottom()` from `useChatInfiniteScroll` sets `scrollTop` on the outer div, but react-window doesn't respond to that — it has its own scroll position. This means:
- **Bug 1**: Initial load calls `scrollToBottom()` on the outer div, but the virtualized list renders at position 0 (top/middle), so the user sees messages in the middle
- **Bug 2**: After sending a message, the realtime handler swaps temp messages for real ones, react-window re-renders and resets scroll position, causing flicker

### Fix Strategy

Remove the dual-scroll conflict by letting react-window be the sole scroll controller, and expose scroll control via ref.

### Changes

**1. `src/components/chat/VirtualizedMessageList.tsx`**
- Accept a `ref` via `forwardRef` that exposes `{ scrollToBottom, scrollToMessage, isAtBottom }` methods
- On initial mount (not just length change), scroll to the last item using `listRef.current.scrollToRow({ index: last, align: 'end' })`
- Track `isAtBottom` by listening to the List's `onScroll` prop
- When items change and user is at bottom, auto-scroll to bottom
- Handle the "load older messages" scroll preservation by detecting when items are prepended
- Add smooth scroll-like behavior with a CSS transition on the container

**2. `src/components/chat/ConversationView.tsx`**
- Remove the outer scrollable `div` with `overflow-y-auto` (line 751-753) — replace with a simple non-scrolling container
- Remove `useChatInfiniteScroll` hook usage — move the "load more on scroll near top" logic into VirtualizedMessageList's `onScroll` handler
- Get `scrollToBottom`, `isAtBottom`, `showScrollToBottom` from the VirtualizedMessageList ref instead
- Update the `ScrollToBottom` button to call the ref's `scrollToBottom`
- Remove the `initialScrollDoneRef` and duplicate scroll effects (lines 549-579)

**3. `src/hooks/useChatInfiniteScroll.ts`**
- Remove or simplify — it won't be needed since react-window handles scrolling

**4. `src/components/chat/ScrollToBottom.tsx`**
- Add a subtle slide-up animation when appearing

### Result
- Opening any chat immediately shows the latest messages at the bottom
- Sending a message keeps scroll at bottom with no flicker
- Scrolling up still triggers loading older messages
- Scroll-to-bottom button works reliably

