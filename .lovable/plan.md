

## Plan: Fix Candidate Application Detail — 6 Issues

### Issues to Fix

**1. Prevent duplicate applications for the same job**
- In `AddToPositionDialog.tsx`, the `existingJobIds` filter already excludes jobs the candidate applied to. But there's no DB-level constraint.
- Add a unique constraint on `candidate_applications(candidate_id, job_id)` via migration to enforce this at the database level.
- The UI filtering is already correct — this just adds safety.

**2. Auto-copy CV when adding candidate to a new position**
- In `AddToPositionDialog.tsx`, after creating the new application, copy the `cv_file_path` from the current application.
- Modify `handleSubmit` to pass the existing `cv_file_path` into the `useCreateApplication` mutation input.
- Update `useCreateApplication` in `useHiringMutations.ts` to accept an optional `cv_file_path` field in `CreateApplicationInput`.

**3. Show full application details inline instead of "View Full Application" link**
- Replace the stub content in other position tabs (lines 830-854) with the same full card layout (CV, Assignments, Interviews, Offer) used for the current tab.
- Each tab will fetch its own application data using `useHiringApplication(app.id)` and render the same cards inline.
- Extract the position tab content into a reusable `PositionTabContent` component to avoid duplication.

**4. New position tabs should appear on the right (after current tab)**
- Currently `otherApps` are sorted by `created_at desc` which puts newer ones first (left).
- Change the sort in `useCandidateApplications` to `ascending: true` or sort `otherApps` in the component so newer applications appear after (right of) the current tab.

**5. Activity log should combine all applications for the candidate**
- Currently `useHiringActivityLog` filters by a single `entity_id` (application ID).
- Change the activity log query to fetch logs for ALL of the candidate's application IDs.
- Create a new hook `useCandidateActivityLog(candidateId)` that:
  1. Gets all application IDs for this candidate
  2. Fetches activity logs where `entity_id` is in that set
- Use this combined hook instead of the per-application one.

**6. Skills, Experience, Education are already candidate-level**
- These are already connected to `candidate_id`, not application. The `CandidateSkillsCard`, `CandidateExperienceCard`, and `CandidateEducationCard` all query by `candidate_id`. No change needed here — they are already correct.

### Files Changed

| File | Change |
|------|--------|
| **Migration** | Add unique constraint on `candidate_applications(candidate_id, job_id)` |
| `src/services/useHiringMutations.ts` | Add optional `cv_file_path` to `CreateApplicationInput` |
| `src/components/hiring/AddToPositionDialog.tsx` | Pass `cv_file_path` from current application when creating new one; stop navigating away |
| `src/services/useHiring.ts` | Add `useCandidateActivityLog` hook; change `useCandidateApplications` sort to ascending |
| `src/pages/hiring/ApplicationDetail.tsx` | Extract `PositionTabContent` component; render full details in all tabs; use combined activity log; reorder tabs so new ones appear on right |

### Technical Details

**PositionTabContent component** — receives an `applicationId`, fetches its own data (`useHiringApplication`, `useAssignmentInstances`, `useInterviews`, `useOffer`, `useAssignmentTemplatesForPosition`), and renders the same CV/Assignments/Interviews/Offer cards. This avoids duplicating 300+ lines of JSX.

**Combined activity log query** — uses `.in('entity_id', applicationIds)` to fetch logs across all sibling applications in one query, merged and sorted by `created_at desc`.

