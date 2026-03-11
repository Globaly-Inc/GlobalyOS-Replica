

## Fix: Favorites Not Populating — Wrong Column Name

### Root Cause
The `useTaskFavoritesWithDetails` hook queries `tasks:task_id(name, list_id)` but the `tasks` table uses `title` (not `name`) for the task name column. This causes the join to fail silently, so favorited tasks show as "Untitled" or the query returns no usable data.

### Changes

**`src/hooks/useTaskFavorites.ts`** — Fix the column name in the Supabase select query:
- Change `.select('task_id, tasks:task_id(name, list_id)')` → `.select('task_id, tasks:task_id(title, list_id, space_id)')`
- Update the mapping to use `d.tasks?.title` instead of `d.tasks?.name`
- Also fetch `space_id` from the tasks table so sidebar navigation works correctly

