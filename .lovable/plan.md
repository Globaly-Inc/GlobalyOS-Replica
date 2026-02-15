

## Replace Role Tags with Multi-Select Positions Dropdown on Assignment Templates

### What Changes

The "Role Tags (comma-separated)" text input on the assignment template form will be replaced with a multi-select positions dropdown. Positions are sourced from the organization's existing positions (managed in org settings). A new `position_ids` column will be added to `assignment_templates` to store the selected position UUIDs.

### Database Changes

**Add `position_ids` column to `assignment_templates`:**
- New column: `position_ids UUID[] DEFAULT '{}'` -- stores array of position IDs linked to this template
- The existing `role_tags` column remains untouched for backward compatibility

### Frontend Changes

**`src/pages/hiring/HiringSettings.tsx`:**

1. Import `usePositions` from `@/hooks/usePositions`
2. Replace the "Role Tags (comma-separated)" `<Input>` (lines 515-524) with a multi-select positions UI:
   - Use a Popover + Command pattern (similar to `PositionCombobox`) with checkboxes for multi-select
   - Show selected positions as removable Badge chips below the trigger
   - Search/filter capability within the dropdown
3. Update `formData` state to include `position_ids: string[]` alongside (or replacing) `role_tags`
4. Update `handleEdit` to populate `position_ids` from template data
5. Update `handleCreate` to initialize `position_ids: []`
6. In the templates table list view, replace the "Tags" column (lines 600, 614-626) with "Positions" showing position names resolved from IDs

**`src/types/hiring.ts`:**
- Add `position_ids?: string[]` to `CreateAssignmentTemplateInput`

**`src/services/useHiringMutations.ts`:**
- The mutation already spreads `...input`, so `position_ids` will be included automatically once added to the input type

### How Auto-Assignment Would Work

The `position_ids` on templates establish which positions a template applies to. The actual auto-assignment logic (automatically adding assignments when a candidate applies to a vacancy with a matching position) would require:
- A `position_id` column on the `jobs` table (not yet present)
- A trigger or application-level logic to match

This plan focuses on the UI and data model for linking positions to templates. The auto-assignment trigger can be added as a follow-up once jobs also reference positions.

