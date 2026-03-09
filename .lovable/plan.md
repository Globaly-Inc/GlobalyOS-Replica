

## Redesign "Related to" Popover with Keep/Change Radio Flow

### Problem
Currently, clicking "Related to" immediately shows entity type buttons to pick a new relation. The user wants it to first show the **current relation details**, then offer radio options to either **keep it** or **change/add a new one**.

### Plan

**File: `src/components/tasks/RelatedToPopover.tsx`**

Redesign the popover's internal flow into a two-phase UI:

**Phase 1 — Current Relation Display (default view when popover opens):**
- Fetch and display the current entity's name/details (reuse existing query patterns from the entity lists)
- Show two radio buttons:
  - **"Keep current"** (selected by default) — clicking "Done" closes popover, no changes
  - **"Change / Add new"** — reveals Phase 2 inline

**Phase 2 — Entity Picker (shown when "Change / Add new" radio is selected):**
- Show the existing entity type selector (Employee, Department, CRM Contact, etc.)
- Then the search + entity list as it works today
- Selecting a new entity updates the task and closes the popover

**Implementation details:**
- Add a `mode` state: `'view' | 'pick'` controlled by radio selection
- Add a small `CurrentEntityDisplay` component that fetches the entity name based on `entityType` + `entityId` (simple queries similar to existing lists)
- Use `RadioGroup` / `RadioGroupItem` from the existing UI components
- Add a "Done" button in the footer when in "Keep current" mode
- When no current relation exists (`entityId` is null), skip Phase 1 and go directly to the entity picker

**No other files need changes** — the `TaskRow.tsx` integration stays the same since only the popover's internal content changes.

