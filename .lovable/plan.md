

## Fix: Image icon URLs displayed as text instead of images

### Problem
When a space has an uploaded image icon (stored as a URL), the URL is rendered as visible text in multiple places instead of as an image.

### Root Cause
Several places render `space.icon` or `sp.icon` directly as text via `<span>{icon}</span>` without checking if the icon is an image URL. Only `Tasks.tsx` header has the `isImageIcon` check, but the sidebar space name area and the ProjectDashboard sub-projects section lack it.

### Changes

| File | Change |
|------|--------|
| `src/components/tasks/TaskInnerSidebar.tsx` (~line 295) | Ensure the space name `<span>` does not accidentally display the icon URL — verify the sidebar layout so the `SpaceIconPicker` image doesn't overflow into text areas. Add `overflow-hidden` and `min-w-0` to contain the icon picker properly. |
| `src/components/tasks/ProjectDashboard.tsx` (line 134) | Replace `<span>{sp.icon || '📂'}</span>` with an image-aware render: use `isImageIcon(sp.icon)` to decide between rendering an `<img>` tag or an emoji `<span>`. Import `isImageIcon` from `SpaceIconPicker`. |
| `src/pages/Tasks.tsx` (lines 126-129) | Already correct — renders `<img>` for image icons. No change needed. |

### Detail

**ProjectDashboard.tsx** — line 134 fix:
```tsx
// Before:
<span>{sp.icon || '📂'}</span>

// After:
{isImageIcon(sp.icon) 
  ? <img src={sp.icon} alt="" className="h-4 w-4 rounded object-cover inline" />
  : <span>{sp.icon || '📂'}</span>}
```

**TaskInnerSidebar.tsx** — ensure the space row layout prevents icon URL text leakage. The `SpaceIconPicker` button has a fixed size (`h-8 w-8`), but the parent flex container needs `min-w-0` on the name span and `overflow-hidden` on the row to prevent any URL text from leaking out of the icon area. Currently the space name span at line 295 has `truncate flex-1` which should work, but adding `min-w-0` to the flex row ensures proper truncation behavior.

