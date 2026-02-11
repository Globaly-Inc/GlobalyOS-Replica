
# Show Office Location (City, Country) as Fallback on Job Cards

## What Changes
When an on-site job has no `location` override, the card will display the office's city and country instead. Only city and country are shown (not full address).

## Technical Details

### 1. Update the office join in `usePublicJobs` (`src/services/useHiring.ts`)
- Add `country` to the office select: `office:offices(id, name, city, country)`

### 2. Update the location display logic in `CareersPage.tsx` (lines 171-176)
- Change from only showing `job.location` to a fallback chain:
  1. If `job.location` exists, show it (the override).
  2. Otherwise, if `job.office?.city` or `job.office?.country` exists, show "City, Country" (or whichever is available).
- The condition stays `job.work_model === 'onsite'` -- location is only shown for on-site jobs.

### Files to Edit
- `src/services/useHiring.ts` -- add `country` to office join
- `src/pages/careers/CareersPage.tsx` -- update location rendering with office fallback
