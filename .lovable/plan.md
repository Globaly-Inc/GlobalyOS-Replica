
# Add Line Separator Below Members Section

## Change Summary
Add a horizontal border separator at the bottom of the Members section in the chat right panel to visually separate it from the Pinned Messages section below.

## Implementation

**File:** `src/components/chat/ChatRightPanelEnhanced.tsx`

**Change:** Add a `border-b border-border` class to the Members `Collapsible` wrapper, or insert a separator `<div>` after the closing `</Collapsible>` tag at line 708.

**Option A - Add border to Collapsible (cleaner):**
```tsx
// Line 590 - Add border-b to the Collapsible wrapper
<Collapsible 
  open={membersOpen} 
  onOpenChange={setMembersOpen}
  className="border-b border-border"
>
```

**Option B - Insert separator div:**
```tsx
// After line 708, before line 711
</Collapsible>
{/* Add separator */}
<div className="border-b border-border" />

{/* Pinned Messages Section */}
```

I recommend **Option A** as it keeps the separator logically tied to the Members section and is cleaner.
