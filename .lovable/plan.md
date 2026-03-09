

## Show Related Entity Inline in Task List Row

### What changes

**File: `src/components/tasks/TaskRow.tsx`**

Add a small "Related to" badge above the task title (inside the Name column's flex-col layout) when the task has a `related_entity_type` set. This mirrors the badge shown in the Task Detail page.

**Specifically:**
- Between the status/category line and the title `<span>`, insert a conditional row that renders when `task.related_entity_type` is truthy
- Display a small `Link2` icon + capitalized entity type label as a subtle `Badge variant="outline"` (same style as TaskDetailPage)
- Example: `🔗 Contact` or `🔗 Deal`

```tsx
// Inside the Name column flex-col, before the title span (around line 410):
{task.related_entity_type && (
  <div className="flex items-center gap-1">
    <Badge variant="outline" className="text-[10px] h-4 gap-1 px-1.5">
      <Link2 className="h-2.5 w-2.5" />
      {task.related_entity_type.charAt(0).toUpperCase() + task.related_entity_type.slice(1)}
    </Badge>
  </div>
)}
```

- Add `Link2` to the existing lucide-react imports

No new files, hooks, or database changes needed — the data (`related_entity_type`) is already part of `TaskWithRelations` via the `tasks` table row type.

