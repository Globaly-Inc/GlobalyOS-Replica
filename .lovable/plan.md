

## Fix: Tag selection visual state persisting when moving to Done button

### Problem
In the `TagsSelector`, when a user selects a tag (e.g. "Internal"), the visual "selected" indicator disappears as they move their cursor down toward the "Done" button. The tag should remain visually selected until explicitly toggled off or the popover is closed.

### Root Cause
The `cmdk` library's `CommandItem` applies a `data-[selected='true']:bg-accent` style for the currently keyboard/mouse-highlighted item. When the user's cursor leaves the tag items and moves to the "Done" button (which is outside the `Command` component), cmdk removes the `data-selected` attribute from all items. The custom `bg-primary/10` class for checked tags gets visually overridden by cmdk's highlight system during hover and then loses all emphasis once the cursor exits. The result is the tag looks "deselected" visually even though it's still in the `value` array.

### Fix (1 file)

**`src/components/tasks/TaskInlineCellEditors.tsx`** — Strengthen the selected-tag styling so it uses inline styles or higher-specificity classes that persist regardless of cmdk's `data-selected` state:

1. For each `CommandItem` in the tags list, apply a persistent visual indicator for selected tags using a combination of:
   - A left border or background that isn't overridden by `data-selected`
   - Keep the `Check` icon opacity logic as-is (already correct)
   - Add `font-medium` or a subtle left-border accent to selected items so they remain visually distinct even when cmdk removes its highlight

2. Specifically, change the selected item className from `'bg-primary/10 text-primary'` to use `!bg-primary/10 !text-primary` (Tailwind `!important` modifiers) so the style isn't overridden by cmdk's `data-selected` accent styling.

This is a CSS specificity fix — no logic changes needed since the `value.includes(tag)` check is already correct.

