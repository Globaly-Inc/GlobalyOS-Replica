

## Plan: Always Show X Button on Tag Badges

The X icon on tag badges in `TaskRow.tsx` (line 427) is currently hidden by default and only appears on hover via `opacity-0 group-hover/tag:opacity-100`.

### Change
In `src/components/tasks/TaskRow.tsx` line 427, remove `opacity-0 group-hover/tag:opacity-100` from the X icon's className so it's always visible.

