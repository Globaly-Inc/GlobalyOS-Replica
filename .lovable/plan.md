

# Comprehensive Plan: Attendance Settings Integration + Remote Location Fix

## Current State Analysis

After thorough investigation, here is the gap between the **office-level attendance settings** (configured per-office in Settings) and what **actually happens** when employees check in/out:

### Problem 1: Remote Location Verification shows geofencing (incorrect)
The `CheckInMethodsTab` treats "Remote Location Verification" the same as "Office Location Verification" -- showing a geofence radius input. Remote location verification should simply **capture the employee's current GPS coordinates** at check-in/check-out, not enforce a geofence.

### Problem 2: Office attendance settings are NOT consulted during check-in
Both DB functions (`validate_qr_and_record_attendance` and `record_remote_attendance`) read settings from the **organizations** table (`multi_session_enabled`, `max_sessions_per_day`, `early_checkout_reason_required`). They completely **ignore** the `office_attendance_settings` table. This means per-office settings for sessions, check-in methods, auto-checkout, etc. have no effect.

### Problem 3: Smart check-in logic ignores office settings
The check-in method decision (`shouldUseRemoteCheckIn`) is based purely on `work_location` from `employee_schedules` and WFH approval status. It does **not** consult the office's configured `office_checkin_methods`, `hybrid_checkin_methods`, or `remote_checkin_methods` arrays to determine which methods are actually enabled.

### Problem 4: RemoteCheckInDialog always requires GPS location
Currently the Remote Check-In dialog **always** requests GPS and won't proceed without it. It should only request location if the office settings include `remote_location` in the relevant check-in methods array. If only `remote` (without location) is enabled, it should allow check-in without GPS.

### Problem 5: QR Scanner dialog reads org-level settings, not office settings
The QR dialog fetches `max_sessions_per_day` and `early_checkout_reason_required` from the `organizations` table instead of the employee's office `office_attendance_settings`.

---

## Proposed Changes

### 1. Fix CheckInMethodsTab -- Remove geofencing for Remote Location

**File:** `src/components/offices/attendance/CheckInMethodsTab.tsx`

- Change `LOCATION_METHOD_IDS` from `['location', 'remote_location']` to just `['location']`
- Only "Office Location Verification" shows the geofence radius input
- "Remote Location Verification" becomes a simple toggle -- when enabled, it just captures the employee's GPS coordinates for record-keeping (no radius enforcement)
- Add a small helper text under "Remote Location Verification" saying: "Captures team member's current location during check-in/out"
- Add helper text under "Office Location Verification" saying: "Verifies team member is within office geofence radius"

### 2. Create a hook to fetch office attendance settings for the current employee

**New file:** `src/hooks/useMyOfficeAttendanceSettings.ts`

This hook will:
- Get the current employee's `office_id`
- Fetch the `office_attendance_settings` for that office
- Return the settings (check-in methods, session limits, early checkout config, etc.)
- Fall back to sensible defaults if no office or no settings exist

### 3. Update RemoteCheckInDialog to use office settings

**File:** `src/components/dialogs/RemoteCheckInDialog.tsx`

Changes:
- Import and use `useMyOfficeAttendanceSettings`
- Read `remote_checkin_methods` or `hybrid_checkin_methods` (based on employee's work type) from office settings
- If the relevant methods array includes `remote_location`, request GPS and capture coordinates
- If it only includes `remote` (no location), skip GPS entirely -- show a simpler dialog with just a "Check In" / "Check Out" button
- Read `multi_session_enabled`, `max_sessions_per_day`, `early_checkout_reason_required` from office settings instead of organization settings
- Show location name when GPS is captured (current behavior) but do NOT enforce geofencing

**Updated Dialog UX:**

When `remote_location` is enabled:
```
+----------------------------------+
|  Remote Check In       Session 1/3|
+----------------------------------+
|                                    |
|  [pin icon] Location Detected      |
|  Mumbai, Maharashtra               |
|                                    |
|  [====== Check In ======]          |
|                                    |
|  [     Cancel     ]                |
+----------------------------------+
```

When only `remote` is enabled (no location):
```
+----------------------------------+
|  Remote Check In       Session 1/3|
+----------------------------------+
|                                    |
|  [home icon]                       |
|  You're checking in remotely       |
|                                    |
|  [====== Check In ======]          |
|                                    |
|  [     Cancel     ]                |
+----------------------------------+
```

### 4. Update QRScannerDialog to use office settings

**File:** `src/components/dialogs/QRScannerDialog.tsx`

Changes:
- Import and use `useMyOfficeAttendanceSettings`
- Read `multi_session_enabled`, `max_sessions_per_day`, `early_checkout_reason_required` from office settings
- Read `office_checkin_methods` to verify QR is enabled for office workers
- If `location` is in office methods, enforce geofencing (current behavior)
- If `location` is NOT in office methods, skip GPS requirement entirely

### 5. Update smart check-in decision logic

**Files:** `src/hooks/useLayoutState.ts`, `src/components/home/SelfCheckInCard.tsx`, `src/components/MobileBottomNav.tsx`

Currently the logic is:
```
shouldUseRemoteCheckIn = workLocation is hybrid/remote OR (office + WFH approved)
```

Updated logic should also consider office settings:
- Get the employee's office attendance settings
- For **office** workers: check `office_checkin_methods` -- if it only has `location` (no `qr`), don't open QR scanner
- For **hybrid** workers: check `hybrid_checkin_methods` -- could be QR, location, remote, or remote_location
- For **remote** workers: check `remote_checkin_methods` -- should be `remote` or `remote_location`
- For office workers with approved WFH: use remote methods

This ensures the check-in button opens the correct dialog based on what the admin has actually configured.

### 6. Update DB functions to use office-level settings

**Database migration** -- Update both functions:

**`validate_qr_and_record_attendance`:**
- Look up the employee's `office_id` from the `employees` table
- Read `multi_session_enabled`, `max_sessions_per_day` from `office_attendance_settings` for that office
- Fall back to organization-level settings if no office settings exist
- Check if `qr` is in the relevant check-in methods array (based on employee's work location)

**`record_remote_attendance`:**
- Look up the employee's `office_id`
- Read session settings from `office_attendance_settings`
- Read `early_checkout_reason_required` from office settings
- Check if `remote` or `remote_location` is enabled in the relevant methods array
- If `remote_location` is enabled, store GPS coordinates (already works)
- If only `remote` is enabled, allow check-in even without coordinates

### 7. Update `record_remote_attendance` to make location optional

**Database migration:**
- Change the function signature so `_user_latitude` and `_user_longitude` can be NULL
- Only store coordinates when provided
- The frontend decides whether to collect GPS based on office settings

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/offices/attendance/CheckInMethodsTab.tsx` | Remove geofence for remote_location, add helper texts |
| `src/hooks/useMyOfficeAttendanceSettings.ts` | **New file** -- hook to get current employee's office attendance settings |
| `src/components/dialogs/RemoteCheckInDialog.tsx` | Use office settings, make GPS conditional |
| `src/components/dialogs/QRScannerDialog.tsx` | Use office settings for session limits |
| `src/hooks/useLayoutState.ts` | Use office settings for smart check-in decision |
| `src/components/home/SelfCheckInCard.tsx` | Use office settings for check-in method |
| `src/components/MobileBottomNav.tsx` | Use office settings for check-in method |
| Database migration | Update both attendance RPC functions to use office-level settings |

## Risk Assessment

- **Backward compatibility**: If an office has no `office_attendance_settings` row, both DB functions and frontend will fall back to organization-level defaults
- **Performance**: The new hook adds one extra query per employee session, but it's a single-row lookup by office_id (indexed, fast)
- **Security**: All office settings are read server-side in SECURITY DEFINER functions; no client-controlled org bypass

