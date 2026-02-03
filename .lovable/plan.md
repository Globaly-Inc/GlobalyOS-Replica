

# Enhanced AI Job Description Generation

## Summary
Improve the AI job description generation across three areas:
1. **Job Vacancy Creation** - Dynamic button text ("Generate with AI" / "Improve with AI") and enhanced context-aware generation
2. **Super Admin Templates > Positions** - Add "Improve with AI" capability  
3. **Org Settings > Positions** - Already has both buttons, ensure consistent behavior

The edge function `generate-job-description` will be enhanced to consider more context and follow a specific content structure.

## Implementation Details

### 1. Update Job Create/Edit Pages - Dynamic AI Button

**Files:** `src/pages/hiring/JobCreate.tsx`, `src/pages/hiring/JobEdit.tsx`

| Current | Updated |
|---------|---------|
| Always shows "Generate with AI" | Shows "Generate with AI" when empty, "Improve with AI" when content exists |
| Fixed generation structure | Enhanced 5-section structure with max 700 words |

**Button Logic:**
```typescript
const hasContent = formData.description.trim().length > 50;
const buttonLabel = isGeneratingJD 
  ? "Generating..." 
  : hasContent 
    ? "Improve with AI" 
    : "Generate with AI";
```

### 2. Enhance generate-job-description Edge Function

**File:** `supabase/functions/generate-job-description/index.ts`

Add new request parameters and improve the prompt:

| New Parameter | Purpose |
|--------------|---------|
| `seniority_level` | Optional override for detected seniority |
| `existing_description` | For "improve" mode |
| `mode` | "generate" or "improve" |
| `region` | Office region context |

**Enhanced Prompt Structure (700 words max):**

```text
## Position Overview
Short description with business impact (50-80 words)

## Duties & Responsibilities
6-8 bullet points, well-described (200-250 words)

## Qualifications & Requirements
- Education and experience appropriate for seniority level
- Technical skills and certifications
(100-120 words)

## Soft Skills & Mindset
4-5 qualities for success (80-100 words)

## How to Apply
Brief instructions with deadline if provided (30-50 words)
```

**Context Integration:**
- Organization's business category (industry) from currentOrg.industry
- Position seniority level (detected or specified)
- Department name
- Office location, country, and region
- Work model (remote/hybrid/onsite)
- Employment type (full-time/part-time/contract/internship)
- Application deadline (if provided)

**Anti-Hallucination Rules:**
- Only use provided context
- No invented benefits, perks, or culture statements
- No made-up team names or project details
- Keep experience requirements realistic for seniority level

### 3. Update Super Admin Template Position Editor

**File:** `src/components/super-admin/templates/TemplatePositionEditor.tsx`

Add "Improve with AI" button alongside existing "Generate with AI":

| Change | Details |
|--------|---------|
| Add conditional button | Show "Improve with AI" when description exists |
| Update generateWithAI function | Accept mode parameter ("generate" or "improve") |
| Pass existing content | Include current description and responsibilities for improvement |

### 4. Verify Org Settings Positions

**File:** `src/components/settings/PositionsSettings.tsx`

The component already has both buttons (lines 487-511). Ensure:
- "Generate Description" button calls with mode="generate"
- "Improve" button calls with mode="improve" and passes existing content
- Pass organization industry for better context

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/generate-job-description/index.ts` | Add mode support, improve prompt structure, add anti-hallucination rules, use 5-section format |
| `src/pages/hiring/JobCreate.tsx` | Dynamic button label, pass mode and existing description to edge function |
| `src/pages/hiring/JobEdit.tsx` | Same changes as JobCreate |
| `src/components/super-admin/templates/TemplatePositionEditor.tsx` | Add "Improve with AI" button, update generateWithAI to support modes |
| `src/components/settings/PositionsSettings.tsx` | Ensure industry context is passed (already has both buttons) |

## Technical Details

### Edge Function Enhancement

```typescript
interface GenerateJDRequest {
  // Existing fields...
  mode?: "generate" | "improve";
  existing_description?: string;
  seniority_level?: string; // Optional override
  region?: string;
}
```

### Updated System Prompt

```text
You are an expert HR professional and technical recruiter for the [INDUSTRY] industry.
Create factual, professional job descriptions based ONLY on the information provided.

STRICT RULES:
- Do NOT invent company-specific details, benefits, team names, or technologies not implied by the role
- Do NOT use generic filler phrases like "competitive salary", "great culture", or "dynamic team"
- Do NOT hallucinate any information not explicitly provided
- Keep experience requirements realistic for the [SENIORITY LEVEL] level
- Use active voice and industry-appropriate terminology
- Maximum 700 words total

REQUIRED STRUCTURE:
1. Position Overview (50-80 words) - Start with business impact
2. Duties & Responsibilities (6-8 bullet points, 200-250 words)
3. Qualifications & Requirements (100-120 words) - Education, experience, technical skills
4. Soft Skills & Mindset (4-5 qualities, 80-100 words)
5. How to Apply (30-50 words) - Include deadline if provided
```

### UI Button States

| State | Button Text | Icon |
|-------|------------|------|
| Empty description | "Generate with AI" | Sparkles |
| Has content | "Improve with AI" | Wand2 |
| Loading | "Generating..." / "Improving..." | Loader2 (spinning) |

## Visual Changes

**Job Create/Edit Page:**
```text
Before: [✨ Generate with AI] (always shown)
After:  [✨ Generate with AI] (when empty)
        [🪄 Improve with AI] (when content exists)
```

**Super Admin Template Editor:**
```text
Before: [✨ Generate with AI] (single button)
After:  [✨ Generate with AI] [🪄 Improve with AI] (conditional)
```

