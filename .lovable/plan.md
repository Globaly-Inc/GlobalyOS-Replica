

# Rename "Job" to "Job Vacancy" Throughout System

## Summary
Rename all user-facing instances of "Job" to "Job Vacancy" (singular) or "Job Vacancies" (plural) throughout the hiring module. This ensures consistent terminology across the application.

## Scope of Changes

### Pages and Components Affected

| File | Changes |
|------|---------|
| `src/pages/hiring/JobCreate.tsx` | "Create Job" to "Create Job Vacancy", "Job Description" to "Job Vacancy Description" |
| `src/pages/hiring/JobDetail.tsx` | "Job not found" to "Job vacancy not found", "Back to Jobs" to "Back to Vacancies", "Job Description" to "Vacancy Description", "Job approved" to "Job vacancy approved" |
| `src/pages/hiring/JobEdit.tsx` | "Edit Job" to "Edit Job Vacancy", "Job not found" to "Job vacancy not found", "Back to Jobs" to "Back to Vacancies", "Job Description" to "Job Vacancy Description", "Show salary range on job posting" to "Show salary range on vacancy" |
| `src/pages/hiring/JobsList.tsx` | "Search jobs..." to "Search vacancies...", "No jobs found" to "No vacancies found", "Create Job" to "Create Job Vacancy", "Edit Job" to "Edit Vacancy", "Pause Job" to "Pause Vacancy", "Resume Job" to "Resume Vacancy", "Close Job" to "Close Vacancy", "Delete Job" to "Delete Vacancy", "Create your first job posting to start hiring" to "Create your first vacancy to start hiring" |
| `src/pages/hiring/HiringDashboard.tsx` | "Create Job" to "Create Job Vacancy", "Jobs" tab to "Vacancies", "Active Jobs" to "Active Vacancies", "Search jobs..." to "Search vacancies...", "Manage job postings, candidates, and recruitment pipeline" to "Manage job vacancies, candidates, and recruitment pipeline" |
| `src/components/hiring/JobPostPreview.tsx` | "Fill in the form to see a live preview of your job posting" to "Fill in the form to see a live preview of your vacancy" |
| `src/services/useHiringMutations.ts` | Toast messages: "Job created" to "Job vacancy created", "Job updated" to "Job vacancy updated", "Job approved" to "Job vacancy approved", "Job published" to "Job vacancy published", "Job closed" to "Job vacancy closed", "Failed to create job" to "Failed to create vacancy", etc. |
| `src/pages/careers/CareersPage.tsx` | "Search jobs by title or location..." to "Search vacancies by title or location..." |
| `src/components/super-admin/OrganizationFeaturesManager.tsx` | "Job postings, applicant tracking..." to "Job vacancies, applicant tracking..." |

### Technical Details

#### UI Text Changes (All Files)
- Page headers/titles
- Button labels
- Placeholder text in search inputs
- Empty state messages
- Toast notification messages
- Tab labels
- Dropdown menu items
- Descriptive text/subtitles

#### Specific Replacements

**Singular Forms:**
- "Create Job" → "Create Job Vacancy"
- "Edit Job" → "Edit Job Vacancy"
- "Delete Job" → "Delete Vacancy"
- "Pause Job" → "Pause Vacancy"
- "Resume Job" → "Resume Vacancy"
- "Close Job" → "Close Vacancy"
- "Job not found" → "Job vacancy not found"
- "Job Description" → "Job Vacancy Description" (contextual)
- "Job created" → "Job vacancy created"
- "Job updated" → "Job vacancy updated"
- "Job approved" → "Job vacancy approved"
- "Job published" → "Job vacancy published"
- "Job closed" → "Job vacancy closed"
- "Failed to create job" → "Failed to create vacancy"
- "job posting" → "vacancy" (in context)

**Plural Forms:**
- "Jobs" (tab) → "Vacancies"
- "Active Jobs" → "Active Vacancies"
- "Search jobs..." → "Search vacancies..."
- "No jobs found" → "No vacancies found"
- "Back to Jobs" → "Back to Vacancies"
- "job postings" → "job vacancies"

### Files to Modify

1. `src/pages/hiring/JobCreate.tsx` - 3 text changes
2. `src/pages/hiring/JobDetail.tsx` - 6 text changes
3. `src/pages/hiring/JobEdit.tsx` - 6 text changes
4. `src/pages/hiring/JobsList.tsx` - 10 text changes
5. `src/pages/hiring/HiringDashboard.tsx` - 6 text changes
6. `src/components/hiring/JobPostPreview.tsx` - 1 text change
7. `src/services/useHiringMutations.ts` - 10 toast message changes
8. `src/pages/careers/CareersPage.tsx` - 1 text change
9. `src/components/super-admin/OrganizationFeaturesManager.tsx` - 1 text change

### What Stays the Same
- File names remain unchanged (JobCreate.tsx, JobsList.tsx, etc.) as these are technical identifiers
- Route URLs remain unchanged (`/hiring/jobs`, `/hiring/jobs/new`, etc.) for URL stability
- Database table names and field names remain unchanged
- Function/hook names remain unchanged (useCreateJob, useJobs, etc.)
- Internal code variables and types remain unchanged

