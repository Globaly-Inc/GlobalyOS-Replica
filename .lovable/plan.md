
# Hiring & Recruitment Module - Implementation Plan

## Executive Summary

This plan outlines the implementation of a complete Hiring & Recruitment (ATS) system within GlobalyOS, following the PRD specifications. The module will be feature-flagged and integrated with existing Team, Boarding, and Activity Timeline systems.

---

## 1. Codebase Analysis Summary

### Existing Patterns to Reuse

| Pattern | Location | Usage in Hiring |
|---------|----------|-----------------|
| **Feature Flags** | `useFeatureFlags.tsx` | Add `hiring` to FeatureName type |
| **RBAC** | `useUserRole.tsx` | Owner/Admin/HR/Recruiter access |
| **Org Scoping** | `OrgLink`, `OrgProtectedRoute` | All hiring routes scoped by orgCode |
| **Services** | `src/services/useWorkflows.ts` | Pattern for `useHiring.ts` |
| **Types** | `src/types/workflow.ts` | Pattern for hiring types |
| **Email Templates** | `_shared/email-templates.ts` | Hiring email templates |
| **Activity Logging** | `useEmployeeActivityTimeline.ts` | Hiring activity logs |
| **Kanban Board** | `WorkflowKanbanBoard.tsx` | Pipeline board component |

### Key Database Conventions
- All tables scoped by `organization_id`
- UUIDs for primary keys
- `created_at`, `updated_at` timestamps
- Foreign keys to `employees` table for employee references
- Enum types for status fields

---

## 2. Data Model Design

### New Database Tables

```text
+-------------------+       +----------------------+       +--------------------+
|       jobs        |<------| candidate_applications|<------| assignment_instances|
+-------------------+       +----------------------+       +--------------------+
| id (UUID, PK)     |       | id (UUID, PK)        |       | id (UUID, PK)      |
| org_id (FK)       |       | org_id (FK)          |       | org_id (FK)        |
| slug (unique)     |       | candidate_id (FK)    |       | application_id (FK)|
| title             |       | job_id (FK)          |       | template_id (FK)   |
| department        |       | stage                |       | title              |
| status            |       | status               |       | instructions       |
| ...               |       | ...                  |       | deadline           |
+-------------------+       +----------------------+       | status             |
        ^                            ^                     +--------------------+
        |                            |
+-------------------+       +--------------------+
|    candidates     |       | assignment_templates|
+-------------------+       +--------------------+
| id (UUID, PK)     |       | id (UUID, PK)      |
| org_id (FK)       |       | org_id (FK)        |
| email             |       | name               |
| name              |       | type               |
| source            |       | instructions       |
| ...               |       | ...                |
+-------------------+       +--------------------+
```

### Table Definitions

**1. jobs**
- `id` (UUID, PK)
- `organization_id` (FK to organizations)
- `slug` (text, unique per org)
- `title`, `department`, `location`, `work_model`
- `employment_type`, `headcount`, `salary_min`, `salary_max`, `salary_currency`, `salary_visible`
- `hiring_manager_id` (FK to employees), `recruiter_id` (FK to employees)
- `description` (text, rich JD content)
- `target_start_date`
- `justification` (notes)
- `status` (enum: draft, submitted, approved, open, paused, closed)
- `is_internal_visible`, `is_public_visible`
- `created_by`, `created_at`, `updated_at`

**2. job_stages** (configurable per job)
- `id`, `job_id` (FK), `organization_id`
- `name`, `sort_order`, `color`

**3. candidates**
- `id` (UUID, PK)
- `organization_id` (FK)
- `email` (unique per org), `name`, `phone`, `location`
- `linkedin_url`, `portfolio_url`
- `source` (enum: careers_site, internal, referral, manual, job_board, other)
- `tags` (text[])
- `employee_id` (FK, nullable - for internal candidates)
- `created_at`, `updated_at`

**4. candidate_applications**
- `id` (UUID, PK)
- `organization_id`, `candidate_id` (FK), `job_id` (FK)
- `stage` (enum: applied, screening, assignment, interview_1, interview_2, offer, hired, rejected)
- `status` (enum: active, on_hold, rejected, hired)
- `cv_file_path`, `application_answers` (jsonb)
- `is_internal` (boolean)
- `created_at`, `updated_at`

**5. assignment_templates**
- `id`, `organization_id`
- `name`, `type` (enum: coding, writing, design, case_study, general)
- `role_tags` (text[])
- `instructions` (text, rich)
- `expected_deliverables` (jsonb: { files: bool, text_questions: [], url_fields: [] })
- `recommended_effort`, `default_deadline_hours`
- `created_at`, `updated_at`

**6. assignment_instances**
- `id`, `organization_id`, `candidate_application_id` (FK)
- `template_id` (FK, nullable)
- `title`, `instructions` (snapshot)
- `deadline` (timestamptz)
- `status` (enum: assigned, in_progress, submitted, overdue, reviewed)
- `secure_token` (unique, for public URL)
- `submission_data` (jsonb: { files: [], text_answers: [], urls: [] })
- `submitted_at`, `rating` (1-5), `reviewer_comments`
- `reviewed_by`, `reviewed_at`
- `created_at`, `updated_at`

**7. hiring_interviews**
- `id`, `organization_id`, `application_id` (FK)
- `type`, `scheduled_at`, `duration_minutes`
- `location`, `meeting_link`
- `interviewer_ids` (uuid[])
- `status` (enum: scheduled, completed, cancelled)
- `created_at`, `updated_at`

**8. interview_scorecards**
- `id`, `interview_id` (FK), `interviewer_id` (FK to employees)
- `organization_id`
- `ratings` (jsonb: { competency: { score, comment } })
- `overall_rating`, `recommendation` (enum: strong_yes, yes, neutral, no, strong_no)
- `notes`, `submitted_at`

**9. hiring_offers**
- `id`, `organization_id`, `application_id` (FK)
- `title`, `level`, `base_salary`, `currency`, `bonuses`
- `start_date`, `office_id`, `employment_type`, `notes`
- `status` (enum: draft, pending_approval, approved, sent, accepted, declined)
- `approved_by`, `approved_at`, `sent_at`
- `offer_letter_path`
- `created_at`, `updated_at`

**10. hiring_activity_logs**
- `id`, `organization_id`
- `entity_type` (job, candidate, application, assignment, interview, offer)
- `entity_id`
- `action` (stage_changed, email_sent, assignment_assigned, etc.)
- `actor_id` (FK to employees or null for system)
- `details` (jsonb)
- `created_at`

**11. hiring_email_templates**
- `id`, `organization_id`
- `name`, `type` (application_received, interview_invite, assignment_invite, reminder, rejection)
- `subject`, `body` (with variable placeholders)
- `is_default`
- `created_at`, `updated_at`

### RLS Policies

All tables will have:
- SELECT: Users can view records in their organization
- INSERT/UPDATE/DELETE: Users with Owner/Admin/HR/Recruiter role can modify

Assignment submission pages bypass auth using secure tokens.

---

## 3. Routing Structure

### Internal Routes (Authenticated)

| Route | Component | Access |
|-------|-----------|--------|
| `/org/:orgCode/hiring` | HiringDashboard | Owner, Admin, HR, Recruiter |
| `/org/:orgCode/hiring/jobs` | JobsList | Owner, Admin, HR, Recruiter |
| `/org/:orgCode/hiring/jobs/new` | JobCreate | Owner, Admin, HR |
| `/org/:orgCode/hiring/jobs/:jobSlug` | JobDetail (pipeline) | Owner, Admin, HR, Recruiter |
| `/org/:orgCode/hiring/candidates` | CandidatesList | Owner, Admin, HR, Recruiter |
| `/org/:orgCode/hiring/candidates/:candidateId` | CandidateProfile | Owner, Admin, HR, Recruiter |
| `/org/:orgCode/hiring/applications/:applicationId` | ApplicationDetail | Owner, Admin, HR, Recruiter |
| `/org/:orgCode/hiring/analytics` | HiringAnalytics | Owner, Admin, HR |
| `/org/:orgCode/hiring/settings` | HiringSettings (templates) | Owner, Admin, HR |
| `/org/:orgCode/jobs` | InternalJobBoard | All authenticated employees |

### Public Routes (No Auth)

| Route | Component |
|-------|-----------|
| `/careers/:orgCode` | CareersPage |
| `/careers/:orgCode/:jobSlug` | JobDetailPublic |
| `/assignment/:token` | AssignmentSubmission |

---

## 4. Feature Flags Integration

Add `hiring` to the existing feature flag system:

```typescript
// src/hooks/useFeatureFlags.tsx
export type FeatureName = "chat" | "tasks" | "crm" | "workflows" | "payroll" | "ask-ai" | "hiring";
```

Database migration to add default feature flag for organizations.

---

## 5. Component Structure

### New Directories

```
src/
  components/
    hiring/
      HiringDashboard.tsx
      HiringNav.tsx (sub-nav for hiring section)
      jobs/
        JobCard.tsx
        JobForm.tsx
        JobDescriptionEditor.tsx
        JobPublishSettings.tsx
        JobStagesEditor.tsx
      candidates/
        CandidateCard.tsx
        CandidateProfile.tsx
        CandidateActivityTimeline.tsx
        CandidateAISummary.tsx
      pipeline/
        HiringKanbanBoard.tsx
        HiringKanbanCard.tsx
        StageColumn.tsx
        MoveStageDialog.tsx
      assignments/
        AssignmentTemplateForm.tsx
        AssignmentTemplateList.tsx
        AssignAssignmentDialog.tsx
        AssignmentReviewCard.tsx
        AssignmentAISummary.tsx
      interviews/
        ScheduleInterviewDialog.tsx
        InterviewCard.tsx
        ScorecardForm.tsx
        ScorecardSummary.tsx
      offers/
        OfferForm.tsx
        OfferCard.tsx
        HireConversionDialog.tsx
      communication/
        EmailComposer.tsx
        EmailTemplateSelector.tsx
      analytics/
        HiringMetricsCards.tsx
        TimeToFillChart.tsx
        SourceOfHireChart.tsx
        FunnelChart.tsx
        AssignmentMetrics.tsx
    careers/
      CareersLayout.tsx
      JobListPublic.tsx
      JobDetailPublic.tsx
      ApplicationForm.tsx
      ApplicationSuccess.tsx
    assignment-submission/
      AssignmentPage.tsx
      AssignmentSubmissionForm.tsx
      AssignmentOverdue.tsx
      AssignmentConfirmation.tsx
  pages/
    hiring/
      HiringDashboard.tsx
      JobsList.tsx
      JobCreate.tsx
      JobDetail.tsx
      CandidatesList.tsx
      CandidateProfile.tsx
      ApplicationDetail.tsx
      HiringAnalytics.tsx
      HiringSettings.tsx
      InternalJobBoard.tsx
    careers/
      CareersPage.tsx
      JobDetailPublic.tsx
    AssignmentSubmission.tsx
  services/
    useHiring.ts (core hooks)
    useHiringMutations.ts
    useHiringRealtime.ts
  types/
    hiring.ts
```

---

## 6. Service Layer Design

### useHiring.ts (Pattern from useWorkflows.ts)

```typescript
// Core query hooks
export const useJobs = (filters?: JobFilters) => { ... }
export const useJob = (jobId: string) => { ... }
export const useCandidates = (filters?: CandidateFilters) => { ... }
export const useCandidate = (candidateId: string) => { ... }
export const useApplications = (jobId?: string) => { ... }
export const useApplication = (applicationId: string) => { ... }
export const useAssignmentTemplates = () => { ... }
export const useAssignmentInstances = (applicationId: string) => { ... }
export const useInterviews = (applicationId: string) => { ... }
export const useOffer = (applicationId: string) => { ... }
export const useHiringAnalytics = (dateRange: DateRange) => { ... }
export const useHiringActivityLog = (entityType: string, entityId: string) => { ... }
```

### useHiringMutations.ts

```typescript
// Mutation hooks
export const useCreateJob = () => { ... }
export const useUpdateJob = () => { ... }
export const useApproveJob = () => { ... }
export const usePublishJob = () => { ... }
export const useCreateCandidate = () => { ... }
export const useCreateApplication = () => { ... }
export const useUpdateApplicationStage = () => { ... }
export const useAssignAssignment = () => { ... }
export const useSubmitAssignment = () => { ... } // Public - no auth
export const useReviewAssignment = () => { ... }
export const useScheduleInterview = () => { ... }
export const useSubmitScorecard = () => { ... }
export const useCreateOffer = () => { ... }
export const useApproveOffer = () => { ... }
export const useConvertToEmployee = () => { ... } // Triggers Boarding
```

---

## 7. Edge Functions

### New Edge Functions

| Function | Purpose |
|----------|---------|
| `send-application-confirmation` | Email to candidate on apply |
| `send-assignment-invite` | Email with secure assignment link |
| `send-assignment-reminder` | Reminder before deadline |
| `send-interview-invite` | Email with ICS attachment |
| `send-offer-letter` | Generate and send offer |
| `generate-jd` | AI-assisted JD generation |
| `summarize-candidate` | AI profile summary |
| `summarize-assignment` | AI assignment review summary |
| `summarize-interviews` | AI interview feedback summary |
| `convert-candidate-to-employee` | Create employee + trigger boarding |

### Email Template Additions

Add to `_shared/email-templates.ts`:
- `generateApplicationReceivedHtml()`
- `generateAssignmentInviteHtml()`
- `generateAssignmentReminderHtml()`
- `generateInterviewInviteHtml()`
- `generateOfferLetterHtml()`
- `generateRejectionHtml()`

---

## 8. AI Integration

Using existing Lovable AI service pattern (from wiki-ask-ai, generate-review-draft):

| AI Feature | Trigger | Model Recommendation |
|------------|---------|---------------------|
| Generate JD | Button in JobDescriptionEditor | gemini-2.5-flash |
| Improve/Debias JD | Button | gemini-2.5-flash |
| Candidate Profile Summary | Auto on view | gemini-2.5-flash |
| Assignment Review Summary | Button | gemini-2.5-pro |
| Interview Feedback Summary | Button | gemini-2.5-flash |
| Draft Email | Button in EmailComposer | gemini-2.5-flash |

---

## 9. Implementation Phases

### Phase 1: Foundation (Week 1-2)
1. Database migrations (all tables + RLS)
2. Type definitions (`src/types/hiring.ts`)
3. Feature flag addition
4. Basic service hooks (useJobs, useCandidates)
5. Navigation updates (add Hiring to TopNav)

### Phase 2: Jobs & Careers Site (Week 3-4)
1. Job creation/editing pages
2. Job approval workflow
3. Public careers site (`/careers/:orgCode`)
4. Application form + confirmation
5. Email: application received

### Phase 3: Pipeline & Candidates (Week 5-6)
1. Candidate list + profile pages
2. Application detail page
3. Kanban pipeline board
4. Stage drag-and-drop
5. Internal job board
6. Activity logging integration

### Phase 4: Assignments (Week 7-8)
1. Assignment template CRUD
2. Assign assignment dialog
3. Public assignment submission page (`/assignment/:token`)
4. Assignment review UI
5. Rating + AI summary
6. Emails: invite, reminder, confirmation

### Phase 5: Interviews & Offers (Week 9-10)
1. Interview scheduling
2. Scorecard form + submission
3. Offer creation + approval
4. Hire conversion (-> Employee + Boarding)
5. AI summaries
6. ICS file generation

### Phase 6: Analytics & Polish (Week 11-12)
1. Analytics dashboard
2. Time-to-fill, source of hire, funnel charts
3. Assignment metrics
4. CSV export
5. Mobile responsiveness
6. Testing + bug fixes

---

## 10. Technical Considerations

### Security
- All org-scoped queries enforced via RLS
- Assignment submission uses secure tokens (no auth required)
- Never expose internal IDs in public URLs
- Rate limiting on public apply forms
- GDPR consent checkbox on application

### Performance
- Paginated candidate/application lists
- Optimistic updates for stage changes
- Realtime subscriptions for pipeline updates

### Integration Points
- **Boarding**: On hire, trigger existing boarding workflow
- **Activity Timeline**: Log hiring events to employee timeline
- **Notifications**: In-app + email for approvals, stage changes
- **Wiki**: Link to onboarding wiki pages from boarding trigger

---

## 11. File Changes Summary

### New Files (~100+ files)

| Category | Estimated Files |
|----------|-----------------|
| Types | 1 (`hiring.ts`) |
| Services | 3 (`useHiring.ts`, `useHiringMutations.ts`, `useHiringRealtime.ts`) |
| Pages | 12 (dashboard, lists, details, analytics, careers, assignment) |
| Components | 40+ (cards, forms, dialogs, charts) |
| Edge Functions | 8-10 |
| Migrations | 1 (all tables in single migration) |

### Modified Files

| File | Changes |
|------|---------|
| `src/hooks/useFeatureFlags.tsx` | Add `hiring` to FeatureName |
| `src/components/TopNav.tsx` | Add Hiring nav item |
| `src/App.tsx` | Add hiring routes |
| `supabase/functions/_shared/email-templates.ts` | Add hiring email templates |
| `src/types/index.ts` | Export hiring types |
| `src/services/index.ts` | Export hiring hooks |

---

## 12. Testing Strategy

### Unit Tests
- Hiring service hooks (mocked supabase)
- Stage transition logic
- Date/deadline calculations

### Integration Tests
- Job creation -> approval -> publish flow
- Application submission -> notification
- Assignment assign -> submit -> review flow
- Hire conversion -> employee creation

### E2E Tests
- Full candidate journey (apply -> hired)
- Public careers page accessibility
- Assignment submission page

---

## 13. Rollout Plan

1. **Feature Flag OFF by default** - No orgs see Hiring initially
2. **Internal testing** - Enable for test org
3. **Beta orgs** - Enable for selected customers
4. **General availability** - Enable via Super Admin toggle

---

## 14. Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| Large scope | Phased implementation, MVP first |
| Public pages security | Token-based access, rate limiting |
| AI cost | Use cheaper models (flash), cache results |
| Email deliverability | Use existing Resend setup |
| Boarding integration | Use existing workflow trigger pattern |

---

## Next Steps

1. Approve this plan
2. Create database migration with all tables + RLS
3. Implement Phase 1: Foundation
4. Iterate through subsequent phases
