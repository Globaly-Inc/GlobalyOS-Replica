

## Make "Related to" Badge Interactive in Task List Row

### What changes

**File: `src/components/tasks/TaskRow.tsx`**

Replace the static `Badge` (lines 410-414) with the existing `RelatedToPopover` component, making it clickable to view/change the linked entity. Also show "Related to" text label instead of just the entity type badge.

**Specifically:**

1. Import `RelatedToPopover` from `./RelatedToPopover`
2. Replace the static badge block with:

```tsx
<RelatedToPopover
  entityType={task.related_entity_type}
  entityId={task.related_entity_id}
  onUpdate={(type, id) => {
    handleUpdate('related_entity_type', type);
    handleUpdate('related_entity_id', id);
  }}
>
  <button
    type="button"
    onClick={(e) => e.stopPropagation()}
    className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded hover:bg-muted transition-colors text-muted-foreground"
  >
    <Link2 className="h-2.5 w-2.5" />
    <span>Related to: {entityTypeLabel}</span>
  </button>
</RelatedToPopover>
```

3. Show this for all tasks (not just those with existing relations) — so users can also **add** a relation from the list view. When no relation exists, show a subtle "Related to" link.

4. Compute entity type label as: `task.related_entity_type ? capitalize(task.related_entity_type) : 'None'`

No new files or database changes needed. Reuses the existing `RelatedToPopover` component already used in `TaskDetailPage`.

