

## Fix: Always-Visible Cursor Labels and Thicker Cursor

### The Problem
The previous plan to fix this was approved but the changes were never actually applied. The code still has:
- `showCursorLabels: "activity"` (line 164 of BlockNoteWikiEditor.tsx) -- labels fade out after the cursor stops moving
- `border-left: 2px solid` (line 139 of blocknote-styles.css) -- thin cursor caret
- `opacity: 0` on idle labels (line 162 of blocknote-styles.css) -- hides the name label when idle

### The Fix

**File 1: `src/components/wiki/BlockNoteWikiEditor.tsx`**
- Line 164: Change `showCursorLabels: "activity"` to `showCursorLabels: "always"` so the collaborator's full name stays permanently visible above the cursor

**File 2: `src/components/wiki/blocknote-styles.css`**
- Line 139: Change `border-left: 2px solid` to `border-left: 3px solid` for a thicker, more visible cursor caret
- Lines 161-163: Remove the idle fade rule (`.collaboration-cursor__label[data-idle="true"] { opacity: 0; }`) so the label never disappears

These are the exact same changes from the previous plan, applied this time.

