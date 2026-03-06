

## Add Scrollbars to Task List View

### Problem
The task list content area currently uses `overflow-auto` on the parent container but the inner `TaskListView` doesn't support horizontal scrolling when columns exceed the viewport width. There are no visible scrollbars.

### Changes

**1. Update `src/components/tasks/TaskListView.tsx`**
- Wrap the entire task list content (the outer `<div className="space-y-1">`) in a scrollable container with `overflow-auto` and explicit dimensions so both horizontal and vertical native scrollbars appear.
- Use a `min-w-max` inner wrapper to ensure the grid rows don't compress and instead trigger horizontal scroll.

**2. Update `src/pages/Tasks.tsx`**
- On the task content container (`<div className="flex-1 overflow-auto p-6">`), ensure it allows both axes of overflow and provides a bounded height so the vertical scrollbar appears within the task area (not the full page).

**3. CSS utility (no new file needed)**
- Use standard Tailwind `overflow-auto` which renders native scrollbars on both axes. Remove any `scrollbar-hide` or `overflow-x-hidden` interference from parent containers for this view.

### Result
Both horizontal and vertical scrollbars will appear at the bottom and right side of the task list area, matching the standard spreadsheet/table scroll pattern shown in the reference screenshot.

