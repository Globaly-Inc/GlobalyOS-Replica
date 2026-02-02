
# Enhanced AI Job Description Generation

## Summary
Improve the AI-generated job descriptions across three areas of GlobalyOS by providing richer context to the AI model, producing more comprehensive and relevant content tailored to the organization's industry, the position's level/seniority, and the job's specific requirements.

## Scope of Changes

### 1. Job Creation Form (`/hiring/jobs/new`)
The "Generate with AI" button will use enhanced context to generate better job descriptions.

### 2. Org Settings > Positions 
The existing AI description generator in `PositionsSettings.tsx` will be enhanced with similar improvements.

### 3. Super Admin Templates > Positions
The template position editor in `TemplatePositionEditor.tsx` will gain an AI generate button using the same improved logic.

---

## Implementation Details

### A. Edge Function Enhancement (`supabase/functions/generate-job-description/index.ts`)

**Current State:**
- Uses basic fields: title, department, location, work_model, employment_type, salary info
- Generic prompt that produces template-like output

**Enhanced Approach:**

1. **Accept Additional Context:**
   - `business_category` / `industry` - From organization's industry field
   - `seniority_level` - Parsed from position title or explicitly provided (Junior, Mid, Senior, Lead, Manager, Director, etc.)
   - `office_location` with `country` - For regional context
   - `company_size` - For appropriate scope of responsibilities
   - `application_deadline` - Optional field for the description

2. **Improved Prompt Structure:**
   - System prompt that emphasizes factual, industry-specific content
   - User prompt structured to produce the exact format requested:
     - Short Position Description with business impact (~100 words)
     - Duties & Responsibilities (6-8 well-described bullet points)
     - Qualifications & Requirements (education, experience, technical skills)
     - Soft Skills & Mindset (4-5 items)
     - How to Apply section
   - Word limit enforcement: max 700 words
   - Explicit instruction: "Do not invent or assume facts not provided"

3. **Seniority Detection:**
   - Parse title for keywords: Intern, Junior, Associate, Mid, Senior, Lead, Principal, Staff, Manager, Director, VP, Head, Chief
   - Use this to adjust expectations in the description (years of experience, leadership scope, strategic vs tactical)

### B. Frontend Changes - Job Create Page (`src/pages/hiring/JobCreate.tsx`)

**Current `generateJobDescription` function sends:**
```typescript
{
  organization_id, title, department, location,
  work_model, employment_type, salary info, company_name
}
```

**Enhanced version will send:**
```typescript
{
  organization_id,
  title,
  department,
  location,
  office_country,     // From selected office
  work_model,
  employment_type,
  salary_min, salary_max, salary_currency,
  company_name,
  industry,           // Organization's industry
  company_size,       // Organization's company_size
  application_deadline, // If target_start_date is provided
}
```

**Additional Changes:**
- Fetch organization's `industry` and `company_size` from `currentOrg` (may need to extend useOrganization hook if not available)
- Pass selected office's country for regional context

### C. Frontend Changes - Positions Settings (`src/components/settings/PositionsSettings.tsx`)

**Enhance `handleGenerateDescription` to pass:**
- Organization industry
- Department context
- Keywords already supported

**No UI changes needed** - just enhanced data being sent to the edge function.

### D. Frontend Changes - Super Admin Template Position Editor (`src/components/super-admin/templates/TemplatePositionEditor.tsx`)

**Add "Generate with AI" button** to the edit/create dialog:
- Uses `business_category` as the industry context
- Uses `department_name` for department context
- Generates description and responsibilities via `generate-position-description` edge function
- Populates the form fields with generated content

### E. Edge Function Enhancement (`supabase/functions/generate-position-description/index.ts`)

**Enhance to accept additional context:**
- `industry` / `business_category` - For industry-specific language
- Already accepts: positionName, department, keywords, mode

**Update prompt to match new structure:**
- Short description with business impact
- Responsibilities in bullet points
- Keep concise format (100-150 words description, 5-8 responsibilities)

---

## New Prompt Template (Job Description)

```text
System: You are an expert HR professional writing job descriptions for the {industry} industry. 
Create factual, professional content based ONLY on the information provided. 
Do not invent company-specific details, benefits, or requirements not explicitly given.
Use active voice, professional language, and industry-appropriate terminology.

User: Generate a job description for:
- Position: {title}
- Industry: {industry}
- Department: {department}
- Location: {location}, {country}
- Work Model: {work_model}
- Employment Type: {employment_type}
- Company Size: {company_size}
{salary info if visible}
{application deadline if provided}

Based on the title, this appears to be a {seniority_level} level position.

Generate the following sections (max 700 words total):

1. **Position Overview** (~100 words)
   Start with the role's core purpose and its direct impact on business outcomes.

2. **Key Responsibilities** (6-8 bullet points)
   Each responsibility should be actionable and specific to this level.

3. **Qualifications & Requirements**
   - Education requirements
   - Years of experience appropriate for {seniority_level} level
   - Technical skills required

4. **Soft Skills & Mindset** (4-5 items)
   Qualities that make someone successful in this role.

5. **How to Apply**
   Brief instruction to submit application with CV/resume.
   {Include deadline if provided}

Do NOT include:
- Salary information (unless explicitly requested to show)
- Company-specific benefits you don't know
- Made-up team names or project names
- Generic phrases like "competitive salary" or "great culture"
```

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/generate-job-description/index.ts` | Enhanced prompt, accept new fields, seniority detection |
| `src/pages/hiring/JobCreate.tsx` | Pass additional context (industry, company_size, office country) |
| `src/components/settings/PositionsSettings.tsx` | Pass industry context to edge function |
| `src/components/super-admin/templates/TemplatePositionEditor.tsx` | Add AI generate button |
| `supabase/functions/generate-position-description/index.ts` | Accept industry/business_category, enhanced prompt |

---

## Technical Considerations

1. **Organization Data Access:**
   - `useOrganization` hook provides `currentOrg` with `id`, `name`, `slug`, etc.
   - May need to query additional fields (`industry`, `company_size`) if not already in the hook

2. **Seniority Parsing:**
   - Implement simple keyword matching in edge function
   - Keywords: intern, junior, associate, mid-level, senior, lead, principal, staff, manager, director, vp, head, chief, executive

3. **Word Count Control:**
   - Use `max_tokens: 2000` (roughly 700-800 words)
   - Explicit prompt instruction for 700 word limit

4. **Rate Limiting:**
   - Existing error handling for 429/402 errors is already in place

5. **Tool Calling:**
   - Use structured tool calling for position descriptions to ensure consistent format
   - For job descriptions, use regular completion since output is markdown

---

## Expected Output Format (Job Description)

```markdown
## Position Overview
[100-word description of role purpose and business impact]

## Key Responsibilities
- [Specific, actionable responsibility 1]
- [Specific, actionable responsibility 2]
- [6-8 total items]

## Qualifications & Requirements
- Bachelor's degree in [relevant field] or equivalent experience
- [X]+ years of experience in [relevant area]
- Proficiency in [specific skills]
- [Additional requirements]

## Soft Skills & Mindset
- [Relevant soft skill 1]
- [Relevant soft skill 2]
- [4-5 total items]

## How to Apply
Submit your application with an updated CV/resume through our application portal.
[Deadline if provided]
```
