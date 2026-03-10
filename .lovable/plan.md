

## Plan: Add Collapsible Toggle to Task Inner Sidebar

### What changes

**File: `src/pages/Tasks.tsx`**
1. Add a `sidebarOpen` state (default `true`)
2. Conditionally render `<TaskInnerSidebar>` based on this state
3. Add a toggle button (e.g., `PanelLeftClose` / `PanelLeftOpen` icon from lucide) in the header area that toggles the sidebar visibility

**File: `src/components/tasks/TaskInnerSidebar.tsx`**
1. Add a collapse button at the bottom or top-right of the sidebar (matching the WordPress screenshot pattern — a "Collapse menu" style button)

### Implementation detail

In `Tasks.tsx` (line ~190-192):
```tsx
const [sidebarOpen, setSidebarOpen] = useState(true);

// In the layout:
<div className="flex h-[calc(100vh-4rem)] overflow-hidden">
  {sidebarOpen && <TaskInnerSidebar selection={selection} onSelect={handleSelect} />}
  
  <div className="flex-1 flex flex-col overflow-hidden">
    {/* Header - add toggle button */}
    <div className="px-6 pt-4 pb-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
          </Button>
          <h1 ...>{pageIcon} {pageTitle}</h1>
        </div>
        ...
      </div>
    </div>
```

This gives the user a single icon button in the task header to toggle the sidebar on and off, similar to the WordPress "Collapse menu" pattern shown in the screenshot.

