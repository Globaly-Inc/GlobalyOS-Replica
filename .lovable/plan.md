
## Applied State Button — Show Application Date on Hover

### What's Changing

The apply button (UserPlus/CheckCircle2) in `InternalVacanciesCard` currently only tracks *whether* a user has applied. It needs to also surface *when* they applied, shown in the hover tooltip.

### Two Files to Touch

#### 1. `src/hooks/useInternalVacancies.ts`

The query for applied jobs currently returns only an array of `job_id` strings:
```ts
return (data ?? []).map((row: any) => row.job_id as string);
// e.g. ['job-uuid-1', 'job-uuid-2']
```

It needs to also fetch `created_at` from `candidate_applications` and return a map instead:
```ts
// New return shape — a Record keyed by job_id
Record<string, { appliedAt: string }>
// e.g. { 'job-uuid-1': { appliedAt: '2025-02-10T08:30:00Z' } }
```

- Add `created_at` to the `.select(...)` on `candidate_applications`
- Change the return type from `string[]` to `Record<string, { appliedAt: string }>`
- Export a new `AppliedJobsMap` type
- Rename the returned value from `appliedJobIds` → `appliedJobsMap` to reflect the new shape

#### 2. `src/components/home/InternalVacanciesCard.tsx`

- Update the destructure: `appliedJobIds` → `appliedJobsMap`
- Change the `hasApplied` check:
  ```ts
  // Before
  const hasApplied = appliedJobIds.includes(vacancy.id);
  // After
  const appliedInfo = appliedJobsMap[vacancy.id];
  const hasApplied = !!appliedInfo;
  ```
- Update the tooltip content when applied to include the formatted date:
  ```tsx
  <TooltipContent side="top">
    <p>Applied {formatRelativeTime(appliedInfo.appliedAt)}</p>
    <p className="text-xs opacity-70">
      {new Date(appliedInfo.appliedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
    </p>
  </TooltipContent>
  ```
  e.g. the tooltip would show: **"Applied 3 days ago"** with the full date underneath: *"16 Feb 2026"*

### No Database Changes Needed

`candidate_applications.created_at` already exists — we're just adding it to the existing select query.

### Visual Result

| State | Icon | Tooltip on hover |
|---|---|---|
| Not applied | `UserPlus` (grey) | "Apply" |
| Applied | `CheckCircle2` (green) | "Applied 3 days ago · 16 Feb 2026" |

The applied button remains non-clickable (`cursor-default`, no `onClick` effect) — exactly as today, just with a richer tooltip.
