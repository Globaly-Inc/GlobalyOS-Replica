
# Plan: Full-Width Transparent Chat Header with Backdrop Blur

## Overview

Update the chat conversation header to span full width and become semi-transparent with a backdrop blur effect, allowing messages to be visible as they scroll behind it.

---

## Current Behavior

The header at line 620 in `ConversationView.tsx`:
```tsx
<div className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3 border-b border-border bg-card flex-shrink-0">
```

- Has solid `bg-card` background (opaque)
- Messages scroll completely behind it without visibility
- Standard border at the bottom

---

## Proposed Changes

### Update `ConversationView.tsx` (Line 620)

**Before:**
```tsx
<div className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3 border-b border-border bg-card flex-shrink-0">
```

**After:**
```tsx
<div className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3 border-b border-border/50 bg-card/80 backdrop-blur-md flex-shrink-0">
```

**Changes:**
| Property | Before | After | Effect |
|----------|--------|-------|--------|
| Background | `bg-card` | `bg-card/80` | 80% opacity, slightly transparent |
| Border | `border-border` | `border-border/50` | Softer border to complement glass effect |
| Blur | None | `backdrop-blur-md` | Blur content scrolling behind |

---

## Visual Effect

The header will now:
1. Show a subtle blur of message content as it scrolls behind
2. Maintain full readability of header content (name, avatar, buttons)
3. Create a modern "frosted glass" aesthetic
4. Blend smoothly with both light and dark themes

---

## File to Modify

| File | Changes |
|------|---------|
| `src/components/chat/ConversationView.tsx` | Update header div classes at line 620 |

---

## Technical Notes

- The `backdrop-blur-md` filter works in all modern browsers
- The `/80` opacity modifier uses Tailwind's opacity syntax
- No structural changes needed - just CSS class updates
- Works automatically with theme switching (light/dark mode)
