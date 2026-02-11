
## Replace Job Title Input with PositionCombobox on Job Edit Page

The Job Edit page currently uses a plain text `Input` for the Job Title field. This should use the same `PositionCombobox` component already used on the Create Job Vacancy page, allowing selection from existing organization positions with the ability to create new ones inline.

### Changes

**File: `src/pages/hiring/JobEdit.tsx`**

1. **Add imports**:
   - Import `PositionCombobox` from `@/components/hiring/PositionCombobox`
   - Copy the `formatPositionAsRichText` helper from `JobCreate.tsx` (or extract it to a shared util)

2. **Replace the Job Title field** (around line 401):
   - Swap the `<Input>` for `<PositionCombobox>`
   - Wire it identically to `JobCreate.tsx`:
     - `value={formData.title}`
     - `onChange` updates the title, and optionally auto-fills description if the position has one and the current description is empty
     - `departmentId` linked to `formData.department_id`

3. **Remove unused `Input` import** if no longer needed elsewhere in the file (it likely is still used for other fields, so this is conditional)

### What stays the same
- The `PositionCombobox` component itself is unchanged -- it already supports searching, selecting, and creating new positions with department assignment
- Role-based access for creating positions is handled by the existing RLS policies on the `positions` table
