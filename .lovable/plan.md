

## Fix: Image icon URL displayed as text

### Problem
The `FolderSummaryView.tsx` renders `folder.icon` directly as text (`<span>{folder.icon || '📁'}</span>`) without checking if the value is an image URL. When a folder has an uploaded image icon, its URL string is displayed instead of the actual image.

### Change

**`src/components/tasks/FolderSummaryView.tsx`** (line 56):
- Import `isImageIcon` from `SpaceIconPicker`
- Replace `<span className="text-lg">{folder.icon || '📁'}</span>` with:
```tsx
{isImageIcon(folder.icon)
  ? <img src={folder.icon} alt="" className="h-5 w-5 rounded object-cover" />
  : <span className="text-lg">{folder.icon || '📁'}</span>}
```

This is the same pattern already used in `Tasks.tsx` and `ProjectDashboard.tsx`.

