
## Remove Trigger Dropdown — Auto-assign Default Email Template Per Stage

### What changes

The "Email Trigger" section currently has two steps:
1. A dropdown to pick *which* trigger type to use
2. Then a status card showing the template (or "No template" + Create button)

The user wants to eliminate step 1 entirely. Each stage should simply show its email template directly — pre-populated with the stage's natural default trigger type — with an inline "Edit" button to open the dialog. No dropdown selection needed.

---

### Design

**Before:**
```
[Email Trigger]
  Automatically send an email when...
  [Application Received ▾]   ← dropdown
  ┌────────────────────────────────────┐
  │ ● Active "App Received"  [✎ Edit] │
  └────────────────────────────────────┘
```

**After:**
```
[Email Trigger]
  Automatically send an email when a candidate enters this stage.
  ┌────────────────────────────────────┐
  │ Application Received               │
  │ Subject: Thank you for applying... │
  │ [Active ●]              [✎ Edit]  │
  └────────────────────────────────────┘
```
Or if no template exists yet for this stage's trigger:
```
  ┌────────────────────────────────────┐
  │ No email configured for this stage │
  │                      [+ Create]   │
  └────────────────────────────────────┘
```

---

### Logic changes

Each stage has a **fixed** default trigger based on `DEFAULT_EMAIL_TRIGGERS` (already defined in the file):
```ts
const DEFAULT_EMAIL_TRIGGERS = {
  applied:      'application_received',
  assignment:   'assignment_sent',
  interview_1:  'interview_scheduled',
  interview_2:  'interview_scheduled',
  interview_3:  'interview_scheduled',
  offer:        'offer_sent',
  hired:        'offer_accepted',
};
```

Stages without a natural trigger (e.g., `screening`) will show the section with "No email trigger for this stage type" — or we can still allow the user to create a template with a generic type.

When rendering the Email section:
1. Resolve `triggerType = DEFAULT_EMAIL_TRIGGERS[stageKey] ?? null`
2. Find matching template: `emailTemplates.find(t => t.template_type === triggerType)`
3. If template exists → show template card with name, subject preview, active badge, Edit button
4. If no template → show "No template" dashed card with "+ Create Template" button
5. No dropdown rendered at all

The `email_trigger_type` on the rule still gets set automatically (to the default trigger for the stage) when saving, so the DB column still holds the value — we just don't expose the selection UI to the user.

---

### Auto-set rule on mount / on save

When the stage accordion is shown, if `rule?.email_trigger_type` is null but the stage has a default trigger, we auto-set it via `onRuleChange` so saving still works correctly. This can be done in a `useEffect` or simply at save time in `PipelineSettingsSection`.

The simpler approach: derive `effectiveTrigger` purely from `DEFAULT_EMAIL_TRIGGERS[stageKey]` in the render logic — don't rely on `rule.email_trigger_type` at all for the display. When the user clicks "Create" or "Edit" and saves via the dialog, the trigger type is already baked into the `EmailTemplateDialog` (it's pre-locked to the stage's trigger). The `onRuleChange` call to persist `email_trigger_type` happens when saving the stage rule.

---

### Files to change

| File | Change |
|------|--------|
| `src/components/hiring/PipelineCard.tsx` | Remove the `<Select>` trigger dropdown in the Email Trigger section. Replace with a direct template card that reads from `DEFAULT_EMAIL_TRIGGERS[stageKey]` and finds the matching template from `emailTemplates`. Show Edit or Create Template button accordingly. |

No other files need to change. The `EmailTemplateDialog` already handles create/edit and the trigger type passed to it will now always be the stage's default (not user-selected).

---

### Stages without a default trigger

For `screening` (which has no entry in `DEFAULT_EMAIL_TRIGGERS`), the Email section will show a simple message: *"No email trigger defined for this stage type."* — keeping it clean without empty dropdowns.

---

### Summary of the UI section after the change

```
✉ Email Trigger
  Automatically send an email when a candidate enters this stage.

  [Template card]
    ┌───────────────────────────────────────────┐
    │ ● Application Received                    │
    │   Subject: Thank you for applying to...   │
    │   Active — will send automatically  [Edit]│
    └───────────────────────────────────────────┘
  OR
    ┌───────────────────────────────────────────┐
    │ ○ No template configured                  │
    │   Create one to enable automated sending  │
    │                              [+ Create]   │
    └───────────────────────────────────────────┘
```
