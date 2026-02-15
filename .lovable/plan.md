
## Position Pipeline Card Redesign

### What changes

**1. Page title becomes "Position Pipeline"**
- The `h1` heading changes from the job title (e.g., "Product Manager") to "Position Pipeline"
- The job title will appear inside the new summary card instead

**2. Remove the inline metadata row from the header**
- The metadata currently shown next to the title (location, department, work model, etc.) moves into the new card

**3. New 3-column summary card below the header**

The card will have three sections side by side:

| Left Column | Middle Column | Right Column |
|---|---|---|
| **Job Title - Status** | **Total X candidates** (bold count) | Pipeline stage mini-chart |
| Location - Department - Work Model - Employment Type - Positions count | Assignment - (template name or "None") | Shows candidate count per active stage |
| Apply by date - Auto-close badge | | e.g., Applied: 2, Screening: 1, Interview: 3 |
| Salary Range - Currency Min - Max | | |

**4. Remove the old "Job Summary Card"** (lines 338-368) since its data is merged into the new card

### Technical details

**File: `src/pages/hiring/JobDetail.tsx`**

- Change the `h1` text from `{job.title}` to `"Position Pipeline"`
- Remove the metadata `div` (lines 173-217) from the header area
- Replace the existing summary Card (lines 338-368) with the new 3-column layout
- The right column will compute stage counts from `applications` array, grouping by `stage` field and displaying counts using `APPLICATION_STAGE_LABELS`
- Assignment info will check if the job has linked assignment templates (query from `assignment_templates` table or show from existing data)
- Responsive: on mobile, columns stack vertically

**No database changes needed** -- all data is already available from existing queries.
