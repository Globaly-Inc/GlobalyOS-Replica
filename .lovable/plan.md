

## Fix: Always Show Priority and Due Date in CRM Task List

### Problem

The `CRMLinkedTasks` component conditionally hides priority and due date:
- **Priority** is hidden when set to `normal` (line 83: `task.priority !== 'normal'`)
- **Due date** is hidden when not set (line 88: `task.due_date &&`)

Since the default priority is "normal" and due date is optional, most newly created tasks only show the assignee avatar.

### Fix

**File: `src/components/crm/CRMLinkedTasks.tsx`**

1. **Always show priority** — remove the `!== 'normal'` condition so every task displays its priority badge (urgent, high, normal, low)
2. **Always show due date** — when no due date is set, display "No due date" in muted text so the field is always visible

This keeps the layout consistent and informative for every task in the list.

