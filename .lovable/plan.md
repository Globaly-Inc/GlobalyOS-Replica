

## Plan: Move Favorites from Task Level to Task List Level

The star/favorite feature currently operates on individual tasks. The user wants it moved to the **task list** level instead.

### Changes Required

**1. Database Migration**
- Create a new `task_list_favorites` table with columns: `id`, `employee_id`, `organization_id`, `list_id` (FK to `task_lists`), `created_at`
- Add unique constraint on `(employee_id, list_id)`
- Add RLS policies for authenticated users
- The existing `task_favorites` table can remain (no breaking change) but will no longer be used

**2. Rewrite `src/hooks/useTaskFavorites.ts`**
- Replace all queries/mutations to reference `task_list_favorites` table with `list_id` instead of `task_id`
- Update `useTaskFavoritesWithDetails` to fetch list name directly from `task_lists` instead of `tasks`
- Update `useIsTaskFavorite` → `useIsListFavorite(listId)` and `useToggleTaskFavorite` → `useToggleListFavorite`

**3. Remove star from `src/components/tasks/TaskRow.tsx`**
- Remove the `Star` icon button and the `useIsTaskFavorite` / `useToggleTaskFavorite` imports (around lines 24, 626-642)

**4. Add star to `ListItem` in `src/components/tasks/TaskInnerSidebar.tsx`**
- Add a star icon button to the `ListItem` component (line 618+), shown on hover, similar to how it worked on task rows
- Pass `listId` and use the new `useIsListFavorite` / `useToggleListFavorite` hooks

**5. Update Favorites sidebar section in `TaskInnerSidebar.tsx`**
- Update the favorites section (lines 106-160) to display favorite **list names** instead of task names
- Clicking a favorite navigates to that list (already works since it uses `onSelect({ type: 'list', ... })`)
- Update empty state text from "Star a task to add it here" to "Star a list to add it here"

