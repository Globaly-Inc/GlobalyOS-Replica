

## Improve Favorites Section in Task Sidebar

The existing Favorites section already exists between "My Tasks" and "Spaces" with the correct label. The improvement needed is to ensure it properly displays all favorited tasks and handles empty state gracefully.

### Changes

**1. `src/hooks/useTaskFavorites.ts`** — Improve the `useTaskFavoritesWithDetails` hook
- Also invalidate the `task-favorites-details` query key in `useToggleTaskFavorite` so the sidebar updates immediately when a task is favorited/unfavorited

**2. `src/components/tasks/TaskInnerSidebar.tsx`** — Polish the Favorites section
- Add an empty state message when no tasks are favorited (e.g., "Star a task to add it here")
- Ensure the section is always visible and properly styled to match the Spaces section pattern
- When clicking a favorited task, navigate to and highlight that task's list in the sidebar

### Technical Detail
Currently `useToggleTaskFavorite` only invalidates `['task-favorites']` but not `['task-favorites-details']`, so the sidebar list won't refresh when toggling favorites from task rows. Adding the second invalidation fixes this.

