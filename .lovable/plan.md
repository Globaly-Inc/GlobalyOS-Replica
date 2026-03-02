

## Make Task Columns Reorderable via Drag & Drop

### Problem
The column headers and their order are static. The `TaskColumnCustomizer` popover already shows a grip handle icon but doesn't actually support drag-to-reorder.

### Plan

**1. Add drag-and-drop reordering to `TaskColumnCustomizer.tsx`**

- Import `DndContext`, `closestCenter`, `KeyboardSensor`, `PointerSensor`, `useSensor`, `useSensors` from `@dnd-kit/core`
- Import `SortableContext`, `verticalListSortingStrategy`, `useSortable`, `arrayMove` from `@dnd-kit/sortable`
- Wrap the column list in `DndContext` + `SortableContext`
- Create a small `SortableColumnItem` component (or inline) that uses `useSortable` on each column row, attaching the existing `GripVertical` icon as the drag handle
- On `onDragEnd`, call `onColumnsChange` with the reordered array (using `arrayMove`)
- The "Name" column can still be dragged to reorder its position but cannot be hidden

**2. No changes needed to `TaskListView.tsx`, `TaskRow.tsx`, or `TaskQuickAdd.tsx`**

These components already render columns based on the order of the `visibleColumns` array. Reordering the array in the customizer will automatically reorder headers and cell rendering everywhere.

**3. No changes needed to `Tasks.tsx`**

The `columns` state and `setColumns` are already wired correctly; the customizer just needs to call `onColumnsChange` with the reordered array.

### Technical Notes
- `@dnd-kit/core` and `@dnd-kit/sortable` are already installed in the project
- The existing `GripVertical` icon in the customizer will become a functional drag handle
- Column order persists in the component's state for the session (same as current visibility toggles)

