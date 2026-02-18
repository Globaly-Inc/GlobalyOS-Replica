
## Simplify Email Trigger — Always "Stage Entry", No Picker

### What the User Wants

The email trigger for every stage is always and only "Stage Entry Email" — when a candidate enters the stage, an email fires. There's no need to choose a trigger type. The UI should be simplified to:

1. A toggle (Switch) in the Email Trigger header — always visible, not conditional on `effectiveTrigger` being set
2. When the toggle is turned **ON** → immediately set `email_trigger_type = 'stage_entry'` on the rule AND open the email template dialog if no template exists yet (or show the template card if one already exists)
3. When the toggle is turned **OFF** → clear `email_trigger_type` to null
4. Remove the entire "Choose a trigger type" picker (the `<Select>` + "Set Trigger" button block)
5. Remove `TRIGGER_TYPE_OPTIONS`, `pendingTriggerType` state, `setPendingTriggerType`, `handleSetTrigger`
6. Remove `getTriggerLabel` (no longer needed since there's only one trigger type)

### New UI Flow

```text
✉ Email Trigger                        [● ON / ○ OFF toggle — always visible]
  Automatically send an email when a candidate enters this stage.

  [Toggle OFF — nothing shown below]

  [Toggle ON, no template yet — dialog opens automatically, or show card:]
  ┌─────────────────────────────────────────────────┐
  │ ○  No template configured                       │
  │    Create a template to send emails             │
  │                                  [+ Create]     │
  └─────────────────────────────────────────────────┘

  [Toggle ON, template exists:]
  ┌─────────────────────────────────────────────────┐
  │ ●  Welcome Email                                │
  │    Subject: Thank you for applying...           │
  │    Active — will send automatically  [Edit]     │
  └─────────────────────────────────────────────────┘
```

### Files to Change

Only **`src/components/hiring/PipelineCard.tsx`** needs changes — no DB migration, no type changes, no mutation changes.

### Specific Changes in `PipelineCard.tsx`

1. **Remove** `TRIGGER_TYPE_OPTIONS` constant (lines 137-145)
2. **Remove** `getTriggerLabel` function (lines 147-153) — or simplify to just return "Stage Entry Email" always
3. **Remove** `pendingTriggerType` / `setPendingTriggerType` state from `SortableStageAccordion` (line 377)
4. **Remove** `handleSetTrigger` function (lines 443-445)
5. **Update the Email Trigger header Switch**: Always render it. `checked` = `!!effectiveTrigger` (whether trigger is set). On toggle ON → call `onRuleChange(stageKey, { email_trigger_type: 'stage_entry', is_active: true })` and if no template exists, open `templateDialogOpen`. On toggle OFF → call `onRuleChange(stageKey, { email_trigger_type: null })`.
6. **Remove** the "No trigger set" picker block (`!effectiveTrigger` branch, lines 771-799)
7. **Update** the body to only show content when `effectiveTrigger` is set (toggle is ON), otherwise show nothing (or just the description text). The two remaining states are: template exists → show template card; no template → show "Create" card.
8. **Update** `EmailTemplateDialog` call (line 886): remove the `{effectiveTrigger && ...}` guard — always render it but keep `open` state controlling visibility; `triggerType` is always `'stage_entry'`.

### Summary of Removed Elements
- `TRIGGER_TYPE_OPTIONS` array
- `getTriggerLabel()` function  
- `pendingTriggerType` state + `setPendingTriggerType`
- `handleSetTrigger` handler
- The entire "Choose a trigger type" picker UI block (Select + Set Trigger button)
- Conditional guard `{effectiveTrigger && <Switch>}` → Switch is always shown
