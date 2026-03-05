

## Merge Comments & Activity into a Single "Comments & Logs" Timeline

### What Changes

**File: `src/components/tasks/TaskDetailPage.tsx`**

1. **Remove the tab switcher** — replace the two-tab header (Comments / Activity) with a single "Comments & Logs" heading.

2. **Merge and sort chronologically** — combine `comments` and `activityLogs` into one array, each tagged with a `type` field (`'comment'` or `'activity'`), sorted by `created_at` descending (newest first).

3. **Unified rendering** — render each item in a single scrollable list:
   - **Activity logs**: Show avatar + name in bold, then the action description inline (e.g. "Updated the Priority to **Urgent**"), with timestamp on the right — matching the reference image style.
   - **Comments**: Show avatar + name + timestamp, then the comment content in a light rounded bubble (`bg-muted` card), matching the reference image.

4. **Remove `activeTab` state** — no longer needed.

5. **Keep the comment input** at the bottom unchanged.

### Visual Style (per reference image)

- Activity entries: single-line with inline action text, no background bubble
- Comment entries: name + timestamp row, then content in a `rounded-lg bg-muted/50 px-3 py-2` bubble
- Both use the same avatar size (`h-6 w-6`) and timestamp format (`d MMM yyyy HH:mm a`)

