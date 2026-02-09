

# Edit and Delete Last Working Day with Leave Re-Proration

## Summary

When an Owner/Admin/HR edits or removes the last working day, the system must **reverse the previous proration adjustment** and (if editing) **apply a new one** based on the updated date. Currently, the database trigger only handles the initial set -- it does not reverse or re-prorate on changes/deletion.

There is also a **bug** in the current trigger: the latest migration (`20260205`) references `NEW.resignation_date` instead of `NEW.last_working_day`, causing the trigger to silently fail. This will be fixed.

## Changes

### 1. Fix and enhance the database trigger

**Migration: `handle_leave_proration_on_offboarding`**

Rewrite the trigger to handle three scenarios:

| Scenario | OLD.last_working_day | NEW.last_working_day | Action |
|----------|---------------------|---------------------|--------|
| Set | NULL | date | Calculate proration, deduct excess balance |
| Edit | date_A | date_B | Reverse previous proration logs, then re-prorate with new date |
| Delete | date | NULL | Reverse all previous proration logs (restore original balances) |

**Reversal logic:** Delete all `leave_balance_logs` rows for this employee/year where `action = 'offboarding_proration'`, then insert compensating (positive) log entries to restore the balances. The existing `sync_balance_from_log` trigger will automatically update `leave_type_balances`.

**Bug fix:** Replace all references to `resignation_date` with `last_working_day`. Use `calculate_prorated_leave_monthly` for consistent monthly-based proration (matching the preview calculation).

### 2. Update `SetResignationDialog` for edit and delete

**File:** `src/components/dialogs/SetResignationDialog.tsx`

- Add optional `currentLastWorkingDay` prop
- Pre-populate the date picker when editing an existing date
- Add a "Remove Resignation Date" button (destructive variant) in the footer when editing
- Remove action sets `last_working_day` to `null` and calls `onSuccess`
- Dynamic title: "Edit Resignation Date" vs "Set Resignation Date"
- The proration preview already works reactively -- it will show the new proration based on the selected date

### 3. Make the "Last day" badge clickable on the profile

**File:** `src/pages/TeamMemberProfile.tsx`

- Wrap the existing last-working-day badge (line 761) with a click handler that opens `SetResignationDialog`
- Pass `currentLastWorkingDay={employee.last_working_day}` to the dialog
- The "Set Resignation" button (line 688) continues to work for the initial set (no `currentLastWorkingDay` passed)

### 4. Handle offboarding workflow on date change/removal

**File (trigger):** `handle_offboarding_workflow`

- When `last_working_day` changes from one date to another: update the existing offboarding workflow's `target_date` and re-calculate task due dates
- When `last_working_day` is set to NULL: cancel the offboarding workflow (set status to `'cancelled'`), keeping historical records intact

## What stays the same

- The proration preview hook (`useProrationPreview`) already handles any date dynamically -- no changes needed
- The `sync_balance_from_log` trigger automatically updates `leave_type_balances` when logs are inserted -- no changes needed
- Role-based visibility restrictions remain enforced (Owner/Admin/HR only)

## Technical Details

### Database migration (SQL)

```text
1. DELETE existing offboarding_proration logs when reversing
2. Insert compensating log entries to restore balance
3. If new date provided, calculate new proration and insert deduction logs
4. Use calculate_prorated_leave_monthly() for consistency with preview
5. Handle offboarding workflow target_date updates
```

| File | Change |
|------|--------|
| New migration SQL | Rewrite `handle_leave_proration_on_offboarding` to handle set/edit/delete with reversal logic; fix `resignation_date` bug; update `handle_offboarding_workflow` for date changes and deletion |
| `src/components/dialogs/SetResignationDialog.tsx` | Add `currentLastWorkingDay` prop, pre-fill date, add "Remove" button, dynamic title |
| `src/pages/TeamMemberProfile.tsx` | Make last-day badge clickable to open edit dialog, pass current date |

