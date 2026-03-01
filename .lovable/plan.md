

## Fix: Attachments Column in Inline Creation Row

The selected 📎 element is the **column header** in `TaskListView.tsx` (line 351). The inline creation row (line 271) currently renders a static dash `—` for the attachments column because a task doesn't exist yet at that point — there's no `taskId` to attach files to.

The `AttachmentCell` popover in `TaskRow.tsx` already works correctly for **existing tasks**. The issue is that the inline creation row can't support attachments because the task hasn't been created yet.

### Approach

**Defer attachment to post-creation**: After the inline task is created via `handleCreateInline`, automatically open the task detail (or flash the attachment popover) so the user can immediately attach files. This is the cleanest pattern since attachments require a `taskId` and `organizationId` to upload to storage.

**Implementation — single file change in `TaskListView.tsx`:**

1. Replace the static `—` for the `attachments` case (line 271-272) with a disabled 📎 button styled with a tooltip hint like "Save task first to attach files".
2. After `handleCreateInline` succeeds and returns the new task ID, auto-click/open the task so the user lands on the attachment popover immediately.

This keeps the UX honest — you can't upload to a task that doesn't exist — while making the path to "attach after create" seamless.

