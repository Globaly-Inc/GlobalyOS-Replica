
## Fix: Email Trigger Toggle Not Showing for Screening Stage

### Root Cause

The `screening` stage is the only active stage **missing** from `DEFAULT_EMAIL_TRIGGERS`. The current mapping is:

```ts
const DEFAULT_EMAIL_TRIGGERS = {
  applied:     'application_received',
  // screening  <-- MISSING
  assignment:  'assignment_sent',
  interview_1: 'interview_scheduled',
  interview_2: 'interview_scheduled',
  interview_3: 'interview_scheduled',
  offer:       'offer_sent',
  hired:       'offer_accepted',
};
```

Because `effectiveTrigger` is `null` for `screening`:
1. The header Switch is hidden — it only renders when `matchedTpl` exists (which requires a non-null `effectiveTrigger`)
2. The body shows "No email trigger defined for this stage type." instead of a template card or Create button

### Two changes needed

**Fix 1 — Add `screening` to `DEFAULT_EMAIL_TRIGGERS`**

Add `screening: 'application_received'` to the map. The screening stage is the initial human review of an incoming application, so `application_received` is semantically appropriate. Since each trigger type maps to a single template (identified by `template_type`), this will share the same template as the `applied` stage — or the user can create a dedicated one.

Actually, a cleaner option: add a new dedicated trigger for screening. But `EmailTrigger` is a union type in `src/types/hiring.ts` and `EMAIL_TRIGGER_LABELS` must include it. We could repurpose `application_received` (already there) or add a lightweight new type.

The simplest, lowest-risk fix: use `application_received` for both `applied` and `screening` — they share the same template which is fine (many companies send one application confirmation email). No new DB migration needed, no new type needed.

**Fix 2 — Show the Switch even when no template exists**

Currently the switch in the header is `{matchedTpl && <Switch />}` — it hides entirely when there's no template. Change it to show the switch (disabled) when `effectiveTrigger` is set but no template exists, so users understand they need to create a template first.

Header switch logic becomes:
```tsx
{effectiveTrigger && (
  <Switch
    checked={!!matchedTpl?.is_active}
    onCheckedChange={active => matchedTpl && handleEmailActiveToggle(matchedTpl, active)}
    disabled={!matchedTpl || updateTemplateMutation.isPending}
  />
)}
```

This way:
- Stage has no effectiveTrigger (impossible after Fix 1) → no switch
- Stage has effectiveTrigger but no template → switch shown but greyed/disabled 
- Stage has effectiveTrigger AND a template → switch fully functional

### Files to change

| File | Change |
|------|--------|
| `src/components/hiring/PipelineCard.tsx` | 1. Add `screening: 'application_received'` to `DEFAULT_EMAIL_TRIGGERS`. 2. Update header Switch to render when `effectiveTrigger` is set (not just when template exists), disabled when no template. |

No DB migration needed. No new types needed. No other files need changes.

### After the fix

For the `screening` stage (and any stage with `effectiveTrigger` set but no template created yet):
```
✉ Email Trigger    [○ disabled toggle]
  Automatically send an email when a candidate enters this stage.
  ┌──────────────────────────────────────────────┐
  │ ○ Application Received                       │
  │   No template configured — create one to     │
  │   enable automated sending     [+ Create]    │
  └──────────────────────────────────────────────┘
```

Once a template is created, the toggle becomes active and functional.
