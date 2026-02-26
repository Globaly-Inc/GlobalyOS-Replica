
## Replace Emoji Picker with Image Logo Upload for Spaces

### Summary
Replace the current emoji-only icon picker on Spaces with a dual-mode system: users can either pick an emoji OR upload a custom logo image (with crop dialog), matching the team profile photo editing UX. The `icon` field already exists as `text | null` in `task_spaces`, so it can store both emoji strings and image URLs without schema changes.

### How It Works

**Detection logic:** If `icon` starts with `http` it's an image URL; otherwise it's an emoji string. This determines how the icon renders everywhere.

### Changes

**1. Rewrite `EmojiPicker.tsx` into `SpaceIconPicker.tsx`**

New component that combines:
- A clickable avatar/icon area showing the current icon (emoji or uploaded image)
- A popover (like team profile photo) with two tabs or sections:
  - **Emoji grid** -- the existing 40-emoji grid for quick selection
  - **Upload image** -- file input with validation (max 5MB, image types only), opens the existing `ImageCropper` dialog with square crop
- A small camera/edit overlay on hover (matching `EditAvatarDialog` style)
- "Remove" option to reset to default emoji

Upload flow:
1. User clicks the icon area, popover opens
2. User clicks "Upload Image" or selects a file
3. `ImageCropper` opens for square crop
4. Cropped blob uploads to `chat-attachments` bucket at `space-icons/{orgId}/{spaceId}.png`
5. Public URL (with cache-bust timestamp) saved to `task_spaces.icon` via `updateSpace`
6. Popover closes

**2. Update `TaskInnerSidebar.tsx`**

- Replace `EmojiPicker` usage with `SpaceIconPicker`
- Update the icon rendering in Space rows: if icon starts with `http`, show an `Avatar` with `AvatarImage`; otherwise render the emoji text
- Pass `spaceId` and `organizationId` to the picker for upload path

**3. Update `CreateSpaceDialog.tsx`**

- Replace `EmojiPicker` with `SpaceIconPicker` (initially no spaceId, uses temp upload path)
- After space is created, the icon URL or emoji is saved

**4. No database changes needed**

The `icon` column on `task_spaces` is already `text | null` and can store URLs.

### Files Summary

| File | Action |
|------|--------|
| `src/components/tasks/EmojiPicker.tsx` | Rewrite into `SpaceIconPicker` with emoji grid + image upload + cropper |
| `src/components/tasks/TaskInnerSidebar.tsx` | Update icon rendering to support image URLs, use new picker |
| `src/components/tasks/CreateSpaceDialog.tsx` | Use new `SpaceIconPicker` |

### Technical Details

- Reuses existing `ImageCropper` component (square crop mode)
- Uploads to `chat-attachments` bucket (already has public access and RLS)
- Path: `space-icons/{organizationId}/{spaceId or temp UUID}.png`
- Cache-busting via `?t={timestamp}` query param on URL
- Icon detection: `const isImageUrl = (icon: string) => icon.startsWith('http')`
- Permissions: Only users who can edit the space (already enforced by `updateSpace` RLS) can change the icon
