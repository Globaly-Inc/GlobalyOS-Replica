
# Fix Vacancies Navigation - Consistent Page Context

## Problem
When navigating back from a job detail/edit/create page via the back arrow or "Back to Vacancies" links, users are taken to `/hiring/jobs` which renders a standalone `JobsList` component without the page title section or tab menu.

The correct destination should be `/hiring?tab=jobs` which renders the full `HiringDashboard` with:
- Page title ("Hiring")
- Tab menu (Analytics | Vacancies | Candidates)
- Filter bar
- Vacancies list

## Solution
Update all navigation links that currently point to `/hiring/jobs` to instead point to `/hiring?tab=jobs`.

## Files to Modify

| File | Line(s) | Current | Updated |
|------|---------|---------|---------|
| `src/pages/hiring/JobDetail.tsx` | 70, 84 | `/hiring/jobs` | `/hiring?tab=jobs` |
| `src/pages/hiring/JobEdit.tsx` | 241 | `/hiring/jobs` | `/hiring?tab=jobs` |
| `src/pages/hiring/JobCreate.tsx` | 209, 545 | `/hiring/jobs` | `/hiring?tab=jobs` |

## Specific Changes

### JobDetail.tsx
1. **Line 70** - "Back to Vacancies" button in the "not found" state
2. **Line 84** - Back arrow button in the header

### JobEdit.tsx
1. **Line 241** - "Back to Vacancies" button in the "not found" state

### JobCreate.tsx
1. **Line 209** - Back arrow button in the header
2. **Line 545** - "Cancel" button at the bottom of the form

## Optional Cleanup
The standalone route `path="hiring/jobs"` in `App.tsx` (line 255) could be removed or redirected since it's now orphaned. However, keeping it provides a fallback if someone bookmarks or shares that URL.

## Expected Result
After the fix:
- Clicking back from any job page returns to the full Hiring dashboard with the Vacancies tab active
- Page title "Hiring" and subtitle are visible
- Tab menu (Analytics | Vacancies | Candidates) is visible and Vacancies is selected
- Filter bar with search and status filter is visible
