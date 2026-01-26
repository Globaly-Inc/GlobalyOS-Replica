

## Plan: Remove Upload Dialog and Open File Picker Directly

### Problem
Currently, clicking "Upload file", "Upload image", or "Upload video" opens an intermediate dialog with drag-and-drop functionality. The user wants to skip this dialog and open the operating system's file picker (Finder on Mac, File Explorer on Windows) directly.

---

### Solution Overview

Replace the `openUploadDialog()` function with a new `triggerFilePicker()` function that:
1. Sets the appropriate file type filter
2. Programmatically clicks a hidden file input to open the OS file picker
3. Adds selected files directly to the composer's file list

---

### Implementation Details

**File:** `src/components/chat/MessageComposer.tsx`

#### 1. Remove Dialog-Related State and Imports

Remove these as they will no longer be needed:
- `uploadDialogOpen` state (line 87)
- `isDragging` state (line 90)  
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` imports (lines 11-15)
- `Upload` icon import (line 29) - only used in dialog

#### 2. Replace `openUploadDialog` Function

**Current (line 349-353):**
```typescript
const openUploadDialog = (type: "file" | "image" | "video") => {
  setUploadType(type);
  setSelectedFiles([]);
  setUploadDialogOpen(true);
};
```

**Replace with:**
```typescript
const triggerFilePicker = (type: "file" | "image" | "video") => {
  setUploadType(type);
  // Trigger the hidden file input after state update
  setTimeout(() => {
    fileInputRef.current?.click();
  }, 0);
};
```

#### 3. Move Hidden File Input Outside Dialog

Move the `<input type="file">` element from inside the Dialog (line 690-697) to somewhere always rendered in the component (e.g., near the top of the return statement).

```typescript
{/* Hidden file input for direct file picker */}
<input
  ref={fileInputRef}
  type="file"
  multiple
  accept={
    uploadType === "image" 
      ? ALLOWED_IMAGE_TYPES.join(",") 
      : uploadType === "video" 
      ? ALLOWED_VIDEO_TYPES.join(",") 
      : ALLOWED_FILE_TYPES.join(",")
  }
  onChange={(e) => {
    handleFileSelect(e.target.files);
    // Reset input value so same file can be selected again
    e.target.value = '';
  }}
  className="hidden"
/>
```

#### 4. Update Button Click Handlers

**Change from (lines 581-604):**
```typescript
onClick={() => openUploadDialog("file")}
onClick={() => openUploadDialog("image")}
onClick={() => openUploadDialog("video")}
```

**To:**
```typescript
onClick={() => triggerFilePicker("file")}
onClick={() => triggerFilePicker("image")}
onClick={() => triggerFilePicker("video")}
```

#### 5. Remove Entire Upload Dialog Section

Delete the entire Dialog component (lines 669-764):
```typescript
{/* Upload Dialog */}
<Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
  ...
</Dialog>
```

#### 6. Remove Drag-and-Drop Handlers

These functions are only used in the dialog and can be removed:
- `handleDragEnter` (lines 385-389)
- `handleDragLeave` (lines 391-395)
- `handleDragOver` (lines 397-400)
- `handleDrop` (lines 402-407)
- `confirmUpload` (lines 420-422)

---

### Summary of Changes

| What | Action |
|------|--------|
| `uploadDialogOpen` state | Remove |
| `isDragging` state | Remove |
| `openUploadDialog` function | Replace with `triggerFilePicker` |
| Dialog imports | Remove (`Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`) |
| `Upload` icon import | Remove |
| Drag-and-drop handlers | Remove (`handleDragEnter`, `handleDragLeave`, `handleDragOver`, `handleDrop`) |
| `confirmUpload` function | Remove |
| Hidden file input | Move outside dialog, always render |
| Button click handlers | Update to call `triggerFilePicker` |
| Entire Dialog component | Remove (lines 669-764) |

---

### User Experience After Changes

1. User clicks + button → Popover appears with options
2. User clicks "Upload file" / "Upload image" / "Upload video"
3. **OS file picker opens immediately**
4. User selects files
5. Files appear in the preview area above the message input (existing behavior)
6. User can send the message with attachments

---

### Technical Notes

- The `setTimeout(..., 0)` ensures the file input's `accept` attribute is updated before the click is triggered
- Resetting `e.target.value = ''` allows the same file to be selected again if needed
- The Popover will automatically close when clicking an option (existing behavior)

