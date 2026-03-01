

## Problem

The attachment count in TaskRow always shows "0" because the task queries (`useTasks`, `useMyTasks`) never fetch or compute `attachment_count`. The field exists on the `TaskWithRelations` type but is never populated from the database.

## Fix

**Add a count sub-select to the task queries** in `src/services/useTasks.ts`. Both `useTasks` (line 402) and `useMyTasks` (line 348) use a `.select()` call that currently fetches `*, status:task_statuses(*), category:task_categories(*)`. We need to add an aggregated count from `task_attachments`:

```sql
task_attachments(count)
```

This uses Supabase's built-in aggregate syntax to return the count of related `task_attachments` rows per task.

**Files to change:**

1. **`src/services/useTasks.ts`** — In both `useTasks` (line ~402) and `useMyTasks` (line ~348), add `task_attachments(count)` to the `.select()` string. Then in the mapping step (~line 383 and equivalent), extract the count:
   ```ts
   attachment_count: t.task_attachments?.[0]?.count ?? 0,
   ```

2. **`src/components/tasks/TaskRow.tsx`** — The `AttachmentCell` already receives `task.attachment_count || 0` as `count` (line 259). Additionally, since the `AttachmentCell` also fetches attachments via `useTaskAttachments`, we should update the displayed count to use the **live** count from that hook instead of the prop, so it updates immediately after upload/delete without waiting for the task list query to refetch.

**No database changes needed** — `task_attachments` already has a `task_id` foreign key to `tasks`.

