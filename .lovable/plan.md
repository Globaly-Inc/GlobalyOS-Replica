

## Fix: Tags Dropdown Closes on Selection

### Root Cause
When a tag is selected in the `TagsSelector`, `toggleTag` calls `onChange` which triggers a task mutation and query invalidation. The resulting re-render causes the `Popover` to lose its `open` state (component effectively remounts as the parent row re-renders with new data).

### Fix

**File: `src/components/tasks/TaskInlineCellEditors.tsx`** (TagsSelector, lines 201-260)

1. Add a `useRef` to track whether the popover should stay open, preventing `onOpenChange(false)` from firing during a tag toggle.
2. In `toggleTag`, set a ref flag (`keepOpen.current = true`) before calling `onChange`, then clear it after a short timeout.
3. In `onOpenChange`, skip closing if `keepOpen.current` is `true`.

This ensures the dropdown stays open while the user selects/deselects multiple tags, and only closes when they click outside or press Escape.

