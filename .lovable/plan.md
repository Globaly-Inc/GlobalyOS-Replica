
# Drag and Drop Favorites Reordering

## Overview

Enable users to drag and drop their favorite chats to reorder them smoothly. The order will persist in the database so it remains consistent across sessions.

## Technical Approach

### 1. Database Schema Update

Add a `sort_order` column to the `chat_favorites` table to persist the position of each favorite.

```sql
ALTER TABLE chat_favorites 
ADD COLUMN sort_order integer DEFAULT 0;
```

Update existing favorites to have sequential sort orders based on their creation date:

```sql
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY employee_id, organization_id 
    ORDER BY created_at ASC
  ) - 1 as new_order
  FROM chat_favorites
)
UPDATE chat_favorites 
SET sort_order = ordered.new_order
FROM ordered 
WHERE chat_favorites.id = ordered.id;
```

### 2. Install `@dnd-kit/sortable` Package

The project already has `@dnd-kit/core` and `@dnd-kit/utilities`. For vertical list reordering, we need to add `@dnd-kit/sortable` which provides:
- `SortableContext` - Container for sortable items
- `useSortable` - Hook combining draggable + droppable
- `arrayMove` - Utility to reorder arrays
- `verticalListSortingStrategy` - Optimized for vertical lists

### 3. Create Sortable Favorite Item Component

**New File: `src/components/chat/SortableFavoriteItem.tsx`**

A wrapper component that makes each favorite item sortable:

```text
Props:
├── id: string (unique sortable ID)
├── children: ReactNode (the favorite button content)
└── disabled?: boolean
```

Uses `useSortable` hook from dnd-kit which provides:
- `attributes` - Accessibility attributes
- `listeners` - Drag event listeners  
- `setNodeRef` - Ref for the DOM element
- `transform` - CSS transform during drag
- `transition` - CSS transition for smooth animations
- `isDragging` - Boolean for styling active item

### 4. Update FavoritesSection Component

**File: `src/components/chat/FavoritesSection.tsx`**

Key changes:
1. Import DnD components from `@dnd-kit/core` and `@dnd-kit/sortable`
2. Wrap the favorites list in `DndContext` and `SortableContext`
3. Replace static buttons with `SortableFavoriteItem` wrappers
4. Add `handleDragEnd` to compute new order and persist
5. Use optimistic UI update for smooth experience
6. Add visual drag handle or cursor indicator

**Visual Layout:**

```text
┌─────────────────────────────────────────┐
│ ▸ ★ FAVORITES                           │
├─────────────────────────────────────────┤
│ ⋮⋮ [Avatar] Laxmi Bhatta          ★    │  ← Draggable
│ ⋮⋮ [Avatar] Kavita M Bond         ★    │  ← Draggable  
│ ⋮⋮ [Avatar] Sarah Smith           ★    │  ← Being dragged
│ ⋮⋮ [Icon] GlobalyOS Chat Test     ★    │  ← Drop zone indicator
└─────────────────────────────────────────┘
```

### 5. Add Reorder Mutation Hook

**File: `src/hooks/useChatFavorites.ts`**

Add a new mutation `useReorderFavorites` that:
1. Accepts an array of favorite IDs in the new order
2. Updates each favorite's `sort_order` in the database
3. Uses optimistic updates for instant visual feedback
4. Invalidates cache on success

```typescript
export const useReorderFavorites = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      // Update each favorite with its new sort_order
      const updates = orderedIds.map((id, index) => 
        supabase
          .from('chat_favorites')
          .update({ sort_order: index })
          .eq('id', id)
      );
      await Promise.all(updates);
    },
    onMutate: async (orderedIds) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['chat-favorites'] });
      
      // Optimistically update the cache order
      const previous = queryClient.getQueryData(['chat-favorites']);
      queryClient.setQueryData(['chat-favorites'], (old) => {
        // Reorder based on orderedIds
      });
      return { previous };
    },
    onError: (err, vars, context) => {
      // Rollback on error
      queryClient.setQueryData(['chat-favorites'], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-favorites'] });
    },
  });
};
```

### 6. Update Query to Order by sort_order

**File: `src/hooks/useChatFavorites.ts`**

Change the query to order by `sort_order` instead of `created_at`:

```typescript
.order('sort_order', { ascending: true })
```

## Implementation Details

### Drag-and-Drop Configuration

| Setting | Value | Purpose |
|---------|-------|---------|
| Activation constraint | `distance: 5` | Prevent accidental drags on click |
| Sorting strategy | `verticalListSortingStrategy` | Optimized animations for vertical lists |
| Collision detection | `closestCenter` | Best for single-column lists |

### Visual Feedback During Drag

- **Dragging item**: Slightly elevated with shadow, reduced opacity on original position
- **Drop indicator**: Subtle line or gap where item will be placed
- **Smooth animations**: CSS transitions for position changes (200ms ease)
- **Cursor**: `grab` on hover, `grabbing` while dragging

### Accessibility

- Keyboard support via dnd-kit's built-in accessibility features
- Screen reader announcements for drag start/end
- Focus management after reorder

## Files to Create/Modify

| File | Change |
|------|--------|
| `package.json` | Add `@dnd-kit/sortable` dependency |
| Database migration | Add `sort_order` column to `chat_favorites` |
| `src/hooks/useChatFavorites.ts` | Add `useReorderFavorites` mutation, update query order |
| `src/components/chat/SortableFavoriteItem.tsx` | **New** - Sortable wrapper component |
| `src/components/chat/FavoritesSection.tsx` | Add DnD context and reorder logic |

## Performance Considerations

1. **Optimistic updates**: Immediate visual feedback without waiting for database
2. **Batch updates**: Single request to update all positions (or individual updates in parallel)
3. **Debounce**: Optional debounce for rapid reordering to reduce API calls
4. **CSS transforms**: Hardware-accelerated animations via transform instead of top/left

## User Experience

1. Hover on a favorite shows a subtle drag handle or changes cursor to `grab`
2. Dragging lifts the item with a shadow effect
3. Other items smoothly shift to make room
4. Dropping places the item in the new position instantly
5. Order persists across page refreshes and sessions
