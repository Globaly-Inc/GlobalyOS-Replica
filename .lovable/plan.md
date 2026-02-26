

## Plan: Show Dashboard + List/Board View Together for Depth-0 Projects

### Problem
Currently, when a depth-0 project is selected, only the `ProjectDashboard` is rendered (line 241-242). The toolbar and list/board view are hidden behind an `else` branch. The user wants both the dashboard widgets and the task list/board to be visible on the same page.

### Changes

**`src/pages/Tasks.tsx`**

- Remove the either/or conditional (`isProjectDashboard ? <Dashboard> : <toolbar + list>`)
- Instead, render both sequentially when `isProjectDashboard` is true:
  1. First: `<ProjectDashboard>` (the 2×2 card grid)
  2. Then: the full toolbar (search, filters, view toggle) and list/board view below it
- The "Manage" and "Add Task" header buttons should also be visible for project dashboard mode (remove the `!isProjectDashboard` guard on lines 225-236)
- The `ManageDialog` and `AddTaskDialog` should also be available (remove the `!isProjectDashboard` guard on line 434)
- The `ProjectDashboard` component will need a slight height adjustment — remove `overflow-auto` from its wrapper and let the parent scroll the entire page (dashboard + task list together)

Specifically, lines 241-431 change from:

```
{isProjectDashboard && activeSpaceId ? (
  <ProjectDashboard ... />
) : (
  <> toolbar + list/board </>
)}
```

To:

```
{isProjectDashboard && activeSpaceId && (
  <ProjectDashboard ... />
)}
<> toolbar + list/board </>
```

This makes both sections render when it's a project dashboard, and only the toolbar + list/board when it's a deeper space.

**`src/components/tasks/ProjectDashboard.tsx`**

- Remove the outer `overflow-auto` and `flex-1` from the wrapper div since the parent page will handle scrolling
- The dashboard becomes a non-scrolling block that sits above the task list

### Technical details
- The entire right panel (`flex-1 flex flex-col overflow-hidden`) will need `overflow-auto` on the content area to allow scrolling through dashboard + task list together
- No new hooks or data changes needed — the existing space-scoped task hooks already fetch the correct data for the selected project space

