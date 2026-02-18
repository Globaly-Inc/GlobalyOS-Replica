
## Redesigned Pipeline Settings: Unified Stage Cards with Inline Automation + Email

### What the user wants
The selected area is the stage list inside a `PipelineCard`. The request is to:
1. Make the text larger and more readable
2. Match the visual design of the "Pipeline Stage Rules" accordion (color dot, bolder labels)
3. Keep drag-and-drop but improve it visually
4. Consolidate all automation rules (auto-assign, auto-reject, notifications) **into each stage row** — eliminating the separate "Pipeline Stage Rules" card below
5. Consolidate **email automation** settings per stage as well — so each stage accordion shows what email gets triggered when a candidate enters it

The result is a single, unified "Pipelines" card where each stage row is an expandable accordion with:
- Drag handle + color dot + stage name (larger)
- Automation sub-section (auto-assign, auto-reject, idle hours)
- Notifications sub-section (team members to notify)
- Email trigger sub-section (which email template fires on entry to this stage)

The separate "Pipeline Stage Rules" card and the standalone "Email Automation" tab are removed/merged.

---

### Architecture

#### Current state (3 disconnected sections):
```text
[Pipeline Settings tab]
  ├── Card: Pipelines
  │     └── PipelineCard (small text, stage list, drag)
  └── Card: Pipeline Stage Rules (separate accordion, separate save button)

[Email Automation tab]
  └── Table of email templates (completely separate)
```

#### New state (unified, per-stage):
```text
[Pipeline Settings tab]
  └── Card: Pipelines
        └── PipelineCard (redesigned)
              ├── Stage 1 row [drag handle | color dot | STAGE NAME | badges | expand chevron]
              │     └── Expanded panel:
              │           ├── [Automation] auto-assign toggle + template picker
              │           ├── [Rejection]  auto-reject on deadline + idle hours input
              │           ├── [Notify]     team member multi-select badges
              │           └── [Email]      email trigger dropdown (which template fires on entry)
              ├── Stage 2 row ...
              └── + Add Stage
```

Email Automation tab stays but just shows global templates for editing — the "which template fires on stage entry" is now also surfaced inline within the pipeline card.

---

### Files to change

#### 1. `src/components/hiring/PipelineCard.tsx` — Full redesign
- **SortableStageRow** becomes a full **SortableStageAccordion** component
- Each row renders:
  - Larger text (`text-sm` → `text-base`, number label bigger)
  - Active automation badges (e.g. "Auto-assign", "2 notified") as compact chips visible without expanding
  - Chevron to expand the automation panel inline
- Accepts new props: `stageRule`, `onRuleChange`, `employees`, `emailTemplates`
- Inline save per stage (or keep global Save Changes button at top of card)
- Remove the separate `PipelineCard` props for just rename/delete; add full rule props

#### 2. `src/components/hiring/PipelineSettingsSection.tsx` — Merge data and remove separate card
- Pass `stageRules`, `employees`, `emailTemplates` down into each `PipelineCard`
- Remove the second `Card` block ("Pipeline Stage Rules") entirely
- The `saveMutation` now fires per-stage on change (auto-save with debounce) OR keep a single "Save Rules" button inside each PipelineCard header
- Email templates are passed as read-only reference so each stage can pick which template fires on entry

#### 3. `src/pages/hiring/HiringSettings.tsx` — Keep Email Automation tab
- Email Automation tab stays for editing template content (subject, body, variables)
- Remove the "Pipeline Stage Rules" tab concept (it no longer exists separately)
- No structural tab changes needed; just the pipeline tab now contains the unified view

---

### UI Design Details

**Stage row (collapsed):**
```
[≡] [●] Applied                    [Auto-assign ✓] [3 notified] [v]
```

**Stage row (expanded):**
```
[≡] [●] Applied                    [Auto-assign ✓] [3 notified] [^]
  ┌──────────────────────────────────────────────────────────────┐
  │ ⚡ Automation                                                 │
  │   Auto-assign assignment    [OFF ──]                         │
  │                                                              │
  │ ⏱ Rejection Rules                                            │
  │   Auto-reject on deadline   [OFF ──]                         │
  │   Auto-reject after         [___] hours in this stage        │
  │                                                              │
  │ 🔔 Notify on Entry                                           │
  │   [+ Add team member ▾]                                      │
  │   [Sarah K. ×] [John D. ×]                                   │
  │                                                              │
  │ ✉ Email Trigger                                              │
  │   Send email when candidate enters:                          │
  │   [Application Received ▾]  [Active ●]                       │
  └──────────────────────────────────────────────────────────────┘
```

**Stage row sizing:**
- Number: `text-sm font-bold text-muted-foreground`
- Stage name: `text-base font-semibold`
- Color dot: `w-3 h-3` (up from `w-2 h-2`)
- Grip: `h-5 w-5` (up from `h-3.5`)
- Row padding: `py-3` (up from default)

**Email trigger mapping per stage** (sensible defaults to pre-populate):
| Stage | Default email trigger |
|-------|----------------------|
| applied | application_received |
| screening | — |
| assignment | assignment_sent |
| interview_1 | interview_scheduled |
| interview_2 | interview_scheduled |
| interview_3 | interview_scheduled |
| offer | offer_sent |
| hired | offer_accepted |

This mapping will be stored in `pipeline_stage_rules.email_trigger_type` — a new nullable column.

---

### Database change needed
Add one column to `pipeline_stage_rules`:
```sql
ALTER TABLE pipeline_stage_rules 
  ADD COLUMN IF NOT EXISTS email_trigger_type TEXT;
```
This stores which `EmailTrigger` (e.g., `'assignment_sent'`) fires when a candidate enters the stage. NULL = no email.

---

### Summary of changes
| File | Change |
|------|--------|
| `pipeline_stage_rules` table | Add `email_trigger_type TEXT` column |
| `src/components/hiring/PipelineCard.tsx` | Full redesign: stage accordion with inline automation + email |
| `src/components/hiring/PipelineSettingsSection.tsx` | Pass rules/employees/templates to PipelineCard, remove separate Rules card |
| `src/pages/hiring/HiringSettings.tsx` | No tab changes; Email Automation tab remains for template editing |
