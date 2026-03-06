

## Add Comment Popover to Task Row Comments Cell

### Summary
Replace the static comment count in the task list row with a clickable popover that shows the list of comments and allows adding new ones — matching the screenshot's UI pattern (comment bubble with author, timestamp, content, and a reply input).

### Changes

| File | Change |
|------|--------|
| `src/components/tasks/TaskRow.tsx` | Replace the `comments` case (lines 252-257) with a new `CommentCell` component that renders a `Popover`. The trigger shows the comment count with a chat icon. The popover content (280-300px wide) displays: (1) a scrollable list of comments with avatar, author name, timestamp, and content, (2) an input + send button at the bottom to add a new comment. Uses existing `useTaskComments` and `useCreateTaskComment` hooks. |

### Implementation Detail

**CommentCell component** (inline in TaskRow.tsx or extracted):
- Props: `taskId`, `organizationId`, `count` (initial count from list query)
- Uses `useTaskComments(taskId)` — only enabled when popover is open (lazy load)
- Uses `useCreateTaskComment()` for adding
- Also invalidates the parent task list query on successful comment creation so the count updates
- UI structure:
  - Trigger: `<button>` with `MessageSquare` icon + count, styled like the existing attachment cell trigger
  - Content: `<PopoverContent className="w-80 p-0">` with:
    - Header: "Comments" title
    - ScrollArea (max-h-60): list of comments showing avatar, name, relative time, content
    - Footer: input + send button (similar to the screenshot's "Reply" area)
- Comment display matches screenshot: author avatar, name, date, content text, with subtle separators

