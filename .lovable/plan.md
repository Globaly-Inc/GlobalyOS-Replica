

## Replace Badge with Interactive "Related to" Text + Popover

### What changes

**File: `src/components/tasks/TaskRow.tsx` (lines 410-415)**

Replace the static `Badge` with the existing `RelatedToPopover` component wrapping a clickable "Related to" text link. Show it only when the task has a related entity.

1. Import `RelatedToPopover` from `./RelatedToPopover`
2. Replace lines 410-415 with:

```tsx
{task.related_entity_type && (
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
      className="text-[10px] text-primary hover:underline cursor-pointer w-fit"
    >
      Related to
    </button>
  </RelatedToPopover>
)}
```

This shows plain "Related to" text (no badge) that, when clicked, opens the existing `RelatedToPopover` where the user can see the current contact and choose to keep it, change it, or link a different entity type.

