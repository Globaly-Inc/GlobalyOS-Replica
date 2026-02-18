
## Remove Email Automation Tab Dependency — Inline Template Management in Pipeline Card

### What the user wants
The "Email Trigger" section inside each pipeline stage accordion currently shows a dropdown that lists existing templates from the separate "Email Automation" tab. If no template exists for a trigger type, it shows "No template". The user wants to:

1. **Remove the dependency on the Email Automation tab** — users should not need to leave the pipeline settings to manage email templates
2. **Add a "Create Template" popup directly inside the Email Trigger section** — so when a trigger type is selected that has no template, or the user wants to create/edit one, they can do it inline via a dialog

---

### Current flow (broken UX)
```text
User wants email on "Applied" stage
  → Opens Pipeline Settings
  → Selects "Application Received" trigger
  → Sees "No template" badge
  → Has to go to Email Automation tab → create template → come back
```

### New flow (unified UX)
```text
User wants email on "Applied" stage
  → Opens Pipeline Settings
  → Expands the "Applied" stage
  → Selects "Application Received" trigger from dropdown (or sees it pre-selected)
  → Sees "No template" badge + "Create Template" button right there
  → Clicks "Create Template" → dialog opens pre-filled with trigger type
  → Fills Name, Subject, Body → saves → badge updates to "Active"
  OR
  → Existing template shows "Edit" pencil icon to edit inline
```

---

### Changes required

#### 1. New component: `EmailTemplateDialog` (inline in `PipelineCard.tsx`)
A self-contained dialog component that handles both create and edit of a single `hiring_email_templates` record. It will:
- Accept: `triggerType` (pre-filled), `existingTemplate` (optional, for edit mode), `open`, `onClose`, `onSaved`
- Call `useCreateEmailTemplate` / `useUpdateEmailTemplate` mutations directly
- Fields: Name, Trigger (pre-locked to the stage's chosen trigger), Subject, Body, Active toggle
- Auto-populate the `Name` field with the trigger label (e.g., "Application Received") when creating

#### 2. Update `SortableStageAccordion` Email Trigger UI
Replace the current simple dropdown + status badge with a richer control:

**When no trigger selected:**
```
[No email trigger ▾]   (dropdown)
```

**When trigger selected, no template exists:**
```
[Application Received ▾]   [● No template]   [+ Create Template]
```

**When trigger selected and template exists:**
```
[Application Received ▾]   [● Active]   [✎ Edit]
```

The "Create Template" and "Edit" buttons open the `EmailTemplateDialog` dialog.

#### 3. Imports & hooks in `PipelineCard.tsx`
Add:
- `useCreateEmailTemplate` and `useUpdateEmailTemplate` from `src/services/useHiringMutations`
- `useHiringEmailTemplates` (already available via props — we'll keep using props so no double fetch)
- But the dialog will call mutations directly — after save, mutations already invalidate `['hiring', 'email-templates']`, which causes `PipelineSettingsSection` to refetch and update `emailTemplates` prop automatically

#### 4. Pass `onTemplateCreated` callback up (optional)
Since `PipelineSettingsSection` already uses `useHiringEmailTemplates()` and the mutations invalidate the same query key, the template list in the dropdown will automatically refresh after creation/edit — no extra callback needed.

---

### UI Design for the Email Trigger section

```
╔══════════════════════════════════════════════════════════╗
║ ✉ Email Trigger                                          ║
║   Automatically send an email when a candidate enters    ║
║   this stage.                                            ║
║                                                          ║
║   [Application Received          ▾]                      ║
║                                                          ║
║   ┌─────────────────────────────────────────────────┐   ║
║   │ ● Active  "Application Received"        [✎ Edit] │   ║
║   └─────────────────────────────────────────────────┘   ║
║                                                   (or)   ║
║   ┌─────────────────────────────────────────────────┐   ║
║   │ ○ No template configured          [+ Create]    │   ║
║   └─────────────────────────────────────────────────┘   ║
╚══════════════════════════════════════════════════════════╝
```

**Create/Edit Dialog:**
```
╔════════════════════════════════════════════╗
║ Create Email Template                  [×] ║
╠════════════════════════════════════════════╣
║ Template Name *                            ║
║ [Application Received              ]       ║
║                                            ║
║ Trigger (locked)                           ║
║ [Application Received        ▾ locked]     ║
║                                            ║
║ Subject *                                  ║
║ [Thank you for applying to {{job_title}}]  ║
║ Use {{candidate_name}}, {{job_title}},     ║
║ {{company_name}} for dynamic values        ║
║                                            ║
║ Email Body                                 ║
║ ┌────────────────────────────────────┐     ║
║ │ Dear {{candidate_name}},          │     ║
║ │                                   │     ║
║ │ Thank you for applying...         │     ║
║ └────────────────────────────────────┘     ║
║                                            ║
║ [○ Active]                                 ║
╠════════════════════════════════════════════╣
║              [Cancel]  [Save Template]     ║
╚════════════════════════════════════════════╝
```

---

### Files to change

| File | Change |
|------|--------|
| `src/components/hiring/PipelineCard.tsx` | Add `EmailTemplateDialog` component inline; update `SortableStageAccordion` Email Trigger section to show create/edit buttons |

That's the only file that needs to change. The mutations and queries already exist and work. The Email Automation tab in `HiringSettings.tsx` remains for power users who want a full list view — it is not removed, just no longer the only way to create templates.

---

### Key technical notes
- The dialog calls `useCreateEmailTemplate` / `useUpdateEmailTemplate` which invalidate `['hiring', 'email-templates']`
- `PipelineSettingsSection` fetches templates with `useHiringEmailTemplates()` using that same key, so the template list auto-refreshes after save
- The trigger dropdown in the dialog is pre-locked to the selected stage's trigger type — no mis-selection possible
- Subject placeholder suggestions are shown as helper text
