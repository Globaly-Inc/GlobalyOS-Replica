

# Add Quick Info Card to Job Edit Sidebar

## What This Does
Adds a new "Quick Info" card above the Publishing Options card in the right sidebar of the Job Edit page. It displays three pieces of information:
- **Status** of the job vacancy (e.g., Draft, Open, Paused) with a colored badge
- **Created Date and Time** (formatted with timezone awareness)
- **Created By** (the full name of the user who created the job)

## Technical Details

### 1. Update the `useJob` query (`src/services/useHiring.ts`)
- Add a join to resolve `created_by` to a profile name:
  ```
  creator:profiles!jobs_created_by_fkey(full_name)
  ```
- This fetches the creator's full name alongside the existing data.

### 2. Update the `JobWithRelations` type (`src/types/hiring.ts`)
- Add `creator` to the interface:
  ```
  creator?: { full_name: string } | null;
  ```

### 3. Add the Quick Info card in `JobEdit.tsx` (above line 594)
- Import the `useFormattedDate` hook for timezone-aware date formatting and `Badge` for the status display.
- Add a new `Card` with three rows:
  - **Status**: Displayed as a colored `Badge` (e.g., green for "open", yellow for "draft", etc.)
  - **Created**: Formatted date and time using `useFormattedDate`
  - **Created By**: The creator's full name from the joined profile data
- Status label mapping: draft, submitted, approved, open, paused, closed -- each with an appropriate badge color variant.

### No database changes needed
All required columns (`status`, `created_at`, `created_by`) already exist in the `jobs` table. We only need to join `profiles` to resolve the creator's name.
