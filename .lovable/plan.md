
# Hiring Module Bug Fixes — 5 Issues

## Issues Identified from PDF

### Issue 1: Candidate Greeted by Email Username Instead of Full Name
**Root cause**: When `bhatta2096@gmail.com` applied via the referral link, the public careers form allowed submitting with `bhatta2096` (the email prefix) as the full name. The edge function stores whatever `candidate_name` is sent — it doesn't validate that it looks like a real name. The email template then addresses them as `"Dear bhatta2096"`.

**Fix**: Add a validation on the public careers form (`JobDetailPublic.tsx`) that requires the Full Name field to contain at least 2 words (first + last name) or at minimum not be an email-like string, with a clear error message.

---

### Issue 2: Cannot Download Resume from Candidates List
**Root cause**: `CandidatesList.tsx` line 69 calls `supabase.storage.from('hiring-cvs')` to create a signed URL, but all resumes are stored in the `'hiring-documents'` bucket (confirmed by checking actual `cv_file_path` values in the database, e.g., `11111111-.../resume-1770891247409.pdf` stored in `hiring-documents`). The wrong bucket name causes the signed URL creation to fail silently.

**Fix**: Change `supabase.storage.from('hiring-cvs')` → `supabase.storage.from('hiring-documents')` in the `downloadResume` function in `CandidatesList.tsx`.

---

### Issue 3: "Candidate not found" When Clicking a Candidate Profile
**Root cause**: Candidates like `bhatta2096` and `shresthaayushma051.as` were created with their email prefix as the name. When clicking their row in the list, the link navigates to `/hiring/candidates/:candidateId`. The `useCandidate` hook fetches from `candidates` with `has_hiring_access(organization_id)` RLS — this should work for HR. However, looking at the list, the candidate `shresthaayushma051.as` has `employee_id = null` so the new "Employees can view their own candidate record" policy doesn't cover them. But for HR users, `has_hiring_access` should allow access.

The likely root cause is that the **`useCandidate` hook is also checking** `organization_id` in the query, and the linked applications join `jobs` — if the job is deleted or the `status` filter blocks it, `single()` fails with `PGRST116` (no rows), returning `null` → "Candidate not found". This manifests when the candidate has no applications with accessible jobs.

**Fix**: Change `useCandidate` to use `.maybeSingle()` with better error handling, and ensure the `applications` join doesn't fail when job is null. Also verify the `useHiringApplication` query covers external (null `employee_id`) candidates under the `has_hiring_access` policy.

---

### Issue 4: Candidate Application Detail Doesn't Show Full Name / Contact / Salary Expectation
**Root cause**: The `ApplicationDetail` page sidebar (right column) does show name, email, and phone if available. But external candidates often have incomplete profiles. The user is requesting that the sidebar explicitly show:
- Full name (prominently)
- Phone/contact
- **Salary expectation** — this is currently not captured anywhere in the application form or displayed in `ApplicationDetail`.

**Fix**: 
- Add a "Salary Expectation" field to the candidate detail sidebar in `ApplicationDetail.tsx` (if captured via custom fields, pull it from `application.custom_fields_data`).
- Ensure the candidate name shown at the top of the application detail view falls back gracefully.
- Add a visible "Candidate Info" card section that shows: Full Name, Email, Phone, Location.

---

### Issue 5: Sarah's "Applied" Button Still Showing (Internal Vacancies)
**Root cause confirmed**: Sarah's data is correct — she has `employee_id` set on her `candidates` record, and her `candidate_applications` row exists. The RLS policies added in the last migration are also correct. The issue is a **React Query stale cache** — the `appliedJobsMap` query has `staleTime: 2 * 60 * 1000` (2 minutes). If Sarah's session already had a cached empty result from before the migration ran, the component won't re-fetch until the cache expires.

**Fix**: Remove the `staleTime` on the `internal-vacancies-applied` query (or set it to 0) so it always re-fetches on mount, ensuring fresh data. Also add `refetchOnMount: true` as a safety net.

---

## Technical Implementation Plan

### Files to Modify

**1. `src/pages/careers/JobDetailPublic.tsx`**
- Add name validation: trim whitespace and check the name is at least 2 characters and doesn't look like an email/username (no `@`, at least one space or 2+ chars).
- Show a clear inline error if the name field is invalid on submit.

**2. `src/pages/hiring/CandidatesList.tsx`**
- Line 69: Change `supabase.storage.from('hiring-cvs')` → `supabase.storage.from('hiring-documents')`.

**3. `src/services/useHiring.ts`** (`useCandidate` function)
- Change `.single()` to `.maybeSingle()` to prevent throwing on no rows.
- Ensure the `candidate_applications` join uses a left join pattern so candidates with no applications are still returned.

**4. `src/pages/hiring/ApplicationDetail.tsx`**
- Add a prominent "Candidate Info" section to the right sidebar showing: Full Name, Email, Phone, Location.
- Add display of salary expectation from `application.custom_fields_data` if present.

**5. `src/hooks/useInternalVacancies.ts`**
- Remove `staleTime` from the `internal-vacancies-applied` query (or set to 0).
- Add `refetchOnMount: 'always'` to ensure it always fetches on component mount.

---

## Summary Table

| # | Bug | Root Cause | File(s) |
|---|-----|-----------|---------|
| 1 | "Dear bhatta2096" in email | Name field accepts email-like strings | `JobDetailPublic.tsx` |
| 2 | Resume download fails | Wrong bucket: `hiring-cvs` should be `hiring-documents` | `CandidatesList.tsx` |
| 3 | "Candidate not found" | `.single()` throws on edge cases; stale join | `useHiring.ts` |
| 4 | Missing candidate details | Sidebar incomplete; salary not shown | `ApplicationDetail.tsx` |
| 5 | Sarah still sees Apply | Stale React Query cache (2 min staleTime) | `useInternalVacancies.ts` |
