
# Move Reply Composer Inside Scrollable Content

## Overview
Relocate the reply composer from the fixed bottom position to inside the `ScrollArea`, positioned directly below the replies list. This allows the composer to scroll with the thread content.

---

## Current vs Desired Layout

**Current:**
```text
+------------------+
| Thread      [X]  |  ← Header (fixed)
+------------------+
| Main Message     |
| Reply count      |  ← ScrollArea
| Replies...       |
+------------------+
| [Reply input][>] |  ← Fixed at bottom (border-t)
+------------------+
```

**Desired:**
```text
+------------------+
| Thread      [X]  |  ← Header (fixed)
+------------------+
| Main Message     |
| Reply count      |
| Replies...       |  ← All inside ScrollArea
| [Reply input][>] |
+------------------+
```

---

## Implementation

### File: `src/components/chat/ThreadView.tsx`

Move the reply composer `div` (lines 288-312) from outside the `ScrollArea` to inside it, after the replies list.

**Changes:**

1. Remove the reply composer section from outside ScrollArea (lines 288-312)

2. Insert it inside the ScrollArea, after the replies `div` (after line 284), with adjusted styling:
   - Remove `border-t` since it's no longer at the bottom
   - Keep `p-3` padding but integrate with the scroll content
   - Add some top margin for spacing from replies

**Updated structure:**
```tsx
<ScrollArea className="flex-1" ref={scrollRef}>
  <div className="p-4 space-y-4">
    {/* Original message */}
    ...
    
    {/* Reply count */}
    ...
    
    {/* Replies */}
    ...
    
    {/* Reply composer - now inside scroll area */}
    <div className="pt-3 mt-2">
      <div className="flex gap-2">
        <Textarea ... />
        <Button ... />
      </div>
    </div>
  </div>
</ScrollArea>
```

---

## Technical Details

### Styling Adjustments
- Remove `border-t border-border` from composer wrapper (no longer at fixed bottom)
- Change `p-3` to `pt-3 mt-2` to add spacing from replies above
- Keep the flex layout and button styling unchanged

### Auto-scroll Behavior
The existing auto-scroll logic (lines 123-128) will now automatically scroll to show the composer when new replies arrive, improving UX.

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/chat/ThreadView.tsx` | Modify | Move reply composer inside ScrollArea, below replies |
