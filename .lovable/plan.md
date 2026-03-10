

## Plan: Red Color for Overdue Due Dates

**File: `src/components/tasks/TaskRow.tsx`** (lines 564-574)

Add a check: if `task.due_date` is in the past, apply `text-red-500` instead of `text-muted-foreground`.

```tsx
// Before
<button className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left w-full">

// After
const isOverdue = task.due_date && new Date(task.due_date) < new Date();
<button className={cn(
  "text-xs transition-colors text-left w-full",
  isOverdue ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-foreground"
)}>
```

Single location change. `cn` and `parseISO` are already imported.

