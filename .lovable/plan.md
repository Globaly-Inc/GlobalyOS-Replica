

# Add Application Close Date to Job Edit Page

## Problem
The "Application Close Date" field exists on the New Vacancy (JobCreate) screen but is missing from the Edit Vacancy (JobEdit) screen. The "Target Start Date" field currently sits alone.

## Changes

### File: `src/pages/hiring/JobEdit.tsx`

1. **Add `application_close_date` to the form state** (initial value `''`, populated from `job.application_close_date` when loading)
2. **Include `application_close_date` in the save payload** sent to the update mutation
3. **Include `application_close_date` in the preview props**
4. **Wrap both date fields in a 2-column grid row** (`grid gap-4 md:grid-cols-2`), matching the layout from JobCreate:
   - Left: Application Close Date (date picker)
   - Right: Target Start Date (existing, moved into the grid)

The date picker markup will mirror the existing pattern from `JobCreate.tsx` exactly.

