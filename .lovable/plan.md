
## Remove Email Automation Tab — Fully Inline Within Pipeline Stages

### What will change

The "Email Automation" tab in `HiringSettings.tsx` will be completely removed. Everything that tab offered (creating, editing, and viewing email templates) is already available inline inside each pipeline stage accordion via the `EmailTemplateDialog` in `PipelineCard.tsx`. The only remaining gap is that the current dialog doesn't let you toggle `is_active` on an existing template from the same place — this will be confirmed as already supported.

---

### Files to change

#### 1. `src/pages/hiring/HiringSettings.tsx`

**Remove:**
- The `"Email Automation"` `TabsTrigger` (line 93–96)
- The `<TabsContent value="templates">` block (line 111–113)
- The entire `EmailTemplatesSection` function (lines 131–353)
- All imports that are only used by `EmailTemplatesSection`:
  - `useHiringEmailTemplates`
  - `useCreateEmailTemplate`, `useUpdateEmailTemplate`
  - `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`
  - `Mail` icon (only used in this section)
  - `EMAIL_TRIGGER_LABELS`, `EmailTrigger` type
  - `DialogTrigger` (only used here)

**Keep:** Pipeline Settings, Assignment Templates, Career Site Settings tabs — all unaffected.

**Update** the page subtitle from:
> "Manage email templates, assignment templates, and configuration"

To:
> "Manage pipelines, assignment templates, and configuration"

---

### Why no other files need to change

| Capability | Where it lives after this change |
|---|---|
| Create email template | Inside each stage → Email Trigger section → "Create Template" button → `EmailTemplateDialog` |
| Edit email template | Inside each stage → Email Trigger section → "Edit" button → `EmailTemplateDialog` |
| View all templates | Power users can still see what's set per stage at a glance (name + Active/Inactive badge) |
| Toggle template active/inactive | Inside `EmailTemplateDialog` (already has the Active switch) |

The `EmailTemplateDialog` in `PipelineCard.tsx` already covers the full create/edit lifecycle including the `is_active` toggle — no additional changes needed there.

---

### Result

```text
Before (4 tabs):
  [Pipeline Settings] [Email Automation] [Assignment Templates] [Career Site Settings]

After (3 tabs):
  [Pipeline Settings] [Assignment Templates] [Career Site Settings]
```

Email template management happens entirely within the pipeline stage accordion expansion, exactly where users already manage the email trigger selection.
