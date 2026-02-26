

## Plan: Project Dashboard View for Depth-0 Spaces

### Understanding

When a user clicks on a top-level project (depth 0) in the sidebar, instead of showing the task list/board, the main area should display a dashboard with four widgets inspired by the reference image:
1. **Project Completion Rate** — circular gauge showing % of completed tasks across the project and all its descendant spaces
2. **Sub-projects List** — cards listing direct child spaces (depth 1) with their own completion %
3. **Sprint/Cycle Velocity** — line chart showing tasks completed over recent time periods
4. **Tasks by Assignee** — pie chart breaking down task counts per assignee

### Changes

**1. Detect depth of selected space — `src/pages/Tasks.tsx`**

- After selecting a space, compute its depth by walking the `parent_id` chain in the `spaces` array
- If `depth === 0` (it's a top-level Project), render a new `ProjectDashboard` component instead of the list/board views
- If `depth > 0`, keep the existing list/board behavior unchanged
- The header still shows the project name + icon, but hides Manage/Add Task buttons and the toolbar (filters, search, view toggle, list tabs)

**2. New `useProjectDashboardData` hook — `src/services/useProjectDashboard.ts`**

- Accepts a `projectSpaceId` (depth-0 space ID)
- Collects all descendant space IDs by walking the tree from `task_spaces`
- Fetches all tasks across the project + descendants in a single query: `supabase.from('tasks').select('*, status:task_statuses(name)').in('space_id', allDescendantIds).eq('is_archived', false)`
- Computes:
  - **Completion rate**: count of tasks with status name "Completed" / total tasks
  - **Sub-projects**: direct children spaces with their own task counts and completion %
  - **Velocity**: tasks completed grouped by week (last 6 weeks)
  - **Tasks by assignee**: grouped count with assignee names from `employee_directory`

**3. New `ProjectDashboard` component — `src/components/tasks/ProjectDashboard.tsx`**

A 2×2 card grid layout matching the reference image style:

| Top-left | Top-center/right |
|---|---|
| **Project Completion** — Large circular progress gauge (using recharts `PieChart` for donut) showing overall %, with a green checkmark icon when >75% | **Sprint Velocity (Last 6 Weeks)** — `LineChart` with weeks on X-axis and completed task count on Y-axis |

| Bottom-left | Bottom-right |
|---|---|
| **Sub-projects** — List of sub-project cards showing name, task count, and a small progress bar for each | **Tasks by Assignee** — Horizontal `BarChart` (matching the reference) showing task count per assignee with colored bars |

- Uses `recharts` (`PieChart`, `LineChart`, `BarChart`, `ResponsiveContainer`)
- Uses existing `Card`, `CardHeader`, `CardContent` UI components
- Uses existing `CircularProgress` or a custom recharts donut for the completion gauge
- Color palette uses standard chart colors from the project's theme

**4. Wire into `Tasks.tsx`**

```
const spaceDepth = useMemo(() => {
  if (!activeSpace) return -1;
  let depth = 0;
  let current = activeSpace;
  while (current.parent_id) {
    depth++;
    current = spaces.find(s => s.id === current.parent_id);
    if (!current) break;
  }
  return depth;
}, [activeSpace, spaces]);

const isProjectDashboard = !isAllTasksMode && spaceDepth === 0;
```

- When `isProjectDashboard` is true, render `<ProjectDashboard spaceId={activeSpaceId} spaces={spaces} />` instead of the toolbar + list/board
- The header still shows the project name but hides Manage/Add Task/filters/view toggle

### Technical details

- No database changes needed — all data is derived from existing `tasks`, `task_spaces`, `task_statuses`, and `employee_directory` tables
- Descendant space collection is done client-side from the already-fetched `spaces` array (typically <50 spaces per org)
- Velocity chart groups by ISO week using `date-fns` `startOfWeek` 
- The "Tasks by Assignee" uses a horizontal bar chart (like the reference image) rather than a traditional pie chart, as horizontal bars are more readable with names
- The sub-projects list shows a small progress bar per sub-project using the existing `Progress` component
- All queries are scoped by the space IDs derived from the org's spaces (tenant-isolated)
- The dashboard is responsive: 2-column grid on desktop, single column on mobile

