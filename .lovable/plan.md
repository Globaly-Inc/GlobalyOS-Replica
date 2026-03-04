

## Plan: Candidate Experience, Education & Skills CRUD

### Current State
- The `candidates` table has no fields for experience, education, or skills
- The resume parser already extracts this data but only stores it in `candidate_applications.custom_fields.parsed_resume` (JSON blob)
- No dedicated tables or UI exist for managing this data

### What We Will Build

**1. Database: 3 New Tables**

- `candidate_experiences` — work history (title, company, location, start_date, end_date, description, is_current)
- `candidate_education` — education background (degree, institution, field_of_study, start_year, end_year)
- `candidate_skills` — skills list (name, category, proficiency_level)

All linked to `candidate_id` + `organization_id` with proper RLS policies (org-scoped read/write for authenticated users).

**2. Data Layer: Service Hooks**

New hooks in `src/services/useHiring.ts`:
- `useCandidateExperiences(candidateId)` / `useCreateCandidateExperience` / `useUpdateCandidateExperience` / `useDeleteCandidateExperience`
- `useCandidateEducation(candidateId)` / `useCreateCandidateEducation` / `useUpdateCandidateEducation` / `useDeleteCandidateEducation`
- `useCandidateSkills(candidateId)` / `useCreateCandidateSkill` / `useUpdateCandidateSkill` / `useDeleteCandidateSkill`

**3. UI Components (3 new files)**

Following the existing card pattern in ApplicationDetail (icon header + border-b + CardContent):

- `src/components/hiring/CandidateExperienceCard.tsx` — Lists work history entries with company, title, dates, description. Add/Edit dialog with form fields. Delete confirmation. Empty state with "Add Experience" button.
- `src/components/hiring/CandidateEducationCard.tsx` — Lists education entries with degree, institution, field, years. Same CRUD pattern.
- `src/components/hiring/CandidateSkillsCard.tsx` — Displays skills as badges/chips with a "+" button to add. Inline delete (x on badge). Optional category grouping.

**4. Integration in ApplicationDetail.tsx**

Place the 3 new sections in the **left column** (below Activity Log), since they are candidate-level data shared across all position applications:

```text
Left Column (1/3):
  ├─ Activity Log
  ├─ Skills        (badges with + button)
  ├─ Experience    (work history cards with CRUD)
  └─ Education     (education cards with CRUD)
```

**5. Resume Parser Integration**

Update `parse-resume/index.ts` to auto-populate these new tables when parsing a resume, in addition to the existing `custom_fields` storage. This means parsed resume data will immediately appear in the structured UI.

### Files Changed
- **Migration**: Create `candidate_experiences`, `candidate_education`, `candidate_skills` tables with RLS
- `src/services/useHiring.ts` — Add CRUD hooks for all 3 entities
- `src/services/index.ts` — Export new hooks
- `src/components/hiring/CandidateExperienceCard.tsx` — New component
- `src/components/hiring/CandidateEducationCard.tsx` — New component
- `src/components/hiring/CandidateSkillsCard.tsx` — New component
- `src/pages/hiring/ApplicationDetail.tsx` — Add sections to left column
- `supabase/functions/parse-resume/index.ts` — Insert parsed data into new tables

