

## Make Assignment Type a Searchable, Creatable Combobox

### Current State
The "Type" field on assignment templates is a static `<Select>` dropdown backed by a Postgres enum (`assignment_type`) with 5 fixed values: Coding Challenge, Writing Sample, Design Task, Case Study, General Assignment.

### What Changes

**1. Database Migration**
- Change the `type` column on `assignment_templates` from the `assignment_type` enum to `TEXT` so users can enter custom types.
- Create a new table `assignment_type_options` (`id UUID`, `organization_id UUID`, `label TEXT`, `value TEXT`, `created_at`) to store org-specific custom types.
- Seed the 5 default types into `assignment_type_options` for each org that has templates (or handle defaults in code).
- Add RLS policies scoped to organization membership.

**2. New Component: `AssignmentTypeCombobox`**
- Popover + Command pattern (matching the existing `PositionMultiSelect` style).
- Searchable list of existing types from `assignment_type_options` + the 5 built-in defaults.
- Scrollable list with `CommandList`.
- "Create [typed value]" option appears when no exact match exists, which inserts the new type into `assignment_type_options` for the org.
- Single-select (not multi-select).

**3. Update `src/pages/hiring/HiringSettings.tsx`**
- Replace the `<Select>` for Type (lines 474-486) with the new `AssignmentTypeCombobox`.
- Update `formData.type` to be a `string` instead of `AssignmentType` enum.
- Update the templates table display to show the type label directly (already falls back to `template.type` so this mostly works).

**4. Update Types**
- In `src/types/hiring.ts`, change `AssignmentType` usage in template interfaces to `string`.
- Keep `ASSIGNMENT_TYPE_LABELS` as default/built-in labels for display.

### Technical Details

**Migration SQL (summary):**
```text
1. ALTER assignment_templates column type from enum to TEXT
2. CREATE TABLE assignment_type_options with org_id, label, value, RLS
3. Seed default options per existing org
```

**Component behavior:**
- On open: fetch org's `assignment_type_options` + merge with built-in defaults
- On search: filter list client-side
- On select: set the value
- On "Create new": insert into `assignment_type_options`, then select it
- Display: show label (human-readable) in the trigger button

