

## Allow Task Title to Wrap to Multiple Lines

### Problem
The task title `<span>` on line 410 has the `truncate` class, which forces single-line display with ellipsis for long titles.

### Plan

**File: `src/components/tasks/TaskRow.tsx` (line 410)**

Replace `truncate` with classes that allow multi-line wrapping:

```tsx
// Before
<span className="truncate font-medium">{task.title}</span>

// After
<span className="font-medium break-words whitespace-normal">{task.title}</span>
```

This removes the single-line truncation and lets long task titles flow naturally across multiple lines. The parent flex-col layout already supports variable-height content.

