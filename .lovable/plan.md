

## Drag-and-Drop Column Reordering for Board View

### How It Works Today
The board view (`TaskBoardView.tsx`) already uses `@dnd-kit` for dragging **task cards** between status columns. Columns themselves are static — rendered in the order `statuses` are provided.

### Plan

**Concept**: Make the entire status columns sortable using `@dnd-kit`'s `horizontalListSortingStrategy`. When a user drags a column header, the columns visually reorder. On drop, the new order is persisted by updating each status's `sort_order` in the database.

**Changes to `src/components/tasks/TaskBoardView.tsx`**:
1. Maintain local `columnOrder` state (array of status IDs) derived from `statuses`, sorted by `sort_order`.
2. Wrap the columns container in a second `SortableContext` with `horizontalListSortingStrategy` using the column IDs.
3. Make `BoardColumn` a sortable item (via `useSortable`) — attach drag handle to the column header (the colored dot + status name area).
4. Update `handleDragEnd` to detect whether the dragged item is a **column** (status ID) or a **task card** (task ID), and handle each case:
   - **Task drag**: existing logic (move task to new status).
   - **Column drag**: reorder the `columnOrder` array and persist new `sort_order` values.
5. Add a `DragOverlay` variant for columns (a semi-transparent column preview).

**Distinguishing tasks from columns during drag**: Use a naming convention — column sortable IDs will be prefixed (e.g. `column-{statusId}`) so the drag handler can differentiate them from task IDs.

**Persistence** — new mutation to update `sort_order`:
- Add a `useReorderStatuses` mutation in `src/services/useTasks.ts` that batch-updates `sort_order` on the `task_statuses` table for the affected rows.
- Optimistically update local state for instant feedback.

**Database**: No schema changes needed — `task_statuses` already has a `sort_order` column.

**Visual affordance**: The column header will show a subtle grab cursor on hover, indicating it's draggable. During drag, the column becomes semi-transparent and a placeholder appears.

### Result
Users can grab any status column by its header and drag it left or right to reorder. The new order persists immediately and is reflected for all users viewing the board.

