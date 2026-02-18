
## Enable Email Triggers by Default with AI-Generated Templates

### What's Being Done

Two things need to happen:

1. **Email triggers ON by default** — When a pipeline is created (or stages initialized), every stage should have `email_trigger_type = 'stage_entry'` set automatically instead of `null`.

2. **AI-generated default email templates** — A new edge function (`generate-stage-email-templates`) will use the Lovable AI gateway to generate sensible email templates for each stage (subject + body), then bulk-insert them into `hiring_email_templates` scoped to each `stage_id`. This is triggered once per pipeline/stage when no template exists.

---

### Architecture

```text
User opens Hiring Settings → Pipeline Settings
  └── For each stage with no template:
        └── "Generate Default Templates" button (or auto-trigger on page load)
              └── Edge Function: generate-stage-email-templates
                    ├── Accepts: [{ stage_id, stage_name, organization_id }]
                    ├── Calls Lovable AI (gemini-3-flash-preview) with a prompt per stage
                    ├── Returns: [{ stage_id, name, subject, body }]
                    └── Inserts into hiring_email_templates with stage_id set
```

---

### Changes Required

#### 1. `PipelineSettingsSection.tsx` — Default `email_trigger_type = 'stage_entry'`

In the rule initialization `useEffect`, change the default for new rules from `email_trigger_type: null` to `email_trigger_type: 'stage_entry'`. Also update `is_active: true` for new rules so they are saved.

This means every stage, when first seen, will default to having the email trigger enabled. The toggle in the UI will show ON for all stages by default.

Also add a **"Generate Email Templates" button** in the pipeline card header area that calls the new edge function to bulk-generate AI templates for all stages in that pipeline that don't yet have one.

#### 2. New Edge Function: `supabase/functions/generate-stage-email-templates/index.ts`

Accepts:
```json
{
  "organization_id": "...",
  "stages": [
    { "stage_id": "uuid", "stage_name": "Applied", "pipeline_name": "Default Pipeline" },
    ...
  ],
  "company_name": "Acme Corp"
}
```

- For each stage, calls Lovable AI with a tailored prompt to generate:
  - `name`: Template name (e.g., "Application Received")
  - `subject`: Email subject line
  - `body`: Plain-text email body (using `{{candidate_name}}`, `{{job_title}}`, `{{company_name}}` variables)
- Uses tool calling to get structured output per stage
- Inserts all templates into `hiring_email_templates` with `organization_id`, `stage_id`, `template_type = 'stage_entry'`, `is_active = true`
- Skips stages that already have a template for their `stage_id`

**Stage-specific AI prompts examples:**
- **Applied**: "Thank you for applying" confirmation email
- **Screening**: "We're reviewing your application" status update  
- **Assignment**: "Please complete this assignment" with next steps
- **Interview 1/2/3**: "You've been selected for an interview" scheduling email
- **Offer**: "We're pleased to offer you" offer notification
- **Hired**: "Welcome to the team" onboarding email

#### 3. `PipelineCard.tsx` — Add "Generate Templates" Button

Add a button in the `PipelineCard` header (next to the Save button) labelled **"Generate Email Templates"** with a Sparkles icon. It:
- Is visible when at least one stage in the pipeline has `effectiveTrigger` set but no matched template
- Shows loading state while calling the edge function
- On completion, invalidates the `['hiring', 'email-templates']` query so templates appear instantly

#### 4. `PipelineSettingsSection.tsx` — Auto-save rules on initialization

When stage rules are initialized with defaults (step 1), trigger `saveMutation` automatically so the `email_trigger_type = 'stage_entry'` is persisted to the DB, not just local state.

---

### UI Flow After Change

```
[Pipeline: Default Pipeline]  [Generate Email Templates ✨]  [Save Rules]

  ▼ Applied         ● Email  ● Assign  ...
  ▼ Screening       ● Email  ...
  ▼ Assignment      ● Email  ...
  ...

When "Generate Email Templates" is clicked:
  → Loading spinner
  → AI generates 8 templates in one call
  → Templates appear instantly in each stage accordion
  → Toast: "Email templates generated for all stages"
```

---

### Files to Change

| File | Change |
|---|---|
| `supabase/functions/generate-stage-email-templates/index.ts` | **New** edge function using Lovable AI |
| `src/components/hiring/PipelineCard.tsx` | Add "Generate Email Templates" button + handler prop |
| `src/components/hiring/PipelineSettingsSection.tsx` | Default `email_trigger_type: 'stage_entry'` on init; pass handler to PipelineCard; auto-save when new rules are defaulted |

No DB migration needed — the `stage_id` column already exists from the previous change.

---

### AI Prompt Strategy (inside edge function)

Uses a single AI call with tool calling to generate all stage templates at once, passing all stage names in one request. This is faster and cheaper than one call per stage.

```
System: You are an HR communications expert writing professional candidate-facing emails.
User: Generate email templates for these hiring pipeline stages for {{company_name}}: [Applied, Screening, Assignment, Interview 1, Offer, Hired]. 
      Use {{candidate_name}}, {{job_title}}, {{company_name}} as variables.
      Keep each email 80-120 words, warm, professional, and encouraging.
Tool: generate_stage_templates → returns array of { stage_name, name, subject, body }
```
