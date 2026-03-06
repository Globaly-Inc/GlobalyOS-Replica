

## Show Status & Category Before Task Name

### What Changes

**File: `src/components/tasks/TaskRow.tsx`**

Update the `name` cell (lines 258-269) to prepend:
1. **Status indicator** — a small colored dot with the status name as a compact badge/pill, using `task.status?.color` and `task.status?.name`
2. **Category/Type indicator** — a small colored badge showing the category name (currently only a dot is shown)

The updated `name` cell will render:

```text
[● To Do] [Bug] My Task Title
```

- Status: a pill with a colored dot + status name, styled with the status color as background at low opacity
- Category: a small pill with the category color, only shown if a category exists
- Task title: the existing truncated text

This keeps the name column self-contained and avoids layout changes to other columns.

### Implementation Detail

In `renderCell` case `'name'` (line 258), replace the current content with:

```tsx
case 'name':
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      {task.status && (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
          style={{
            backgroundColor: `${task.status.color}20`,
            color: task.status.color || '#6b7280',
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: task.status.color || '#6b7280' }} />
          {task.status.name}
        </span>
      )}
      {task.category && (
        <span
          className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
          style={{
            backgroundColor: `${task.category.color}20`,
            color: task.category.color || '#6b7280',
          }}
        >
          {task.category.name}
        </span>
      )}
      <span className="truncate font-medium">{task.title}</span>
    </div>
  );
```

This removes the old lone category dot and replaces it with labeled pills for both status and category in front of the task title.

