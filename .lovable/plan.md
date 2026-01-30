
# Continuation Plan: Complete Remaining Phase 2 & 3 Tasks

## Current Status Summary

### Already Completed ✅

**Phase 1 (Immediate Performance Wins):**
- ✅ React.memo added to MessageBubble with custom comparator
- ✅ groupedMessages wrapped in useMemo in ConversationView
- ✅ Stable callbacks extracted into messageCallbacks useMemo object
- ✅ global-ask-ai parallel queries implemented (Promise.all)

**Phase 2 (Virtualization):**
- ✅ react-window and react-virtualized-auto-sizer dependencies added
- ✅ VirtualizedMessageList component created with full implementation

**Phase 3 (Modularization):**
- ✅ Chat service module structure created at `src/services/chat/`
- ✅ Query hooks extracted:
  - `useConversations.ts` - conversations, participants
  - `useSpaces.ts` - spaces, members, public spaces
  - `useMessages.ts` - messages, pinned, starred, mentions, unread
  - `usePresence.ts` - typing indicators, online status
- ✅ Mutation hooks extracted:
  - `useMessageMutations.ts` - send, edit, delete, pin
  - `useConversationMutations.ts` - create, update, leave, mute
  - `useSpaceMutations.ts` - create, update, archive, delete
  - `useMemberMutations.ts` - add, remove, update roles
  - `useReactionMutations.ts` - toggle reactions
- ✅ Barrel exports created in `src/services/chat/index.ts`
- ✅ EditorToolbar extracted and memoized for WikiRichEditor

---

## Remaining Tasks

### Task 1: Integrate VirtualizedMessageList into ConversationView
The VirtualizedMessageList component exists but is **not yet integrated** into ConversationView.tsx. Currently, the component still uses the non-virtualized ScrollArea with manual message mapping.

**Changes needed:**
1. Import VirtualizedMessageList in ConversationView
2. Replace the message rendering section (lines ~810-970) with VirtualizedMessageList
3. Pass the required props: groupedMessages, reactions, callbacks, etc.
4. Handle the transition from ScrollArea to virtualized list

### Task 2: Wire Up EditorToolbar in WikiRichEditor
The EditorToolbar component exists but needs to be **integrated into WikiRichEditor.tsx** to replace the inline toolbar JSX.

**Changes needed:**
1. Import EditorToolbar in WikiRichEditor
2. Replace toolbar JSX section (~350 lines) with memoized EditorToolbar component
3. Create stable callback refs for toolbar actions
4. Pass formatting state as props

### Task 3: Update plan.md to Mark Phase 2 & 3 Complete
Update the tracking document to reflect all completed work.

### Task 4: Verify Import Paths
Ensure all 24 files that import from `@/services/useChat` continue to work. The barrel export in `src/services/chat/index.ts` re-exports all hooks, but we need to verify backward compatibility.

---

## Implementation Details

### Task 1: VirtualizedMessageList Integration

**File:** `src/components/chat/ConversationView.tsx`

Replace the current message rendering (approximately lines 810-970):
```typescript
// Current implementation uses ScrollArea with manual mapping
<ScrollArea ref={scrollContainerRef} onScroll={handleScroll}>
  {Object.entries(groupedMessages).map(([date, msgs]) => (
    // ... date separators and message bubbles
  ))}
</ScrollArea>

// Replace with:
import { VirtualizedMessageList } from './VirtualizedMessageList';

<div className="flex-1 overflow-hidden">
  <VirtualizedMessageList
    groupedMessages={groupedMessages}
    reactions={reactions}
    messageStars={messageStars}
    currentEmployeeId={currentEmployee?.id}
    onlineStatuses={onlineStatuses}
    replyCounts={replyCounts}
    editingMessageId={editingMessageId}
    highlightMessageId={highlightMessageId}
    callbacks={messageCallbacks}
    isEditPending={editMessage.isPending}
    isLoadingMore={loadOlderMessages.isPending}
    hasMoreMessages={hasMoreMessages}
  />
</div>
```

The virtualized list will:
- Only render ~15 visible messages instead of 500+
- Handle scroll-to-message for highlights
- Support dynamic row heights based on content
- Show loading indicator when fetching older messages
- Show "Beginning of conversation" when no more messages

### Task 2: EditorToolbar Integration

**File:** `src/components/wiki/WikiRichEditor.tsx`

Add import and create stable callback handlers:
```typescript
import { EditorToolbar } from './editor/EditorToolbar';

// Create stable toolbar callbacks
const toolbarCallbacks = useMemo(() => ({
  onToggleHeading: (heading: 'h1' | 'h2' | 'h3') => toggleHeading(heading),
  onTextSizeChange: handleTextSizeChange,
  onExecCommand: executeCommand,
  onFormatBlock: formatBlock,
  onInsertList: insertList,
  onInsertLink: () => setLinkDialogOpen(true),
  onInsertImage: () => fileInputRef.current?.click(),
  onInsertFile: () => attachmentInputRef.current?.click(),
  onInsertCodeBlock: insertCodeBlock,
  onInsertTable: insertTable,
  onInsertDivider: insertDivider,
  onInsertEmbed: () => setEmbedDialogOpen(true),
  onUndo: () => document.execCommand('undo'),
  onRedo: () => document.execCommand('redo'),
  onAIGenerated: handleAIGenerated,
}), [/* stable deps */]);

// Replace inline toolbar with:
<EditorToolbar
  activeHeading={activeHeading}
  activeTextSize={activeTextSize}
  textSizeInput={textSizeInput}
  isUploading={isUploading}
  isBold={activeFormatting.bold}
  isItalic={activeFormatting.italic}
  isUnderline={activeFormatting.underline}
  hasSelection={hasSelection}
  editorValue={value}
  {...toolbarCallbacks}
/>
```

This removes ~300 lines of JSX from the main component and prevents toolbar re-renders on every keystroke.

---

## Expected Outcomes After Completion

| Metric | Before | After |
|--------|--------|-------|
| Message list re-renders | 100+ per keystroke | 0 (virtualized) |
| DOM nodes (500 messages) | 500+ | ~15 visible |
| Toolbar re-renders | Every keystroke | Only on format change |
| useChat.ts file size | 2,456 lines | Split across 9 modules |
| WikiRichEditor.tsx | 2,624 lines | ~2,300 lines (toolbar extracted) |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/chat/ConversationView.tsx` | Import & integrate VirtualizedMessageList |
| `src/components/wiki/WikiRichEditor.tsx` | Import & integrate EditorToolbar |
| `.lovable/plan.md` | Mark Phase 2 & 3 complete |

---

## Risk Assessment

| Change | Risk | Mitigation |
|--------|------|------------|
| Virtualization scroll behavior | Medium | VirtualizedMessageList already handles scroll-to-message and auto-scroll |
| Toolbar integration | Low | EditorToolbar already tested and memoized |
| Existing tests | Low | Hook imports unchanged via barrel exports |

---

## Testing Checklist

**Chat (After VirtualizedMessageList Integration):**
- [ ] Open conversation - messages render correctly
- [ ] Scroll up - older messages load seamlessly
- [ ] Type in composer - no message flickering
- [ ] Click reaction - only that message updates
- [ ] Navigate to highlighted message - scrolls to correct position
- [ ] System events display properly

**Wiki Editor (After EditorToolbar Integration):**
- [ ] All toolbar buttons work (bold, italic, headings, etc.)
- [ ] Type rapidly - toolbar doesn't lag
- [ ] Keyboard shortcuts work (Ctrl+B, Ctrl+I, etc.)
- [ ] AI writing assist button functions

---

## Summary

This plan completes the remaining integration work:
1. **VirtualizedMessageList** → 97% DOM reduction, 60fps scrolling
2. **EditorToolbar** → Instant toolbar response, cleaner code
3. **Update tracking** → Document completion

All foundational work (components, hooks, structure) is already complete. These tasks are focused on wiring up existing pieces.
