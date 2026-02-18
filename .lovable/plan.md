
## Add On/Off Switches to "Notify on Entry" and "Email Trigger" Sections

### What the user wants
Each section in the stage accordion should have a top-level on/off `Switch` so the feature can be enabled or disabled without opening a dialog or removing data.

---

### Current state

**Notify on Entry** — has a dropdown to add team members and a list of chip badges. No on/off toggle. Adding members implicitly activates the rule; removing all of them is the only way to "disable" it.

**Email Trigger** — shows a template card with a dot indicator (green = active, grey = inactive). Toggling `is_active` on the template requires clicking "Edit" and using the switch inside the dialog.

---

### Proposed changes

#### 1. Notify on Entry — add a section-level toggle

Add a `Switch` in the section header row, next to the "Notify on Entry" label. The switch controls `notify_employee_ids` being active: when toggled OFF, the dropdown and chips are hidden/greyed out (but the saved employee list is preserved in state so re-enabling restores it).

The simplest approach: track a local `notifyEnabled` derived from whether `notify_employee_ids.length > 0`. But to have a proper on/off independent of the list count, we can use a local state `notifyEnabled` that:
- Defaults to `true` if `rule.notify_employee_ids.length > 0`
- When turned off: calls `onRuleChange` with `notify_employee_ids: []` (clears from DB on save) — but also keeps the previous list in local state to restore on re-enable

Actually the simpler, cleaner approach matching the existing `is_active` pattern already on `StageRule`:
- Add a `notify_enabled` boolean to `StageRule` (local state only, not a new DB column — we derive it from whether `notify_employee_ids` is non-empty, but the switch itself directly calls `onRuleChange` to set `notify_employee_ids: []` when turned off)
- The switch lives in the section header; the dropdown/chips are only shown when the switch is ON

**Implementation**: Use a local `useState<boolean>` inside `SortableStageAccordion` for `notifyEnabled`, initialized from `(rule?.notify_employee_ids?.length ?? 0) > 0`. When toggled off, store the current list in a ref and clear `notify_employee_ids`. When toggled on, restore the list from the ref.

#### 2. Email Trigger — add a section-level toggle

Add a `Switch` next to the "Email Trigger" section header. This switch directly maps to the template's `is_active` field. It calls `useUpdateEmailTemplate` to persist the toggle immediately (no dialog needed).

- If a template **exists**: Switch reflects `matchedTemplate.is_active`. Toggling it calls `updateMutation.mutateAsync({ id: template.id, input: { ...template, is_active: newValue } })` inline.
- If **no template**: Switch is disabled/hidden (can't enable what doesn't exist). The "Create" button is still visible.
- The switch provides immediate visual feedback with an optimistic state update.

---

### Files to change

| File | Change |
|------|--------|
| `src/components/hiring/PipelineCard.tsx` | 1. Add a `Switch` + label in the "Notify on Entry" section header row. Manage local `notifyEnabled` state with a ref to preserve the employee list when toggled off. 2. Add a `Switch` in the "Email Trigger" section header row that directly calls `useUpdateEmailTemplate` to toggle `is_active` on the matched template. |

No DB schema changes needed — `notify_employee_ids` is already how the notification list is persisted, and `is_active` already exists on `hiring_email_templates`.

---

### UI After the Change

**Notify on Entry** section header:
```
🔔 Notify on Entry          [○ OFF]
```
When ON:
```
🔔 Notify on Entry          [● ON]
   [+ Add team member ▾]
   [Alice ×]  [Bob ×]
   These team members will be notified...
```
When OFF:
```
🔔 Notify on Entry          [○ OFF]
   (dropdown hidden, members preserved in state)
```

**Email Trigger** section header:
```
✉ Email Trigger             [● ON]   ← toggles is_active on the template
```
No template exists:
```
✉ Email Trigger             (no switch — greyed, template must be created first)
```

---

### Technical notes
- `notifyEnabled` local state in `SortableStageAccordion` uses a `useRef` to hold the previous employee list when toggled off, so it can be restored when toggled back on.
- Email toggle uses `useUpdateEmailTemplate` (already imported at the top of `PipelineCard.tsx`) and updates immediately on toggle — no "Save Rules" button needed for this specific toggle since it's a template property, not a stage rule property.
- The collapsed row badge for `notifyCount` will still only show when there are employees configured (no change to badge logic).
- The email section `hasEmail` badge in the collapsed header already reflects template `is_active` — no change needed there.
