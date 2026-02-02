
# Plan: Fix Export Conflict and Add Hiring to TopNav

## Issue Analysis

There is a naming conflict in `src/services/index.ts` because both modules export `useApplications`:
- `useWorkflows.ts` exports `useApplications` (for Boarding/Workflow applications)
- `useHiring.ts` exports `useApplications` (for Hiring candidate applications)

---

## Changes Required

### 1. Fix Export Conflict in `src/services/index.ts`

Replace the wildcard export from `useHiring.ts` with explicit named exports, renaming conflicting hooks:

```typescript
// Hiring & Recruitment - explicit exports to avoid conflicts
export {
  useJobs,
  useJob,
  useJobStages,
  useCandidates,
  useCandidate,
  useApplications as useHiringApplications,  // Renamed to avoid conflict
  useApplication as useHiringApplication,    // Renamed for consistency
  useAssignmentTemplates,
  useAssignmentInstances,
  useInterviews,
  useUpcomingInterviews,
  useOffer,
  useHiringActivityLog,
  useHiringEmailTemplates,
  useHiringMetrics,
  useAssignmentByToken,
  usePublicJob,
  usePublicJobs,
} from './useHiring';

export * from './useHiringMutations';
```

This preserves backward compatibility with existing workflow code while making hiring hooks available under distinct names.

---

### 2. Add "Hiring" to TopNav

Update `src/components/TopNav.tsx`:

| Change | Details |
|--------|---------|
| Import | Add `UserPlus` from lucide-react |
| Nav Item | Add after CRM: `{ name: 'Hiring', href: '/hiring', icon: UserPlus, adminOnly: false, ownerOnly: true, featureFlag: 'hiring' }` |
| Active Check | Add `/hiring` path detection in `isActive()` function |

The item will:
- Only appear for owners (Owner/Admin/HR with feature flag enabled)
- Use the `hiring` feature flag
- Navigate to `/org/:orgCode/hiring`

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/index.ts` | Replace `export * from './useHiring'` with explicit named exports, rename `useApplications` to `useHiringApplications` |
| `src/components/TopNav.tsx` | Add `UserPlus` icon import, add Hiring nav item, update `isActive()` for hiring routes |

---

## Technical Notes

- The hiring mutations file (`useHiringMutations.ts`) does not have naming conflicts, so it can remain as `export *`
- Future hiring components should import `useHiringApplications` instead of `useApplications`
- The TopNav item uses `ownerOnly: true` because hiring access is restricted to Owner/Admin/HR per the PRD
