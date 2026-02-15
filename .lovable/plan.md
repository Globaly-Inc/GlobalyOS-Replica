

## Fix: Always-Visible Cursor Labels and Thicker Cursor

### The Problem
Currently, collaboration cursor labels (showing the user's name like "Sarah Smith") only appear briefly and then fade out due to the `showCursorLabels: "activity"` setting. The cursor caret line is also thin (2px), making it hard to spot.

### The Fix

**`src/components/wiki/BlockNoteWikiEditor.tsx`**
- Change `showCursorLabels` from `"activity"` to `"always"` so the name label stays permanently visible above the cursor

**`src/components/wiki/blocknote-styles.css`**
- Increase `.collaboration-cursor__caret` border width from `2px` to `3px` for better visibility
- Remove the idle fade rule (`.collaboration-cursor__label[data-idle="true"]` with `opacity: 0`) since labels should always be visible now

### Files to Modify

| File | Change |
|------|--------|
| `src/components/wiki/BlockNoteWikiEditor.tsx` | `showCursorLabels: "always"` |
| `src/components/wiki/blocknote-styles.css` | Thicker caret (3px), remove idle fade rule |

