

## Recommendation: Where to Add a "Save" Button for Inline Task Creation

Currently the inline creation row (line 392-405) only has an **X (cancel)** button in the trailing actions column (line 400-404). The user saves by pressing **Enter** in the name field — there is no explicit Save button.

### Recommended placement

Add a **Save (check-mark) button next to the existing X button** in the trailing actions column (line 400-404). This keeps the layout consistent and groups both actions together.

```text
Before:                    After:
 [ ... fields ... ] [X]    [ ... fields ... ] [✓] [X]
```

### Implementation

**File: `src/components/tasks/TaskListView.tsx`** (lines 400-404)

Replace the single X button `<div>` with a two-button group:
- A **check-mark (Save)** button that calls `handleCreateInline(status.id)` — same as Enter key does.
- The existing **X (Cancel)** button unchanged.

Both buttons stay at `h-6 w-6` icon size. The Save button uses a green accent color (`text-green-600`) to visually distinguish it from the cancel button.

One-file, three-line change. No new components or hooks needed.

