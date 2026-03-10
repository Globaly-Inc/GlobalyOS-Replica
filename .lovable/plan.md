

## Fix Column Resizing + Freeze First/Last Columns

### Problems Identified

1. **Crash on resize**: The `handleMouseDown` callback in `useColumnResize` has `widths` in its dependency array. Every drag movement calls `setWidths`, which recreates `handleMouseDown`, but the `onMouseMove` closure still references the old `draggingRef`. The stale closure combined with rapid re-renders causes "Maximum update depth exceeded" crashes.

2. **Name column not resizable**: The `name` column uses `1fr` (flex), so dragging its right-edge handle actually targets the *next* column's key, which is confusing and inconsistent.

3. **No frozen columns**: First (Name/checkbox) and last (actions) columns scroll away with horizontal scroll.

4. **State not persisted**: Widths reset on every mount since they're only in React state.

### Plan

**1. Rewrite `useColumnResize` hook** (`src/hooks/useColumnResize.ts`)

- Remove `widths` from `handleMouseDown`'s dependency array. Use a `widthsRef` that mirrors state so the mousemove closure always reads the latest value without causing callback identity changes.
- Give the `name` column a default pixel width (e.g., 300px) instead of `1fr` so it can be resized like any other column. The first frozen section will handle its fluid appearance.
- Persist widths to `localStorage` keyed by `spaceId` (or a stable key) so resized widths survive across sessions.

**2. Restructure the grid layout for frozen columns** (`src/components/tasks/TaskListView.tsx` + `TaskRow.tsx`)

Replace the single CSS Grid with a 3-section layout per row using `position: sticky`:

```text
┌──────────────────┬──────────────────────────────────┬────────┐
│  FROZEN LEFT     │  SCROLLABLE MIDDLE               │ FROZEN │
│  (Checkbox+Name) │  (Category, Assignee, Tags, ...) │ RIGHT  │
│  sticky left:0   │  normal flow                     │ sticky │
│                  │                                  │ right:0│
└──────────────────┴──────────────────────────────────┴────────┘
```

- Use a `<table>` or `display: table` approach with `position: sticky` on `<th>`/`<td>` for first and last columns (this is the proven Excel/Google Sheets pattern).
- Alternatively, keep CSS Grid but wrap in a horizontally-scrollable container where the Name column cell and Actions column cell use `position: sticky; left: 0` / `right: 0` with a `bg-card` background to cover scrolling content.

**3. Resize handles**

- Place a thin `<div>` on the right edge of each column header with `cursor: col-resize`.
- On mousedown, track `startX` and `startWidth` via refs (not closures over state).
- On mousemove, compute new width and update both `widthsRef.current` and `setWidths`.
- On mouseup, persist to `localStorage`.
- Show a visual blue guide line during drag for better UX feedback.

**4. Persist column widths** (in `useColumnResize`)

- On mount: read from `localStorage` (`task-col-widths-{spaceId}`).
- On mouseup (resize end): write to `localStorage`.
- Widths stay in React state for rendering; localStorage is the persistence layer.

### Files to Change

| File | Change |
|---|---|
| `src/hooks/useColumnResize.ts` | Rewrite: use `widthsRef`, give `name` a pixel default, add localStorage persistence, fix stale closure bug |
| `src/components/tasks/TaskListView.tsx` | Apply `sticky` positioning to Name (left) and Actions (right) columns in headers, inline row, and add-task row; pass `spaceId` to `useColumnResize` |
| `src/components/tasks/TaskRow.tsx` | Apply matching `sticky` positioning to Name and Actions cells |

