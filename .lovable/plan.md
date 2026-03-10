

## Plan: Fix Column Customizer Behavior

### Changes to `src/components/tasks/TaskColumnCustomizer.tsx`

1. **Update DEFAULT_COLUMNS** — new ordering, hide `category` and `tags`, remove `attachments` from defaults:
   - Name (visible, locked)
   - Assignee (visible)
   - Due Date (visible)
   - Comments (visible)
   - Priority (visible)
   - Related To (visible)
   - Attachments (visible)
   - Category and Tags removed from the list entirely (already rendered in Name column)

2. **Lock Name column** — In `SortableColumnItem`, when `col.key === 'name'`: hide the drag handle, disable the switch, and make it non-sortable. In `handleDragEnd`, prevent any reorder that would move Name away from index 0 or move another column before it.

3. **Filter out `category` and `tags`** from the customizer UI list entirely (they stay in code but are never shown in the column manager).

4. **Auto-save on every change** — The `onColumnsChange` callback already persists via `usePersistedColumns`. No "Apply/Save" button needed. Changes are already saved automatically through the existing hook. Just need to verify the popover doesn't have any deferred save logic.

### Changes to `src/hooks/usePersistedColumns.ts`

- No changes needed — it already auto-saves on every `setColumns` call.

### Changes to `src/components/tasks/TaskColumnCustomizer.tsx` (SortableColumnItem)

- For `name` column: render without drag handle, switch always on and disabled, not draggable (disable the sortable).
- Filter the rendered list to exclude `category` and `tags` keys.
- In `handleDragEnd`: ensure Name stays at index 0 — if reorder would place it elsewhere, abort.

