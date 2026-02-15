

## Convert Assignment Template Editor to Full Page

Currently, creating/editing assignment templates uses a dialog box which constrains the space — especially problematic for long instructions. This plan converts it to a dedicated full page with its own route.

### What Changes

1. **New page**: `src/pages/hiring/AssignmentTemplateEditor.tsx`
   - A full-page form with the same fields (Name, Type, Instructions, Deadline, Effort, Positions, Deliverables)
   - Header with back navigation to Hiring Settings (assignments tab)
   - Save and Cancel buttons in the header area
   - The Instructions textarea gets more vertical space since we are no longer constrained by a dialog
   - Reads template ID from URL params for edit mode; no ID means create mode

2. **New routes** in `src/App.tsx`:
   - `hiring/settings/assignments/new` — create mode
   - `hiring/settings/assignments/:templateId/edit` — edit mode

3. **Update `HiringSettings.tsx`**:
   - Remove the Dialog entirely from `AssignmentTemplatesSection`
   - "Add Template" button navigates to the new create page
   - Edit (pencil) button navigates to the edit page
   - Remove all dialog-related state (`showDialog`, `formData`, `editingTemplate`, `handleCreate`, `handleEdit`, `handleSave`) from this component

### Technical Details

- The new page component will use `useParams()` to get `templateId` and `useAssignmentTemplates()` to load existing data for edit mode
- Uses `useNavigate()` to go back to settings after save/cancel, with `?tab=assignments` query param to land on the correct tab
- The `HiringSettings` component will read the `tab` query param to auto-select the assignments tab when returning
- Reuses existing mutations: `useCreateAssignmentTemplate` and `useUpdateAssignmentTemplate`
- Reuses existing components: `AssignmentTypeCombobox`, `PositionMultiSelect`
- Layout follows the same pattern as other full-page forms (e.g., JobCreate) with `PageBody`, back arrow, and card-based form sections

