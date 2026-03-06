

## Add Activity Logging for Task Updates

### Problem
Currently, only task **creation** logs an entry to `task_activity_logs`. All other task mutations (status change, priority change, assignee change, tag updates, description edits, checklist operations, comments, attachments, follower changes, etc.) produce no activity log entries. The "Comments & Logs" panel in the Task Detail Page shows very few logs.

### Solution
Add activity logging to `useUpdateTask` in `src/services/useTasks.ts` so that every field change is recorded, and also log checklist, comment, attachment, and follower actions.

### Changes

**File: `src/services/useTasks.ts`**

1. **`useUpdateTask`** — After the update succeeds, insert a `task_activity_logs` entry for each changed field. The mutation already receives the field names in the `updates` object. Log entries like:
   - `status_changed` (with old/new status_id)
   - `priority_changed`
   - `assignee_changed`
   - `due_date_changed`
   - `tags_updated`
   - `description_updated`
   - `title_updated`
   - `category_changed`
   - Generic `field_updated` fallback

2. **`useCreateTaskComment`** — Add a log entry: `commented`

3. **`useCreateTaskChecklist`** — Add a log entry: `checklist_item_added`

4. **`useUpdateTaskChecklist`** — Add a log entry: `checklist_item_toggled` (when `is_done` changes)

5. **`useDeleteTaskChecklist`** — Add a log entry: `checklist_item_removed`

6. **`useToggleTaskFollower`** — Add a log entry: `follower_added` / `follower_removed`

Each log insert will include `organization_id`, `task_id`, `actor_id` (current employee), `action_type`, and optionally `old_value`/`new_value` as JSON.

Also invalidate `task-activity-logs` query key in `onSuccess` of each mutation so the logs panel updates immediately.

**File: `src/components/tasks/TaskDetailPage.tsx`**
- No changes needed; the panel already renders activity logs from the `useTaskActivityLogs` query.

