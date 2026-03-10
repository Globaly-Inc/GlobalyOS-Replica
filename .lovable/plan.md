

## Plan: Reduce Gap Between Top Nav and Workspace Label

The sidebar container at line 85 has `pt-4` (1rem / 16px) top padding, creating the large gap. Reducing it to `pt-1` (4px) will minimize the distance between the top navigation bar and the "WORKSPACE" heading.

**File: `src/components/tasks/TaskInnerSidebar.tsx`** (line 85)

Change `pt-4` to `pt-1`:
```tsx
// Before
<div className="px-3 pt-4 pb-2">

// After
<div className="px-3 pt-1 pb-2">
```

Single-line change. No other files affected.

