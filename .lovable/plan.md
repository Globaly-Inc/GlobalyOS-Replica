

## Problem

`useAllTaskStatuses` fetches **all** `task_statuses` rows for the org. Since each space creates its own set of statuses (with identical names like "To Do", "In Progress"), the filter popover shows massive duplication — one entry per space.

## Fix

**Deduplicate statuses by name** before passing them to `TaskFilterPopover`. When multiple statuses share the same name, merge their IDs so selecting "To Do" in the filter matches all "To Do" statuses across spaces.

### Changes

**1. `src/pages/Tasks.tsx`** — Add a deduplication step for `allStatuses` and `allCategories`

Create a `useMemo` that groups statuses by `name`, picks one representative row per group, and collects all IDs into a map. When the user toggles a deduplicated filter checkbox, expand it to all matching status IDs before passing to the query filters.

```text
allStatuses (raw)          dedupedStatuses (for UI)
┌──────────────────┐       ┌──────────────────────┐
│ id-1  "To Do"    │       │ id-1  "To Do"        │  ← represents id-1, id-4, id-7…
│ id-2  "In Prog"  │       │ id-2  "In Progress"  │  ← represents id-2, id-5, id-8…
│ id-3  "Done"     │       │ id-3  "Done"          │
│ id-4  "To Do"    │       └──────────────────────┘
│ id-5  "In Prog"  │
│ ...              │
└──────────────────┘
```

- `useMemo` to build `dedupedStatuses` (unique by name, keeping first occurrence's color/sort) and a `statusNameToIdsMap` (name → all matching IDs).
- When `onFiltersChange` is called with `status_ids`, expand each selected deduped ID to all IDs sharing that name before passing to the task query.
- Same logic for categories if they also repeat across spaces.

**2. `src/components/tasks/TaskFilterPopover.tsx`** — No changes needed (it just renders whatever `statuses` array it receives).

This approach keeps the filter popover clean while ensuring the underlying query correctly matches all equivalent statuses across spaces.

