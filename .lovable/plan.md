

## Split Internal Visibility into Two Separate Controls

### Overview

Currently, there is a single toggle `is_internal_visible` that controls both showing the job on the internal board AND allowing internal applications. This will be split into two independent toggles:

1. **Show on internal job board** (`is_internal_visible`) -- Controls whether the vacancy appears on the home page Open Positions card, with the Share/Refer icon
2. **Allow internal applications** (`is_internal_apply`) -- Controls whether the Apply icon appears, letting team members apply directly

### Database Change

Add a new boolean column `is_internal_apply` to the `jobs` table:

```sql
ALTER TABLE public.jobs
ADD COLUMN is_internal_apply BOOLEAN DEFAULT false;
```

### Files to Modify

**1. `src/pages/hiring/JobEdit.tsx`** (Publishing Options section)
- Replace the single "Show on internal job board" toggle with two toggles:
  - "Show on internal job board" -- with helper text: "Visible to employees on home page with share/refer option"
  - "Allow internal applications" -- with helper text: "Team members can apply directly to this position"
- Add `is_internal_apply` to formData state and save logic

**2. `src/pages/hiring/JobCreate.tsx`** (Publishing Options section)
- Same two-toggle split as JobEdit
- Add `is_internal_apply` to initial formData (default `false`)

**3. `src/types/hiring.ts`**
- Add `is_internal_apply: boolean` to `Job` interface
- Add `is_internal_apply?: boolean` to `UpdateJobInput` interface

**4. `src/hooks/useInternalVacancies.ts`**
- Add `is_internal_apply` to the select query
- Add it to the `InternalVacancy` interface

**5. `src/components/home/InternalVacanciesCard.tsx`**
- Conditionally show the Apply button (UserPlus icon) only when `vacancy.is_internal_apply` is true
- Always show the Share/Refer button (Send icon) since the vacancy is already visible on the board

**6. `src/pages/hiring/JobDetail.tsx`**
- Conditionally render the InternalApplyDialog only when `job.is_internal_apply` is true
- ShareVacancyDialog remains gated by `is_internal_visible` (existing behavior)

**7. `src/services/useHiringMutations.ts`**
- Include `is_internal_apply` in the publish job mutation alongside `is_internal_visible`

### UX Behavior Summary

| Setting | Home Page Card | Share Icon | Apply Icon |
|---------|---------------|------------|------------|
| Both off | Not shown | N/A | N/A |
| Board only | Shown | Yes | No |
| Apply only | Not shown | N/A | N/A |
| Both on | Shown | Yes | Yes |

- "Allow internal applications" is only meaningful when the job is visible on the internal board, so the UI will visually indent it under the board toggle and disable it when the board toggle is off.
