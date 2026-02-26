

## Plan: Show Dashboard + List/Board Together (No Manage/Add Task Buttons)

### Changes — `src/pages/Tasks.tsx`

1. **Replace the either/or conditional** (lines 241-432) so both the dashboard and the toolbar + list/board render sequentially for depth-0 projects:

```tsx
{isProjectDashboard && activeSpaceId && (
  <ProjectDashboard spaceId={activeSpaceId} spaces={spaces} />
)}

{/* Toolbar + list/board — always rendered (unless no space selected) */}
{(activeSpaceId || isAllTasksMode) && (
  <>
    <div className="px-6 pt-3 border-b">
      {/* list tabs + toolbar row — unchanged */}
    </div>
    <div className="flex-1 overflow-auto p-6">
      {/* list/board view — unchanged */}
    </div>
  </>
)}
```

2. **Keep "Manage" and "Add Task" buttons hidden** for depth-0 projects — the existing `!isProjectDashboard` guard on line 225 stays as-is. The `ManageDialog`/`AddTaskDialog` guard on line 434 also stays.

3. **Remove `overflow-auto` from `ProjectDashboard.tsx`** wrapper so the dashboard and task list scroll together as one page.

### Changes — `src/components/tasks/ProjectDashboard.tsx`

- Remove `overflow-auto` from the outer container div so it acts as a static block above the task list.

