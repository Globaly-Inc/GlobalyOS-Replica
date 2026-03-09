

## Make Category Pill in Task Name Column Clickable to Change Category

### Problem
The category pill (e.g., "Email") displayed inline in the Name column (line 388-399 of `TaskRow.tsx`) is a static `<span>`. It shows the category but does not allow changing it. The `CategorySelector` component already exists and is used in the standalone "category" column — it just needs to be wrapped around the inline pill too.

### Plan

**File: `src/components/tasks/TaskRow.tsx`**

Wrap the existing category `<span>` (lines 388-399) with the `CategorySelector` component, converting it into a clickable trigger that opens the category dropdown:

```tsx
{/* Before: static span */}
{task.category && (
  <span className="...">...</span>
)}

{/* After: wrapped in CategorySelector */}
<CategorySelector
  value={task.category_id}
  categories={categories}
  onChange={(id) => handleUpdate('category_id', id)}
>
  <button
    type="button"
    onClick={(e) => e.stopPropagation()}
    className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 hover:opacity-80 transition-opacity"
    style={{
      backgroundColor: task.category ? `${task.category.color}20` : undefined,
      color: task.category?.color || '#6b7280',
    }}
  >
    {task.category ? (
      <>
        <CategoryIcon iconName={task.category.icon} fallbackColor={task.category.color} size={10} />
        {task.category.name}
      </>
    ) : '—'}
  </button>
</CategorySelector>
```

Key points:
- The pill is always rendered (not gated by `task.category`) so users can also assign a category when none exists.
- `e.stopPropagation()` prevents the row click from firing when selecting a category.
- No new components or imports needed — `CategorySelector` is already imported.

