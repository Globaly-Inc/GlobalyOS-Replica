

## Fix Column Header & Content Alignment in Task List

### Problem
Column headers and their corresponding cell content are not left-aligned on the same vertical line. Root causes:

1. **Header row** (`TaskListView.tsx` line 316) lacks `items-center` for vertical alignment
2. **Task row cell wrappers** (`TaskRow.tsx` line 305) — each cell is wrapped in a bare `<div>` without alignment classes, causing content to float inconsistently
3. **Comments & Attachments columns** — both header and cells use `text-center`, but the cell wrapper `<div>` doesn't propagate this alignment
4. **Priority column** — header is left-aligned text but the cell uses `inline-flex` with a badge, causing visual offset

### Current UI (before fix)

```text
Header:  | Name          | Category | Assignee | Tags   | 💬  | 📎  | Priority |
Row:     |  ● Task title | Email    |  👤 Kav  | new... |  —  |  📎 |  Normal  |
                                                           ^      ^       ^
                                              These columns may appear offset
                                              due to missing alignment on wrapper divs
```

### Proposed Fix (after fix)

```text
Header:  | Name          | Category | Assignee | Tags   | 💬 | 📎 | Priority |
Row:     | ● Task title  | Email    | 👤 Kavita| new    |  0 | 📎 | Normal   |
         All columns aligned on the same left edge (or center for icon columns)
```

### Changes

| File | Change |
|------|--------|
| `src/components/tasks/TaskListView.tsx` | Add `items-center` to the header row grid div (line 316) so header labels are vertically centered. |
| `src/components/tasks/TaskRow.tsx` | Add alignment classes to the cell wrapper `<div>` on line 305: for `comments` and `attachments` columns add `text-center`, for all columns add `flex items-center` or `min-w-0` to ensure consistent left alignment with headers. |

### Implementation Detail

**TaskListView.tsx (header row)**
- Line 316: Add `items-center` to the grid className so headers vertically align with row content.

**TaskRow.tsx (cell wrappers)**
- Line 305: Change `<div key={col.key}>{renderCell(col)}</div>` to include conditional alignment:
  - For `comments` and `attachments`: add `text-center` and `flex items-center justify-center`
  - For all other columns: add `min-w-0` (to support truncation) and `flex items-center`
- This ensures every cell's content starts at the same left edge as its header (or centers for icon columns).

