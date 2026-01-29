
# Fix Favorites Drag-and-Drop Reordering

## Issues Identified

1. **Order not saving**: The `chat_favorites` table is missing an UPDATE RLS policy, so the `sort_order` updates are silently blocked by the database
2. **Drag icon always visible**: User wants drag handles hidden by default, only visible after clicking an "Arrange" button

---

## Solution

### Fix 1: Add Missing UPDATE Policy (Database)

Create an RLS policy that allows users to update their own favorites:

```sql
CREATE POLICY "Users can update own favorites" 
ON public.chat_favorites 
FOR UPDATE 
USING (
  employee_id = (
    SELECT employees.id FROM employees 
    WHERE employees.user_id = auth.uid() 
    AND employees.organization_id = chat_favorites.organization_id
  )
)
WITH CHECK (
  employee_id = (
    SELECT employees.id FROM employees 
    WHERE employees.user_id = auth.uid() 
    AND employees.organization_id = chat_favorites.organization_id
  )
);
```

### Fix 2: Add Arrange Mode Toggle (UI)

Add state to control when drag handles are visible:

| Component | Change |
|-----------|--------|
| `FavoritesSection.tsx` | Add `isArranging` state and toggle button |
| `SortableFavoriteItem.tsx` | Accept `showHandle` prop to control visibility |

**UI Behavior:**
- Default: Drag handles hidden, items behave as normal clickable buttons
- "Arrange" mode: Click icon next to Favorites title to enable
- In arrange mode: Drag handles visible, reordering enabled
- Click icon again (or click elsewhere) to exit arrange mode

---

## Files to Modify

| File | Changes |
|------|---------|
| Database migration | Add UPDATE policy for `chat_favorites` |
| `src/components/chat/FavoritesSection.tsx` | Add arrange mode toggle button and state |
| `src/components/chat/SortableFavoriteItem.tsx` | Add `showHandle` prop for conditional visibility |

---

## Expected Result

- Drag and drop will **persist** the new order to the database
- Drag handles only appear when user clicks the "Arrange" button
- Clean, uncluttered default view of favorites
