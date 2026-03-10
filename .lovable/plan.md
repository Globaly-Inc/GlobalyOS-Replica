

## Add Collapsible Favorites Section to Task Sidebar

### Overview
Add a collapsible "FAVORITES" section between "My Tasks" and "Spaces" in the task sidebar, matching the screenshot's style: an orange star icon, uppercase label, chevron toggle, and a three-dot menu.

### Changes

**1. `src/components/tasks/TaskInnerSidebar.tsx`**
- Import `Star`, `MoreHorizontal` (already imported), and `ChevronDown`/`ChevronRight` (already imported)
- Import `useTaskFavorites` hook
- Add a query to fetch full task details for favorited task IDs (join with tasks table to get names)
- Add `favoritesExpanded` state (default `true`)
- Insert a new section between "My Tasks" (line 98) and "Spaces" (line 101):
  - Header row: orange `Star` icon, "FAVORITES" label (uppercase, xs font, semibold), chevron toggle, three-dot menu
  - When expanded: list each favorited task by name, clickable to navigate to that task's list
  - When collapsed: section hides the list

**2. `src/hooks/useTaskFavorites.ts`**
- Add a new `useTaskFavoritesWithDetails` hook that fetches favorite task IDs and joins with the `tasks` table to get task names, list IDs, and space IDs for sidebar navigation

### UI Structure
```text
My Tasks
─────────────
★ FAVORITES          ⋮  ▾
  Task Name 1
  Task Name 2
─────────────
SPACES              [+]
```

The star icon will be orange (`text-orange-500`). The section header style matches the screenshot with uppercase tracking. Each favorite item will be clickable to select that task's list in the sidebar.

