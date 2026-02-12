

## Remove Approval Process from Job Vacancies and Add Direct Publish

### Summary

Remove the "submitted" and "approved" statuses from the vacancy workflow. Vacancies will go directly from **Draft** to **Open** (published). The "Submit for Approval" button on the Create page becomes "Publish Vacancy", and all references to the approval flow are cleaned up.

### Changes

#### 1. Update JobStatus type and labels (`src/types/hiring.ts`)
- Change `JobStatus` from `'draft' | 'submitted' | 'approved' | 'open' | 'paused' | 'closed'` to `'draft' | 'open' | 'paused' | 'closed'`
- Remove `submitted` and `approved` entries from `JOB_STATUS_LABELS` and `JOB_STATUS_COLORS`
- Remove `job_submitted` and `job_approved` from `HiringActivityAction` (keep `job_published`)

#### 2. Update Create page (`src/pages/hiring/JobCreate.tsx`)
- Replace the "Submit for Approval" button with a "Publish Vacancy" button
- When clicked, save the job and immediately set its status to `'open'` instead of going through a submitted/approval flow
- Update the success toast to say "Job vacancy published"

#### 3. Update Detail page (`src/pages/hiring/JobDetail.tsx`)
- Remove the "Approve & Open" button block that shows when `status === 'submitted'`
- Remove the `useApproveJob` import and usage
- Keep the existing "Publish" button for drafts (already present)

#### 4. Update Edit page (`src/pages/hiring/JobEdit.tsx`)
- Remove `submitted` and `approved` entries from the `STATUS_CONFIG` map

#### 5. Update filter dropdowns
- **`src/pages/hiring/JobsList.tsx`** -- Remove `<SelectItem value="submitted">` and `<SelectItem value="approved">` from the status filter
- **`src/pages/hiring/HiringDashboard.tsx`** -- Same removal from the inline status filter

#### 6. Clean up mutations (`src/services/useHiringMutations.ts`)
- The `useApproveJob` hook can be removed (or left as dead code for now); it is no longer needed

### Technical Details

- The `JobStatus` type change may cause TypeScript errors in places that reference `'submitted'` or `'approved'` -- each will be addressed in the files above
- Existing DB records with `submitted` or `approved` status will still render but won't have a matching label; they can be treated as equivalent to `open`. A simple fallback in `getJobStatusLabel` will handle this gracefully
- The `OfferStatus` type retains its own `pending_approval` / `approved` values -- those are unrelated to vacancy status and remain unchanged

