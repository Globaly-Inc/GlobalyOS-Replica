

## Saved Filters for Task Management

### What it does

Adds a "Saved Filters" feature to the Task Filter Popover, allowing users to:
- **Save** the current filter combination with a custom name (e.g., "My Urgent Tasks", "Overdue Marketing")
- **Load** a previously saved filter preset from a dropdown list
- **Delete** saved presets they no longer need

Saved filters are stored per-user, per-space in the database so they persist across sessions and devices.

### Database

Create a new `task_saved_filters` table:

```sql
create table public.task_saved_filters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  space_id uuid references public.task_spaces(id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.task_saved_filters enable row level security;

-- Users can only see/manage their own saved filters
create policy "Users manage own saved filters"
  on public.task_saved_filters
  for all
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());
```

### UI Changes

**File: `src/components/tasks/TaskFilterPopover.tsx`**

Add a "Saved Filters" section at the bottom of the popover:
- A separator followed by a "Saved Filters" header
- List of saved presets as clickable pills/rows (click to apply, trash icon to delete)
- A "Save current filters" button (visible when at least one filter is active) that prompts for a name via a small inline input

**New hook: `src/hooks/useTaskSavedFilters.ts`**

Encapsulates CRUD operations against `task_saved_filters` using React Query:
- `savedFilters` — list of user's saved filters for the current space
- `saveFilter(name, filters)` — insert a new preset
- `deleteFilter(id)` — remove a preset
- `applyFilter(id)` — returns the stored `TaskFilters` object to pass to `onFiltersChange`

**File: `src/components/tasks/TaskFilterPopover.tsx`** (props update)

Add `spaceId?: string` prop so saved filters can be scoped to the active space.

**File: `src/pages/Tasks.tsx`**

Pass `spaceId` to `TaskFilterPopover`.

### UX Flow

1. User sets filters (e.g., Priority = Urgent, Status = In Progress)
2. At bottom of popover, clicks "Save current filters"
3. Types a name → clicks checkmark to confirm
4. Preset appears in the "Saved Filters" list
5. Next time, user opens popover → clicks the preset name → filters are applied instantly

