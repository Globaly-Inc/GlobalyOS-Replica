

## Add Tags Under Task Name + Hide Tags Column

### Changes

**1. `src/components/tasks/TaskRow.tsx`** — Update the `name` cell (lines 258-285)

Change layout from single-row to `flex-col`. Add a second row below the title showing tags inline with a `TagsSelector` popover. Show max 2 tag badges + a "+N" badge for overflow. The tags are interactive (click opens the existing `TagsSelector` to add/remove).

```text
Row 1: [● Status] [Category] Task Title
Row 2: [tag1] [tag2] [+1]        ← only if tags exist, clickable to manage
```

- Reuse the existing `TagsSelector` component wrapping the tags display
- Show first 2 tags as small outline badges, then `+N` if more exist
- Entire tags row is the trigger for the `TagsSelector` popover

**2. `src/components/tasks/TaskColumnCustomizer.tsx`** — Set `tags` column `visible: false` by default (line 250 area / DEFAULT_COLUMNS), since tags now appear under the task name.

