

# Hiring & Recruitment Module Audit Report

## Executive Summary

The Hiring & Recruitment (ATS) module has been substantially implemented with a comprehensive foundation covering jobs, candidates, applications, interviews, offers, and assignments. However, there are critical security gaps, incomplete user flows, and missing observability features that must be addressed before production use.

---

## 1. Reality Check: Plan vs Implementation

### What Exists Today (Implemented Correctly)

| Feature | Status | Notes |
|---------|--------|-------|
| Database Schema (11 tables) | Done | jobs, job_stages, candidates, candidate_applications, assignment_templates, assignment_instances, hiring_interviews, interview_scorecards, hiring_offers, hiring_activity_logs, hiring_email_templates |
| `has_hiring_access()` Security Helper | Done | Restricts access to Owner/Admin/HR roles |
| RLS Policies for Hiring Tables | Done | All 11 tables have RLS enabled with `has_hiring_access()` checks |
| Jobs CRUD | Done | Create, edit, view, approve, publish, close flows |
| Candidates List/Detail | Done | View candidates across all jobs |
| Applications Pipeline (Kanban) | Done | Drag-and-drop stage changes, visual columns per stage |
| Assignment Templates/Instances | Done | Create templates, assign to candidates, submit via secure token |
| Interview Scheduling | Done | Schedule with type, duration, location, meeting link |
| Interview Scorecards | Done | Submit ratings, recommendation, strengths/concerns |
| Offers Management | Done | Create offers with salary, start date, employment type |
| Activity Logging | Done | All mutations log to `hiring_activity_logs` |
| Feature Flag Protection | Done | All `/hiring/*` routes wrapped in `FeatureProtectedRoute` |
| TopNav Integration | Done | "Hiring" link with `UserPlus` icon, `ownerOnly: true`, feature flag |
| Public Careers Site | Partial | Job listing and detail pages work, but application submission is broken |
| Email Notification Edge Function | Done | `send-hiring-notification` function with Resend integration |
| Hiring Analytics | Partial | Basic metrics only (open jobs, candidates, hires) |
| Bulk Actions | Partial | Move to stage and reject work; email is placeholder |

### What's Missing or Flawed

| Feature | Status | Issue |
|---------|--------|-------|
| **Public Application Submission** | **Critical Bug** | `usePublicApplication` mutation calls `supabase.from('candidates').insert()` without auth. No RLS policy allows anonymous inserts. **Applications from the careers site will fail with 403.** |
| File Upload (CV/Resume) | Missing | `cv_file_path` column exists but no upload UI or storage bucket |
| Assignment File Uploads | Placeholder | UI shows "File upload coming soon" |
| Interview Calendar Sync | Missing | `calendar_event_id` column exists but no integration |
| Bulk Email | Placeholder | Button exists but shows "coming soon" toast |
| AI Job Description Generation | Placeholder | `Sparkles` icon in JobCreate but no AI integration |
| Offer Letter Generation | Missing | `offer_letter_path` column exists but no generation UI |
| Offer Send/Accept/Decline Flow | Missing | Create offer works, but no send to candidate or response tracking |
| Convert to Employee | Partial | `useConvertToEmployee` exists but only updates status; no actual user/employee creation |
| Integration Tests | Missing | No `hiring.test.ts` in `src/test/flows/` |
| Job Delete | Missing | No delete job mutation |
| Candidate Delete | Missing | No delete candidate mutation |
| Department/Office Selectors | Missing in JobCreate/Edit | `department_id` and `office_id` fields exist but UI doesn't populate them |

### Undocumented Behavior

- `useJobApplications` in `JobDetail.tsx` uses dynamic `require()` which is an anti-pattern
- `JobDetail.tsx` tries to access `job.department?.name` but also `job.department` as string fallback - type confusion
- `HiringDashboard.tsx` careers site link uses `currentOrg?.slug || currentOrg?.id` but public routes expect `orgCode` as slug specifically

---

## 2. User Flow Validation

### Flow 1: Create and Publish a Job

| Step | Status | Issue |
|------|--------|-------|
| Navigate to Hiring | Pass | Feature flag and role check work |
| Click "Create Job" | Pass | Form loads correctly |
| Fill job details | Partial | No department/office dropdowns populated |
| Save as draft | Pass | Creates job with `status: draft` |
| Approve job | Pass | Changes to `status: approved` |
| Publish job | Pass | Sets visibility flags and `status: open` |

**UX Friction**: No loading state on initial page load. User sees empty cards briefly.

### Flow 2: Candidate Applies via Public Careers Site

| Step | Status | Issue |
|------|--------|-------|
| Visit `/careers/{orgCode}` | Pass | Lists open, public jobs |
| View job detail | Pass | Shows description, requirements, benefits |
| Click "Apply" | Fail | **Form submits but RLS blocks the insert** |

**Critical**: The `usePublicApplication` mutation uses the client-side Supabase SDK with anon key. The RLS policies only allow authenticated users with `has_hiring_access()`. Anonymous users cannot insert into `candidates` or `candidate_applications`.

### Flow 3: Review Applications and Move Through Pipeline

| Step | Status | Issue |
|------|--------|-------|
| View job pipeline | Pass | Kanban board renders correctly |
| Drag candidate to new stage | Pass | Updates stage, shows toast |
| View application detail | Pass | Shows overview, assignments, interviews tabs |
| Assign task | Pass | Creates assignment instance with secure token |
| Schedule interview | Pass | Creates interview record |
| Submit scorecard | Pass | Creates/upserts scorecard |
| Create offer | Pass | Creates offer record |

**UX Friction**: No confirmation dialog when rejecting a candidate. One-click destructive action.

### Flow 4: Candidate Submits Assignment

| Step | Status | Issue |
|------|--------|-------|
| Access `/assignment/{token}` | Pass | Loads assignment instructions |
| Fill text answers | Pass | State updates correctly |
| Add URLs | Pass | Parses comma-separated input |
| Upload files | Fail | **UI says "coming soon"** |
| Submit | Partial | Works if no files expected |

### Empty/Loading/Error States

| State | Handled? |
|-------|----------|
| Loading skeletons | Yes, most pages have them |
| Empty lists ("No open jobs") | Yes, with helpful CTAs |
| 404 / Not Found | Yes, custom messages with back links |
| API errors | Partial - toasts show but no retry UI |

---

## 3. Code Quality Findings

### Separation of Concerns

- **Good**: Service hooks (`useHiring.ts`, `useHiringMutations.ts`) are cleanly separated from UI
- **Good**: Types defined in dedicated `types/hiring.ts` file
- **Issue**: `JobDetail.tsx` uses `require()` for dynamic import - should use proper hook composition

### Duplication

- **Issue**: Employment type and work model options duplicated in `JobCreate.tsx`, `JobEdit.tsx`, and `types/hiring.ts`
- **Issue**: Stage labels and colors defined in both `types/hiring.ts` and `HiringKanbanBoard.tsx`

### Naming Clarity

- **Good**: Hooks follow `use{Entity}` and `use{Action}{Entity}` conventions
- **Issue**: `useHiringApplications` vs `useApplications` naming in service exports could confuse consumers

### Error Handling

- **Good**: All mutations have `onError` handlers with toasts
- **Issue**: Console.error is used but no correlation IDs or structured logging
- **Issue**: `logHiringActivity` does not await - could silently fail

### Type Safety

- **Issue**: Multiple `as any` type casts in mutations when inserting into typed tables
- **Issue**: `CandidateApplicationWithRelations` can have nested undefined relations that aren't null-checked

---

## 4. Component & Platform Reuse

### Existing Components Being Reused

| Component | Usage |
|-----------|-------|
| `OrgLink` | All internal navigation |
| `Badge`, `Card`, `Button` | Consistent with other modules |
| `Avatar` | Candidate avatars |
| `Tabs` | Application detail page |
| `ScrollArea` | Kanban horizontal scroll |
| `DropdownMenu` | Context menus |
| `Dialog` | All modal dialogs |

### Opportunities for Reuse

| Pattern | Current | Recommendation |
|---------|---------|----------------|
| Employee selector | Custom in ScheduleInterviewDialog | Reuse existing `EmployeeSelector` component |
| Department/Office dropdowns | Missing | Use existing `useDepartments` and `useOffices` hooks |
| File upload | Missing | Leverage existing storage patterns from Wiki attachments |
| Rich text editor | Plain Textarea for JD | Reuse Wiki's rich text editor component |

---

## 5. Performance Findings

### Frontend

| Issue | Severity | Location |
|-------|----------|----------|
| Kanban board not virtualized | Medium | Large candidate pools will cause slowdowns |
| All applications fetched for job | Low | Pagination not implemented but acceptable for MVP |
| No `React.memo` on candidate cards | Low | Minor render overhead |

### Backend

| Issue | Severity | Location |
|-------|----------|----------|
| `useHiringMetrics` runs 6 parallel queries | Low | Acceptable - uses Promise.all |
| No indexes verified for common queries | Medium | Need to check indexes on `organization_id + status` |
| `usePublicJobs` does 2 sequential queries | Low | Could combine into RPC |

**No N+1 queries detected** - application data joins are properly structured.

---

## 6. Security Findings

### Critical Issues

| Issue | Risk | Recommendation |
|-------|------|----------------|
| **Public application submission broken** | High | Create edge function `submit-public-application` using service role key, or add RLS policy for anonymous inserts with strict checks |
| Assignment submission updates via anon key | Medium | Token-based access works but lacks rate limiting |

### RLS Policy Audit

| Table | RLS Enabled | Policies |
|-------|-------------|----------|
| jobs | Yes | View: org members; Manage: hiring access |
| candidates | Yes | Manage: hiring access only |
| candidate_applications | Yes | Manage: hiring access only |
| assignment_instances | Yes | Manage: hiring access only |
| hiring_interviews | Yes | Manage: hiring access only |
| interview_scorecards | Yes | Manage: hiring access only |
| hiring_offers | Yes | Manage: hiring access only |
| hiring_activity_logs | Yes | View/Insert: hiring access |
| hiring_email_templates | Yes | Manage: hiring access only |

**No policies exist for anonymous/public access** - this is why public applications fail.

### Input Sanitization

- **Cover letter**: Stored as plain text, no XSS risk if rendered correctly
- **Assignment instructions**: Rendered with `dangerouslySetInnerHTML` in `AssignmentSubmission.tsx` - **XSS vulnerability if template contains malicious HTML**

---

## 7. AI Usage Check

| Area | AI Used? | Status |
|------|----------|--------|
| Job Description Generation | Placeholder | Button exists but no implementation |
| Resume Parsing | No | Not implemented |
| Candidate Matching | No | Not implemented |

**No AI token tracking required currently** as no AI features are active.

---

## 8. Observability Findings

### Error Logging

| Area | Status | Issue |
|------|--------|-------|
| Frontend mutations | Partial | `console.error` only, no structured logging |
| Edge function | Partial | `console.log` for key events, no request ID |
| Activity logs | Good | All mutations log to `hiring_activity_logs` |

### Super-Admin Visibility

| Requirement | Status |
|-------------|--------|
| View hiring activity logs | Missing - no super-admin UI |
| View failed applications | Missing - errors not persisted |
| View email send status | Partial - logged in activity logs |

---

## 9. Test Coverage

### Existing Tests

None. The `src/test/flows/` directory contains tests for auth, leave, attendance, and chat - but no hiring tests.

### Recommended Test Cases

```text
Critical Path Tests:
1. Create job -> approve -> publish flow
2. Public job visibility (only open + is_public_visible)
3. Application stage transitions
4. Assignment token validation and submission
5. Scorecard submission and recommendation
6. Offer creation

Security Tests:
1. Non-hiring-access user cannot view/edit hiring data
2. Cross-org isolation (user A cannot see org B's candidates)
3. Assignment token cannot be reused after submission
```

### Manual QA Checklist

```text
[ ] Create a draft job with all fields
[ ] Approve and publish job
[ ] Verify job appears on public careers page
[ ] Submit application as anonymous user (currently broken)
[ ] View application in pipeline
[ ] Move application through stages via drag-drop
[ ] Assign task and verify email/token
[ ] Submit assignment via public token
[ ] Schedule interview
[ ] Submit scorecard
[ ] Create offer
[ ] Mark as hired
[ ] Verify activity log entries
```

---

## 10. Prioritized Improvements

### P0 - Critical (Must Fix Before Production)

| Issue | Impact | Effort | Action |
|-------|--------|--------|--------|
| Public application submission broken | Users cannot apply for jobs | Medium | Create `submit-public-application` edge function with service role |
| XSS in assignment instructions | Security vulnerability | Low | Use DOMPurify or markdown renderer instead of `dangerouslySetInnerHTML` |

### P1 - High Priority

| Issue | Impact | Effort | Action |
|-------|--------|--------|--------|
| No integration tests | Cannot prevent regressions | Medium | Add `hiring.test.ts` covering critical paths |
| Department/Office selectors missing | Jobs lack organizational context | Low | Wire up existing `useDepartments`/`useOffices` hooks |
| CV/Resume upload | Incomplete candidate data | Medium | Add storage bucket and upload component |
| Offer send flow | Cannot notify candidates | Medium | Extend `send-hiring-notification` edge function |

### P2 - Medium Priority

| Issue | Impact | Effort | Action |
|-------|--------|--------|--------|
| File upload in assignments | Limited submission options | Medium | Integrate with existing storage |
| Bulk email | Cannot mass-communicate | Medium | Implement batch email edge function |
| Super-admin activity view | No observability | Low | Add hiring logs to super-admin dashboard |
| Calendar sync for interviews | Manual scheduling | High | Google Calendar / Outlook integration |

### P3 - Low Priority (Future)

| Issue | Impact | Effort | Action |
|-------|--------|--------|--------|
| AI job description | Nice to have | Low | Wire up existing Lovable AI |
| Resume parsing | Efficiency gain | High | Third-party integration needed |
| Employee conversion flow | Manual process | High | Requires boarding workflow integration |

---

## Technical Implementation Notes

### Fix for Public Application (P0)

Create new edge function:

```typescript
// supabase/functions/submit-public-application/index.ts
// Uses service role to bypass RLS
// Validates: org exists, job is open + public, email not already applied
// Creates candidate + application records
// Optionally triggers send-hiring-notification
```

### Fix for XSS in Assignment Instructions (P0)

Replace in `AssignmentSubmission.tsx`:

```tsx
// Before
<div dangerouslySetInnerHTML={{ __html: assignment?.instructions || '' }} />

// After
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(assignment?.instructions || '') }} />
```

---

## Conclusion

The Hiring & Recruitment module has a solid foundation with comprehensive data model, proper role-based access control, and a functional internal UI. However, the **public careers application flow is completely broken** due to RLS policy gaps, and there are **security vulnerabilities** in the assignment submission page.

Before any production use:
1. Implement the public application edge function
2. Sanitize HTML in assignment instructions
3. Add basic integration tests

The module can then be incrementally enhanced with file uploads, calendar sync, and AI features.

