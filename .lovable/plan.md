

## Plan: Add Attachment Upload Popover to Task Row 📎 Cell

### What's happening now
The 📎 column in `TaskRow.tsx` (line 140-145) currently displays a static attachment count. Clicking it does nothing. The upload functionality only exists inside the task detail view (`TaskAttachments.tsx`).

### What needs to change

**1. Make the attachment count cell clickable with a Popover**
- In `TaskRow.tsx`, wrap the attachments cell in a `Popover` that opens on click.
- The popover content will contain:
  - An "Attach file" button that triggers a hidden `<input type="file" multiple>`.
  - A list of existing attachments (reusing `useTaskAttachments` hook) with download/delete actions.
  - 20MB per-file limit validation (already in the upload hook).

**2. Reuse existing hooks — no backend changes needed**
- `useTaskAttachments(taskId)` — fetches attachments for the task.
- `useUploadTaskAttachment()` — uploads to the `task-attachments` storage bucket and inserts the DB record.
- `useDeleteTaskAttachment()` — removes from storage and DB.
- The `task_attachments` table and `task-attachments` storage bucket already exist.

**3. Component structure**

```text
TaskRow attachments cell
└─ Popover (280px, matching selector pattern)
   ├─ Header: "Attachments" + count
   ├─ File list (scrollable, max 240px)
   │   └─ Per file: icon + name + size + download + delete
   ├─ "Attach file" Button
   └─ Hidden <input type="file" multiple />
```

**4. Files to edit**
- **`src/components/tasks/TaskRow.tsx`** — Replace the static attachment count `<span>` (lines 140-145) with a `Popover` component containing the upload/list UI. Import `Popover`/`PopoverTrigger`/`PopoverContent`, the three attachment hooks, and add the file input + handlers (modeled directly on `TaskAttachments.tsx`).

No new files, no database migrations, no new hooks needed. This is a single-file UI change reusing all existing infrastructure.

