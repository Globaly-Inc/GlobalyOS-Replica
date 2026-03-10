

## Plan: Related Entity Name + Hover Card in Task List

### Current Behavior
The `related_to` column shows a generic "Linked" or "—" text with a `Link2` icon. Clicking always opens the `RelatedToPopover`.

### New Behavior
1. **When a related entity exists**: Show the entity name as plain text (truncated). On hover, display a `HoverCard` with the existing `RelatedEntityCard` contact card. Clicking opens the `RelatedToPopover` for changing/removing the relation.
2. **When no entity is linked**: Show "—". Clicking opens the `RelatedToPopover` selector (same as current).

### Implementation

#### 1. Create `RelatedEntityName` helper component (in `TaskRow.tsx` or separate file)
- A small component that takes `entityType` and `entityId`, uses the existing hooks (`useCRMContact`, `useCRMCompany`, `useCRMDeal`, `useEmployees`) to fetch and return just the display name.
- For `contact`: `first_name + last_name`
- For `company`: `name`
- For `deal`: `title`
- For `employee`: `full_name` from profiles
- For `department`: department `name`

#### 2. Update `related_to` case in `TaskRow.tsx` `renderCell`
- Replace the current simple button with:
  - **If entity exists**: Wrap in `HoverCard` (from `@radix-ui/react-hover-card`). The trigger shows the entity name text. The `HoverCardContent` renders the existing `RelatedEntityCard`. The whole thing is also wrapped in `RelatedToPopover` so clicking opens the editor.
  - **If no entity**: Show "—" button wrapped in `RelatedToPopover` (unchanged).

#### 3. Apply same pattern in `TaskListView.tsx` inline creation row
- For the inline row, keep the current `RelatedToPopover` trigger since inline rows won't have saved entities yet.

### Technical Details

**New component** (`src/components/tasks/RelatedEntityName.tsx`):
- Hooks into existing data fetchers per entity type
- Returns a string or null

**Files to edit**:
- `src/components/tasks/TaskRow.tsx` — update `related_to` case to use `HoverCard` + `RelatedEntityName` + `RelatedEntityCard`
- `src/components/tasks/RelatedEntityName.tsx` — new file, small hook-based component returning entity display name

**Key structure** for the cell:
```
RelatedToPopover (click to edit)
  └─ HoverCard
       ├─ HoverCardTrigger: <span>{entityName}</span>
       └─ HoverCardContent: <RelatedEntityCard />
```

When no entity is selected, it falls back to the current "—" + `RelatedToPopover` click-to-select behavior.

