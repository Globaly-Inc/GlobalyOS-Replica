

## Fix Missing Scrollbars in Task List View

### Problem
The scrollable wrapper in `TaskListView.tsx` uses `h-full` which doesn't properly resolve in a flex layout, causing no visible scrollbars. The parent container in `Tasks.tsx` uses `overflow-hidden` which clips content but the child doesn't properly fill and constrain its height.

### Changes

**1. `src/components/tasks/TaskListView.tsx` (line 277)**
- Change the outer wrapper from `overflow-auto h-full` to `overflow-auto flex-1 min-h-0` so it properly fills available space in the flex-col parent and constrains its height to trigger scrollbars.

**2. `src/pages/Tasks.tsx` (line 314)**
- Ensure the task content container properly passes flex behavior down. Change from `flex-1 overflow-hidden p-6 flex flex-col` to `flex-1 overflow-hidden p-6 flex flex-col min-h-0` so the flex child can shrink and produce scroll overflow.

### Result
Both horizontal (when columns exceed viewport width) and vertical (when tasks exceed viewport height) native scrollbars will appear on the task list area.

