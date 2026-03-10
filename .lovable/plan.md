

## Plan: Fix RelatedToPopover Click Propagation in Task List

### Root Cause
React synthetic events bubble through portals via the React tree. Clicks inside `PopoverContent` bubble to the row's `onClick`, opening the task detail dialog and unmounting the popover before the search phase renders.

### Fix
**File: `src/components/tasks/RelatedToPopover.tsx`** — Add `onClick={(e) => e.stopPropagation()}` to `PopoverContent`.

```tsx
<PopoverContent className="w-72 p-0" align="start" onClick={(e) => e.stopPropagation()}>
```

Single-line change. Fixes all three flows: blank cell → type selection → search/select, and editing existing relations. No side effects in `TaskDetailPage.tsx`.

