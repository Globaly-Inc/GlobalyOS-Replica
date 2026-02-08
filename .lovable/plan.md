

# Enforce the `attendance_enabled` Toggle

## Summary

The `attendance_enabled` flag already exists in the `office_attendance_settings` table and has a toggle in the admin UI, but it is never enforced. When disabled for an office, employees should not be required to check in and should not appear in "Not Checked In" reports.

## Changes

### 1. Expose `attendance_enabled` in `useMyOfficeAttendanceSettings`

**File:** `src/hooks/useMyOfficeAttendanceSettings.ts`

- Add `attendance_enabled: boolean` to the `MyOfficeAttendanceSettings` interface (default: `true`)
- Include it in the returned object when office settings are fetched
- Set it to `true` in fallback/default scenarios (no office assigned, no settings row)

### 2. Hide `SelfCheckInCard` when attendance is disabled

**File:** `src/components/home/SelfCheckInCard.tsx`

- Import `useMyOfficeAttendanceSettings`
- Read `attendance_enabled` from the settings
- Add to the early-return condition at line 193: if `attendance_enabled === false`, return `null` (don't show the check-in card)

### 3. Exclude disabled-office employees from "Not Checked In" report

**File:** `src/components/attendance/AttendanceNotCheckedInTab.tsx`

- In `loadTodayNotCheckedIn`, fetch `office_attendance_settings` rows where `attendance_enabled = false` for the current org
- Build a set of `disabled_office_ids`
- In the employee filter (line 257), skip employees whose `office_id` is in `disabled_office_ids`

### 4. Block check-in dialogs when attendance is disabled

**Files:** `src/components/dialogs/QRScannerDialog.tsx`, `src/components/dialogs/RemoteCheckInDialog.tsx`

- Both already import `useMyOfficeAttendanceSettings`
- Add a guard: if `attendance_enabled === false`, show a message like "Attendance tracking is not enabled for your office" instead of processing the check-in

### 5. Disable check-in method resolution when attendance is off

**File:** `src/hooks/useCheckInMethod.ts`

- Read `attendance_enabled` from the office settings (already imports the hook)
- If `false`, return `null` or a new `'disabled'` value so the nav icon and SelfCheckInCard know not to offer check-in

## What this does NOT change

- The admin toggle in `OfficeAttendanceSettings.tsx` already works and saves correctly -- no changes needed there
- The edge function `send-checkin-reminder` will naturally stop flagging employees from disabled offices because the "Not Checked In" list won't include them
- Historical attendance records are unaffected

## Technical Details

| File | Change |
|------|--------|
| `src/hooks/useMyOfficeAttendanceSettings.ts` | Add `attendance_enabled` to interface and query return |
| `src/components/home/SelfCheckInCard.tsx` | Early-return when `attendance_enabled` is `false` |
| `src/components/attendance/AttendanceNotCheckedInTab.tsx` | Filter out employees from disabled offices |
| `src/components/dialogs/QRScannerDialog.tsx` | Guard against check-in when disabled |
| `src/components/dialogs/RemoteCheckInDialog.tsx` | Guard against check-in when disabled |
| `src/hooks/useCheckInMethod.ts` | Return disabled state when attendance is off |

