
# Fix Dialog and Tooltip Positioning in Chat Header

## Problem
The search bar and tooltip dialogs in the chat header are appearing at the top of the screen and getting hidden by the main navigation menu bar. This creates poor UX as users cannot see or interact with these UI elements properly.

## Root Causes

1. **MessageSearch Component**: Uses `absolute inset-x-0 top-0` positioning which places it at the very top of the header, potentially overlapping with or being hidden by the main app menu bar.

2. **TooltipContent Components**: The three tooltips for Mute, Favorite, and Search buttons don't specify a `side` prop, causing them to default to appearing above their triggers where they can be cut off.

---

## Solution

### 1. Fix MessageSearch Positioning

Change the MessageSearch from appearing at `top-0` to appearing below the header by changing its position to `top-full`:

**File: `src/components/chat/MessageSearch.tsx`**

```tsx
// Change from:
<div className="absolute inset-x-0 top-0 z-20 bg-card border-b border-border shadow-lg">

// Change to:
<div className="absolute inset-x-0 top-full z-20 bg-card border-b border-border shadow-lg rounded-b-lg">
```

This positions the search panel directly below the header element instead of overlapping it.

---

### 2. Fix TooltipContent Positioning

Add `side="bottom"` to all three TooltipContent components in the chat header action buttons:

**File: `src/components/chat/ChatHeader.tsx`**

```tsx
// Mute button tooltip (around line 529)
<TooltipContent side="bottom">
  {(activeChat.type === 'space' ? spaceNotificationSetting === 'mute' : isMuted)
    ? 'Unmute notifications'
    : 'Mute notifications'}
</TooltipContent>

// Favorite button tooltip (around line 550)
<TooltipContent side="bottom">
  {isFavorited ? 'Remove from favorites' : 'Add to favorites'}
</TooltipContent>

// Search button tooltip (around line 566)
<TooltipContent side="bottom">Search messages</TooltipContent>
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/chat/MessageSearch.tsx` | Change `top-0` to `top-full` and add `rounded-b-lg` |
| `src/components/chat/ChatHeader.tsx` | Add `side="bottom"` to all 3 TooltipContent components |

---

## Visual Result

### Before
- MessageSearch appears at top, hidden by menu bar
- Tooltips appear above buttons, potentially clipped

### After
- MessageSearch slides down below the header, fully visible
- Tooltips appear below buttons, always within viewport
