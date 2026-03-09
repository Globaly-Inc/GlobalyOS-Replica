

## Fix: Custom Fields Not Editable in Task List View

### Root Cause

The `CustomFieldCell` component in `TaskRow.tsx` is a simple text-only editor. It has no awareness of the field's **type** (`text`, `number`, `date`, `select`) or its **options** (for select fields). So while clicking the cell technically allows text input, it does not render the appropriate control (date picker, number input, or dropdown) for non-text fields. More critically, the field definitions from `task_custom_fields` are never passed down to `TaskRow`, so there is no way for the cell to know what type of editor to show.

### Plan

**1. Pass custom field definitions to `TaskRow`**

- Add a `customFieldDefs?: TaskCustomField[]` prop to `TaskRowProps`.
- The parent component that renders `TaskRow` already has access to the space's custom fields — thread them through.

**2. Upgrade `CustomFieldCell` to be type-aware**

Replace the current generic text-input cell with a component that accepts `fieldType` and `options` props, then renders:

- **`text`**: Current inline text input (no change).
- **`number`**: Inline number input (`type="number"`).
- **`date`**: A date picker popover (reuse the existing `DueDateSelector` pattern or a simple date input).
- **`select`**: A `Select` dropdown populated with `options` from the field definition.

**3. Wire up the field definition lookup**

In the `default` case of the column renderer (line 485), look up the matching field definition by `fieldKey` from the new `customFieldDefs` prop and pass `fieldType` and `options` to the upgraded `CustomFieldCell`.

### Files Changed

- **`src/components/tasks/TaskRow.tsx`**: Upgrade `CustomFieldCell` to handle all four field types; add `customFieldDefs` prop to `TaskRowProps`; pass field metadata when rendering custom field cells.
- **Parent component(s)** that render `TaskRow` (e.g., `TaskListView` or equivalent): Pass the `customFieldDefs` from the existing `useTaskCustomFields` hook.

