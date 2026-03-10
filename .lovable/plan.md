

## Plan: Fix RelatedTo Popover Not Opening in Task List Row

### Root Cause
In `TaskRow.tsx`, the `RelatedToPopover` wraps a `HoverCard` as its child. Inside `RelatedToPopover`, `PopoverTrigger asChild` receives `<HoverCard>` (a context provider, not a DOM element). Radix's `Slot` cannot compose with a non-DOM provider component, so the PopoverTrigger never registers the click. The click bubbles up to the row's `onClick` handler, which opens the task detail dialog.

### Fix: Restructure nesting in `TaskRow.tsx`

Swap the order so `HoverCard` wraps `RelatedToPopover`, and the button serves as trigger for both via proper Slot forwarding:

```tsx
case 'related_to':
  return task.related_entity_type && task.related_entity_id ? (
    <HoverCard openDelay={300} closeDelay={100}>
      <RelatedToPopover
        entityType={task.related_entity_type}
        entityId={task.related_entity_id}
        onUpdate={(type, id) => {
          handleUpdate('related_entity_type', type);
          handleUpdate('related_entity_id', id);
        }}
      >
        <HoverCardTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-foreground truncate w-full text-left hover:text-primary transition-colors cursor-pointer"
          >
            <RelatedEntityName entityType={...} entityId={...} />
          </button>
        </HoverCardTrigger>
      </RelatedToPopover>
      <HoverCardContent side="top" align="start" className="w-72 p-0" onClick={(e) => e.stopPropagation()}>
        <RelatedEntityCard entityType={...} entityId={...} />
      </HoverCardContent>
    </HoverCard>
  ) : (
    <RelatedToPopover ...>
      <button onClick={(e) => e.stopPropagation()} className="text-xs text-muted-foreground cursor-pointer">
        —
      </button>
    </RelatedToPopover>
  );
```

**Why this works**: `PopoverTrigger asChild` now receives `HoverCardTrigger asChild > button` — a proper Slot chain that resolves to the DOM `<button>`. Both triggers compose correctly: hover shows the card, click opens the popover.

### File changed
- `src/components/tasks/TaskRow.tsx` — restructure the `related_to` case nesting (lines 443-478)

