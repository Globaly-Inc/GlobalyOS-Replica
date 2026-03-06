

## Add Category Icons to Task Views

### Summary
Categories already store an `icon` field in the database (kebab-case lucide icon names like `mail`, `phone`, `bell`, `phone-call`). The UI currently ignores this field and only shows a colored dot or colored text. The plan is to render the actual lucide icon alongside the category name everywhere categories appear.

### Changes

**1. Create a small utility component: `src/components/tasks/CategoryIcon.tsx`**
- Maps the `icon` string (kebab-case lucide name) to the corresponding lucide-react component using the `icons` map from `lucide-react`.
- Falls back to a colored dot if no icon matches.
- Accepts `size`, `color`, and `className` props.

**2. Update `TaskInlineCellEditors.tsx` — CategorySelector popover**
- Replace the small colored dot (`h-2 w-2 rounded-full`) with the `CategoryIcon` component for each category option in the dropdown.

**3. Update `TaskRow.tsx` — Category pill in the Name column (line ~324)**
- Add the `CategoryIcon` before `task.category.name` in the inline category badge.

**4. Update `TaskRow.tsx` — Standalone Category column cell (line ~363)**
- Add the icon next to the category name text in the standalone column.

**5. Update `TaskBoardView.tsx` — Board card category badge (line ~414)**
- Replace the small colored dot with the `CategoryIcon` in the board card badge.

**6. Update `TaskListView.tsx` — Inline creation row category cell (line ~204)**
- Add icon next to category name in the inline creation row.

### Result
All category displays will show the matching lucide icon (like the reference image: envelope for Email, phone for Call, bell for Reminder) with the category color, matching the design pattern shown in the uploaded screenshot.

