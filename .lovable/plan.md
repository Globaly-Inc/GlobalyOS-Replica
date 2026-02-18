
## Replace Mock Data with Real Hiring Analytics

### What's wrong today
All four charts in the Hiring Analytics tab display hardcoded mock values:
- **Hiring Funnel** — uses a fixed array `stageData` (not `metrics.candidates_by_stage`)
- **Source of Hire** — uses a fixed array `sourceData` (not real `source_of_application` data)
- **Time to Fill Trend** — uses `timeToFillData` with made-up monthly figures
- **Assignment Performance** — "On-Time Submission" (85%) and "Avg. Review Time" (2.3 days) are hardcoded strings

The summary cards (Total Candidates, Active Vacancies, Hires, Avg Time to Fill) already use real data. Only the charts are broken.

---

### What will be fixed

#### 1. Extend `useHiringMetrics` in `src/services/useHiring.ts`
Add three new parallel queries alongside the existing ones:

- **Source of hire breakdown** — query `candidate_applications` grouped by `source_of_application` (already exists as a column)
- **Applications trend by week** — query `candidate_applications` grouped by `DATE_TRUNC('week', created_at)` for the last 8 weeks
- **Applications per job** — query jobs with their applicant count for a new "Applications by Job" bar chart
- **Assignment on-time + review time** — compute from `assignment_instances` using `submitted_at` vs `deadline` and `updated_at` vs `submitted_at`

The hook will return these enriched fields alongside the existing ones.

#### 2. Update `HiringMetrics` type in `src/types/hiring.ts`
Add fields:
```
source_breakdown: { name: string; value: number }[];
applications_trend: { week: string; count: number }[];
applications_by_job: { title: string; count: number }[];
on_time_submission_rate: number | null;
avg_review_time_days: number | null;
```

#### 3. Replace all mock chart data in `HiringDashboard.tsx`

| Chart | Before | After |
|-------|--------|-------|
| Hiring Funnel | `stageData` (hardcoded) | `metrics.candidates_by_stage` mapped to stage labels |
| Source of Hire | `sourceData` (hardcoded) | `metrics.source_breakdown` from real query |
| Time to Fill Trend | `timeToFillData` (made-up months) | `metrics.applications_trend` (real weekly application count) — renamed to "Applications Trend" since there are no completed hires yet |
| Assignment Performance | "85%" / "2.3 days" hardcoded | `metrics.on_time_submission_rate` and `metrics.avg_review_time_days` computed from real `assignment_instances` |

#### 4. Add one new chart — "Applications by Job"
A horizontal bar chart showing how many candidates have applied per job vacancy. This is genuinely useful and is derivable from real data already being fetched.

---

### Technical approach

**Stage label mapping** — the DB stores slugs (`applied`, `interview_1`). We'll map them to readable labels using the existing `APPLICATION_STAGE_LABELS` constant from `src/types/hiring.ts`.

**Empty state handling** — with a small dataset (10 applications, no hires yet), charts will show real zeroes gracefully with an empty-state message for charts that have no data at all.

**No new DB tables or migrations needed** — all data is computed from existing tables: `candidate_applications`, `assignment_instances`, `jobs`.

---

### Files to change
1. `src/types/hiring.ts` — extend `HiringMetrics` interface
2. `src/services/useHiring.ts` — extend `useHiringMetrics` query function with 3 additional parallel DB calls and computed fields
3. `src/pages/hiring/HiringDashboard.tsx` — replace all 4 mock data arrays with `metrics.*` fields, add "Applications by Job" chart, remove the `// Mock data` comment block
