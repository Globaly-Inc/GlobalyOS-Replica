
## Fix: Make list rename input text dark

### Problem
When renaming a task list in the sidebar, the text input inherits a light/muted text color, making it hard to read while editing.

### Fix
Add `text-foreground` class to the rename `Input` element in `TaskInnerSidebar.tsx` (line 545) so the text appears dark/readable during editing.

### Change

| File | Change |
|------|--------|
| `src/components/tasks/TaskInnerSidebar.tsx` | Add `text-foreground` to the rename input's className (line 545) |

The className changes from:
```
"h-6 text-sm flex-1 px-1"
```
to:
```
"h-6 text-sm flex-1 px-1 text-foreground"
```

This ensures the input text is always the standard dark foreground color in both light and dark themes.
