
## Remove Hardcoded Email Triggers — Per-Stage Email Configuration

### The Root Problem

The current design uses a hardcoded constant `DEFAULT_EMAIL_TRIGGERS` to map stage keys → email trigger types. This has multiple deep flaws:

- Custom stages (any stage not in the hardcoded list) get `effectiveTrigger = null`, hiding the entire email UI
- Two stages that share the same trigger type (e.g. `applied` and `screening` both mapping to `application_received`) share ONE template globally — editing one changes the other
- Adding a new built-in stage requires a code change every time

The correct architecture is: **each stage owns its own email trigger** stored as `email_trigger_type` in `StageRule` (the field already exists in the DB), and templates are matched per stage — not per trigger type globally.

---

### Architecture After the Fix

```text
Stage (org_pipeline_stages)
  └── StageRule (org_pipeline_stage_rules)
        └── email_trigger_type  ← stage picks its own trigger label
              └── HiringEmailTemplate matched by (org + template_type + stage_id)
```

Since `hiring_email_templates` currently matches by `template_type` globally (not by stage), we need to either:

**Option A (simpler, no migration):** Store the email template `id` directly on the `StageRule` — the stage points to a specific template record.  
**Option B (requires migration):** Add a `stage_id` column to `hiring_email_templates` so templates are scoped per stage.

**We will use Option B** — it's cleaner, allows the existing template editing flow to work, and properly isolates per-stage templates. A small migration adds `stage_id` (nullable, for backwards compat) to `hiring_email_templates`.

---

### Changes Required

#### 1. Database Migration
Add `stage_id uuid REFERENCES org_pipeline_stages(id) ON DELETE CASCADE` (nullable) to `hiring_email_templates`.

This is backwards compatible — existing templates (created from the Email Automation tab) have `stage_id = null` and continue working.

#### 2. `PipelineCard.tsx` — Remove `DEFAULT_EMAIL_TRIGGERS`, use per-stage logic

- **Delete** `DEFAULT_EMAIL_TRIGGERS` constant and `ALL_STAGE_KEYS` (no longer needed)
- **Change** `effectiveTrigger` to use `rule?.email_trigger_type ?? null` instead of `DEFAULT_EMAIL_TRIGGERS[stageKey]`
- **Change** template matching to filter by `stage_id = stage.id` (not by `template_type` globally)
- **Add** a trigger type selector in the email section: when no trigger is set, show a simple `<Select>` or `<Input>` letting the user pick/name a trigger type (e.g. "Stage Entry Email"), then save it to `StageRule.email_trigger_type` via `onRuleChange`
- The `EmailTemplateDialog` will pass `stage_id` when creating a new template

#### 3. `EmailTemplateDialog` — Accept and persist `stage_id`

- Add `stageId: string` prop
- Pass it to `useCreateEmailTemplate` so the created template is scoped to this stage

#### 4. `useHiringMutations.ts` — Update `createEmailTemplate` to accept `stage_id`

- Include `stage_id` in the insert payload

#### 5. `PipelineSettingsSection.tsx` — Pass `stage_id`-scoped templates per stage

- Instead of passing all `emailTemplates` flat to every `PipelineCard`, filter templates by `stage_id` per stage accordion, or pass all and let each stage filter by its own `stage.id`

#### 6. `src/types/hiring.ts` — The `EmailTrigger` union type becomes less relevant

- The `template_type` stored on per-stage templates will just be the stage's `email_trigger_type` string (can be any string like `"stage_entry"` or the user-set value)
- Existing `EmailTrigger` type stays for the global Email Automation tab; per-stage templates use a freeform string

---

### UI Flow After Fix

**For any stage (built-in or custom), when expanded:**

```
✉ Email Trigger                          [toggle — disabled until trigger set]
  Automatically send an email when a candidate enters this stage.

  [No trigger set]
  ┌─────────────────────────────────────────────────┐
  │ Choose a trigger type to enable email sending   │
  │ [Stage Entry ▾]          [Set Trigger]          │
  └─────────────────────────────────────────────────┘

  [After trigger is set, no template yet]
  ┌─────────────────────────────────────────────────┐
  │ ○  Stage Entry                                  │
  │    No template configured — create one          │
  │                               [+ Create]        │
  └─────────────────────────────────────────────────┘

  [After template created]
  ┌─────────────────────────────────────────────────┐
  │ ●  Application Confirmation                     │
  │    Subject: Thank you for applying...           │
  │    Active — will send automatically  [Edit]     │
  └─────────────────────────────────────────────────┘
```

---

### Files to Change

| File | Change |
|---|---|
| DB migration | Add `stage_id` column to `hiring_email_templates` |
| `src/components/hiring/PipelineCard.tsx` | Remove `DEFAULT_EMAIL_TRIGGERS`; use `rule?.email_trigger_type`; add trigger-type picker UI; pass `stage_id` to dialog |
| `src/components/hiring/PipelineCard.tsx` (`EmailTemplateDialog`) | Accept `stageId` prop; pass to create mutation |
| `src/services/useHiringMutations.ts` | Update `createEmailTemplate` to accept `stage_id` |
| `src/components/hiring/PipelineSettingsSection.tsx` | Pass templates filtered (or all, filtered in accordion) by `stage_id` |
| `src/types/hiring.ts` | Add `stage_id?: string | null` to `HiringEmailTemplate` interface |

No breaking changes to existing global email templates (stage_id stays null for them).
