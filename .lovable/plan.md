

# Fix: Show All Team Members (Not Capped at 20)

## Root Cause

Three places have hardcoded `.limit(20)` that cap the displayed team members to 20 instead of showing all 46.

## Changes

### 1. `src/components/offices/OfficeTeamList.tsx`

- **Remove `.limit(20)`** from the employee query (line 48) so all active employees are fetched
- **Use a separate count query** or use the fetched array length for the badge -- since we're removing the limit, `employees.length` will now reflect the true count

### 2. `src/components/offices/OfficeDetailView.tsx`

- **Remove `.limit(20)`** from the ProfileStack employee query (line 56) so the header profile stack shows all team members (the ProfileStack component already handles overflow with `maxVisible` and a "+N" indicator)

### 3. Badge Count Fix (automatic)

Once the limit is removed from `OfficeTeamList`, the badge at line 96 (`{employees.length}`) will automatically show the correct total (e.g. 46 instead of 20).

## Files to Modify

| File | Change |
|------|--------|
| `src/components/offices/OfficeTeamList.tsx` | Remove `.limit(20)` on line 48 |
| `src/components/offices/OfficeDetailView.tsx` | Remove `.limit(20)` on line 56 |

## Risk Assessment

- For offices with very large teams (hundreds), loading all at once could be slow. However, 46 is well within acceptable range. If needed later, pagination can be added using the existing `usePagination` hook.

