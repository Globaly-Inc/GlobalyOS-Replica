

## Add Custom Fields to Task Column Customizer

### Summary
Extend the Customize popover to show all built-in columns (already done) plus an "Add Custom Field" option that lets users define new columns (text, number, date, dropdown) per space. Custom field definitions are stored in a new `task_custom_fields` table (mirroring the CRM pattern), and values are stored in a `custom_fields` JSON column on the `tasks` table.

### Database Changes

**1. Create `task_custom_fields` table** (mirrors `crm_custom_fields`)
- Columns: `id`, `organization_id`, `space_id`, `field_name`, `field_key`, `field_type` (text/number/date/select), `options` (JSON, for dropdowns), `is_required`, `sort_order`, `created_at`
- RLS: org-scoped read/write for authenticated users

**2. Add `custom_fields` JSONB column to `tasks` table**
- Nullable JSON column to store `{ field_key: value }` pairs per task

### Service Layer

**3. Create `src/services/useTaskCustomFields.ts`**
- `useTaskCustomFields(spaceId)` — fetch field definitions for a space
- `useCreateTaskCustomField()` — create a new field
- `useDeleteTaskCustomField()` — delete a field
- Pattern mirrors `useCRMCustomFields.ts`

### UI Changes

**4. Update `TaskColumnCustomizer.tsx`**
- After the built-in column list, add a separator and list custom field columns (fetched via hook)
- Each custom field column has a toggle (visible/hidden) and a delete option
- Add an "Add Field" button at the bottom that opens an inline form (field name + type selector + options for dropdown type)
- Custom field columns are appended to the `ColumnConfig[]` array with `key: 'custom_<field_key>'`

**5. Update `TaskListView.tsx` header and `TaskRow.tsx`**
- Render custom field columns in the header row
- In each task row, render the custom field value from `task.custom_fields[field_key]` with inline editing (text input, number input, date picker, or select depending on type)

**6. Update `useColumnResize.ts`**
- Handle dynamic custom field column keys with sensible default widths

**7. Pass `spaceId` to `TaskColumnCustomizer`**
- The customizer needs the space ID to scope custom field definitions

### Result
The Customize popover will show all 8 built-in columns with toggles, plus any user-defined custom fields, and an "Add Field" button to create new ones on the fly. Custom field data persists per task in the `custom_fields` JSON column.

