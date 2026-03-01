

## Bug: Assignee Popover Shows Empty Names

### Root Cause

The `useEmployees` hook (in `useEmployees.ts`) returns data with employee names nested inside a `profiles` object:

```
{ id: "...", profiles: { full_name: "Jane", avatar_url: "...", email: "..." }, ... }
```

But `TaskListView.tsx` (lines 55-59) maps the data incorrectly, accessing `e.full_name` and `e.avatar_url` directly on the root object — which are `undefined`:

```ts
const members = ((employeesData || []) as any[]).map((e: any) => ({
  id: e.id,
  full_name: e.full_name || '',      // ← always ''
  avatar_url: e.avatar_url || null,   // ← always null
}));
```

This is why the popover shows avatar fallbacks with "?" and no names — the names are empty strings, and the avatars are null.

### Fix

**File: `src/components/tasks/TaskListView.tsx`** (lines 55-59)

Change the mapping to read from the nested `profiles` object:

```ts
const members = ((employeesData || []) as any[]).map((e: any) => ({
  id: e.id,
  full_name: e.profiles?.full_name || '',
  avatar_url: e.profiles?.avatar_url || null,
}));
```

This is a one-file, two-line fix.

