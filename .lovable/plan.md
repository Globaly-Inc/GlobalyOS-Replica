
# Auto-Expanding Message Composer Textarea

## Overview

Modify the message composer textarea to automatically expand as the user types, growing up to 7 lines of content, then enabling scroll for additional text.

## Technical Approach

### Current State
- Textarea has `rows={1}` with fixed `min-h-[44px]` (desktop) / `min-h-[48px]` (mobile)
- Max height is `max-h-[160px]` (desktop) / `max-h-[120px]` (mobile)
- No auto-resize logic exists

### Solution
Add an auto-resize effect that:
1. Resets height to `auto` to get accurate `scrollHeight`
2. Calculates max height based on ~7 lines (approximately 168px for desktop, 196px for mobile)
3. Sets height to `min(scrollHeight, maxHeight)`
4. Runs on every message change

### Implementation

**File: `src/components/chat/MessageComposer.tsx`**

1. Add a `useEffect` hook that runs when `message` changes
2. Calculate the appropriate max height for 7 lines:
   - Desktop: ~24px per line × 7 = 168px
   - Mobile: ~28px per line × 7 = 196px
3. Use `scrollHeight` to determine content height
4. Set explicit height on textarea element

```typescript
// Auto-resize textarea logic
useEffect(() => {
  const textarea = textareaRef.current;
  if (!textarea) return;
  
  // Reset height to auto to get accurate scrollHeight
  textarea.style.height = 'auto';
  
  // Calculate max height for 7 lines
  const lineHeight = isMobile ? 28 : 24;
  const maxLines = 7;
  const maxHeight = lineHeight * maxLines;
  
  // Set height to min of scrollHeight and maxHeight
  const newHeight = Math.min(textarea.scrollHeight, maxHeight);
  textarea.style.height = `${newHeight}px`;
}, [message, isMobile]);
```

5. Update CSS classes:
   - Remove `max-h-*` classes (handled by JS)
   - Keep `min-h-*` for initial state
   - Add `overflow-y-auto` to enable scrolling when exceeding 7 lines

## Changes Summary

| File | Change |
|------|--------|
| `src/components/chat/MessageComposer.tsx` | Add auto-resize useEffect, update textarea className |

## User Experience

1. **Start typing**: Textarea is single line height
2. **Line wrap or Enter**: Height grows to accommodate new line
3. **Up to 7 lines**: Textarea expands smoothly
4. **Beyond 7 lines**: Scrollbar appears, height stays fixed
5. **Delete content**: Height shrinks back down appropriately
6. **Send message**: Resets to single line height
