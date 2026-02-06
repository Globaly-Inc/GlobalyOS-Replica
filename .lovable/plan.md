
# Attendance Settings Integration -- Comprehensive Audit

## 1. Plan vs Reality Check

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 1 | Remove geofence radius for `remote_location` in `CheckInMethodsTab` | Implemented correctly | `LOCATION_METHOD_IDS` is now `['location']` only; geofence input only shows for office location |
| 2 | Add helper text descriptions per check-in method | Implemented correctly | `METHOD_DESCRIPTIONS` object with 4 entries renders under each method checkbox |
| 3 | Create `useMyOfficeAttendanceSettings` hook | Implemented correctly | 3-tier fallback: office settings -> org settings -> hardcoded defaults. 5-min staleTime cache |
| 4 | `RemoteCheckInDialog` uses office settings | Implemented correctly | Reads `remote_checkin_methods` / `hybrid_checkin_methods` to decide GPS requirement. Shows "not_required" UI when only `remote` is enabled |
| 5 | `QRScannerDialog` uses office settings | Implemented correctly | `maxSessions` and `earlyCheckoutReasonRequired` now derived from `useMyOfficeAttendanceSettings` instead of org-level query |
| 6 | Smart check-in logic uses office settings | Implemented correctly | `useLayoutState`, `SelfCheckInCard`, `MobileBottomNav` all use `officeSettings?.hybrid_checkin_methods` to decide dialog type |
| 7 | DB function `validate_qr_and_record_attendance` reads office settings | Implemented correctly | LEFT JOINs `office_attendance_settings` on employee's `office_id`, COALESCEs to org-level |
| 8 | DB function `record_remote_attendance` reads office settings | Implemented correctly | Same LEFT JOIN + COALESCE pattern |
| 9 | `record_remote_attendance` makes location optional | Implemented correctly | All params default to NULL; frontend decides whether to collect GPS |
| 10 | `useRemoteAttendance` mutation accepts optional lat/lng | Implemented correctly | Type changed to `number | null | undefined` |

### Undocumented / Partial Issues Found

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| A | **Triplicated `shouldUseRemoteCheckIn` logic** | Medium | The exact same IIFE (15 lines) is copy-pasted in `useLayoutState.ts` (L38-54), `SelfCheckInCard.tsx` (L54-67), and `MobileBottomNav.tsx` (L61-74). Any future change must be made in 3 places -- a maintenance risk. |
| B | **Duplicated reverse-geocoding code** | Low | `RemoteCheckInDialog` has the Nominatim reverse-geocode call duplicated at lines 90-102 AND lines 249-261 (in `handleRetryLocation`). Should be extracted to a helper. |
| C | **QRScannerDialog always requests GPS** | Medium | The QR dialog always calls `getLocation()` (line 60-80), even if the office settings don't include `location` in `office_checkin_methods`. The declared variable `v_office_checkin_methods` in the SQL is fetched but never used to skip location validation -- the DB still enforces geofencing if the QR code has lat/lng/radius configured. The frontend should skip GPS when the office doesn't require it. |
| D | **`requiresLocation` is computed before `officeSettings` and `workLocation` are loaded** | Medium | In `RemoteCheckInDialog`, `requiresLocation` defaults to `true` when settings aren't loaded yet (line 57). This causes a GPS prompt even when it's not needed. The dialog should wait for settings to load before deciding. Currently mitigated by 5-min cache, but on first load it will flash the GPS prompt. |
| E | **Hybrid check-in defaults to remote always** | Low | The smart check-in logic for hybrid workers (line 49-50 in useLayoutState): `return hasRemote || !hasOffice` -- this means if *both* remote and office methods exist, it still returns `true` (remote). Hybrid workers with both QR and remote enabled always get the remote dialog, never the QR scanner. There's no way for hybrid workers to choose. |
| F | **`today` date mismatch between frontend and backend** | Low | Frontend uses `new Date().toISOString().split("T")[0]` (UTC date) in `RemoteCheckInDialog` line 149 and `QRScannerDialog` line 111, but the DB functions calculate "today" using the org timezone. On timezone boundaries (e.g., late night IST vs UTC), session counts may disagree. |
| G | **Check-out location not captured** | Low | When checking out remotely with `remote_location` enabled, the dialog sends the check-in location but the DB function only stores `check_in_latitude/longitude`. Check-out coordinates are never stored even though the plan says "captures employee's GPS at check-in/out". |

---

## 2. User Flow Validation

### Check-In Flow (Remote Worker)
- Entry: Home card "Check In Now" button, top bar clock icon, mobile bottom nav "Check In" button -- **all work correctly**
- Dialog shows session counter (e.g., "Session 1/3") -- **correct**
- GPS prompt shown only if `remote_location` enabled -- **correct** (after settings load)
- "You're checking in remotely" shown when no GPS required -- **correct**
- Success/error states with icons and "Done" button -- **correct**

### Check-In Flow (Office Worker with QR)
- QR scanner opens, requests GPS, scans QR, validates server-side -- **correct**
- Location denied: shows retry + cancel -- **correct**
- Location unavailable/timeout: proceeds without location, shows amber warning -- **correct**
- Session count displayed -- **correct**

### Check-Out Flow (Early Checkout)
- Early checkout warning with optional/required reason -- **correct**
- Reason validation respects office settings -- **correct**

### Settings UI
- Three-column card grid (Office / Hybrid / Remote workers) -- **correct**
- Geofence radius only for "Office Location Verification" -- **correct**
- Method descriptions shown under each option -- **correct**

### UX Friction Points
1. **Hybrid workers cannot choose check-in method.** If both QR and remote are enabled, the system always picks remote. There should be a chooser dialog or toggle.
2. **No feedback when settings are still loading.** The dialog may flash a GPS prompt before settings load. Not harmful but jarring.
3. **EditAttendanceDialog does not reference office settings.** Manual attendance edits by HR/admin bypass all office-level session limits. This is acceptable but undocumented.

---

## 3. Code Quality

### Good
- Clean separation: `useMyOfficeAttendanceSettings` as a single hook for all consumers
- DB functions use `SECURITY DEFINER` with `SET search_path TO 'public'` -- correct security pattern
- Fallback chain (office -> org -> defaults) is consistent between frontend and backend
- Type definitions are clean and exported

### Issues
| Issue | File(s) | Recommendation |
|-------|---------|----------------|
| Triplicated IIFE for `shouldUseRemoteCheckIn` | 3 files | Extract to a shared hook `useCheckInMethod()` that returns `'remote' | 'qr'` |
| Duplicated Nominatim calls | `RemoteCheckInDialog.tsx` | Extract `reverseGeocode(lat, lng): Promise<string>` utility |
| 14 useState calls in `RemoteCheckInDialog` | `RemoteCheckInDialog.tsx` | Consider `useReducer` for dialog state -- not urgent but would improve readability |
| `useMyOfficeAttendanceSettings` makes 2-3 sequential queries | Hook | Could be reduced to 1 query with a DB view or RPC, but the 5-min cache makes this acceptable |

---

## 4. Component and Platform Reuse

| Pattern | Current | Recommendation |
|---------|---------|----------------|
| `shouldUseRemoteCheckIn` logic | Duplicated in 3 files | Create `useCheckInMethod` hook, import in all 3 |
| Nominatim reverse geocoding | Inline in 2+ places | Extract to `src/utils/reverseGeocode.ts` |
| Location request + error handling | Shared via `getLocation()` utility | Already well-reused -- good |
| `useMyOfficeAttendanceSettings` | Correctly reused in 4 components | Good |
| `useOfficeAttendanceSettings` (admin) vs `useMyOfficeAttendanceSettings` (employee) | Both exist, different purposes | Correct -- admin hook is for settings page, employee hook is for check-in. No duplication. |

---

## 5. Performance

### Frontend
- **`useMyOfficeAttendanceSettings` with 5-min staleTime** -- good, avoids unnecessary refetches
- **No unnecessary renders detected** -- the hook is called at the top level of each consumer, no computed-in-render issues
- **`useTodayAttendance` polls every 30s** -- acceptable for attendance use case
- **RemoteCheckInDialog launches GPS request on open** -- appropriate, no wasted calls

### Backend
- **DB functions do 1 JOIN query for settings** -- efficient, single round-trip
- **No N+1 queries** in the attendance flow
- **`attendance_records` queries filter by `employee_id` + `date`** -- should have a composite index. Worth verifying.

### Concern
- The `useMyOfficeAttendanceSettings` hook makes up to 3 sequential queries (employee -> settings -> org fallback). Under normal operation (office settings exist), it's 2 queries. With the 5-min cache this is fine, but a single RPC could reduce it to 1 DB round-trip.

---

## 6. Security

| Check | Status |
|-------|--------|
| DB functions use `auth.uid()` -- no client-supplied user ID | Pass |
| `SECURITY DEFINER` with explicit `search_path` | Pass |
| Org isolation: employee lookup uses `auth.uid()` internally | Pass |
| QR code org verification: `v_qr_org_id != v_organization_id` check | Pass |
| No sensitive data in API responses | Pass -- only success/error/time returned |
| RLS on `office_attendance_settings` | Not audited from code -- verify policies exist |
| `EditAttendanceDialog` does direct table insert/update | **Risk** -- relies on RLS for authorization. No explicit role check in frontend code. Acceptable if RLS policies are correct. |
| `useManualAttendance` checks `currentOrg?.id` but not user role | **Low risk** -- RLS should enforce, but a frontend role guard would be defense-in-depth |

---

## 7. AI Usage

**No AI is used in the attendance system.** No token tracking needed. This is appropriate -- attendance is a deterministic workflow with no AI benefit.

---

## 8. Observability

| Check | Status |
|-------|--------|
| Frontend errors logged to console | Yes -- `console.error` in catch blocks |
| Backend errors -- DB functions return error messages in JSON | Yes -- structured error responses |
| Activity logging for check-in/check-out | Yes -- `logEmployeeActivity` called on success in both mutations |
| Realtime subscription for attendance updates | Yes -- `useAttendanceRealtime` and layout-level channel |
| Super-admin visibility | Errors go to `user_error_logs` via global error boundary. Attendance-specific errors are not separately surfaced to super-admin. |
| Request tracing (X-Request-ID) | Not applicable -- DB RPCs, not edge functions |

**Gap:** If a DB function fails silently (e.g., office settings JOIN returns no rows unexpectedly), there's no server-side logging. The COALESCE fallback masks potential configuration issues. Consider adding a `RAISE NOTICE` or logging to a table when fallback is triggered.

---

## 9. Test Coverage

### Existing Tests
- `src/test/flows/attendance.test.ts` -- tests QR check-in, remote check-in, check-out, multiple sessions, absent marking, late arrivals
- All tests mock Supabase -- they validate mock behavior, not real integration

### Missing Test Coverage
| Gap | Priority | Why |
|-----|----------|-----|
| Office-level settings fallback logic | High | The 3-tier fallback (office -> org -> defaults) in `useMyOfficeAttendanceSettings` has no tests |
| `shouldUseRemoteCheckIn` decision logic | High | This is triplicated and affects which dialog opens -- should have unit tests |
| `requiresLocation` conditional in `RemoteCheckInDialog` | Medium | GPS/no-GPS path is a key user behavior difference |
| DB function with office settings JOIN | Medium | The COALESCE logic should be tested with NULL office settings |

### Manual QA Checklist
1. Configure office with only `remote` (no `remote_location`) in remote methods. Check in remotely -- should NOT prompt for GPS
2. Configure office with `remote_location`. Check in remotely -- should prompt GPS, show location name
3. Configure office with `qr` + `location`. Office worker scans QR -- should enforce geofence
4. Configure office with only `qr` (no `location`). Office worker scans QR -- should NOT require GPS
5. Set `multi_session_enabled: false`. Check in, check out, try to check in again -- should be blocked
6. Set `max_sessions_per_day: 2`. Complete 2 sessions, try a 3rd -- should be blocked
7. Set `early_checkout_reason_required: true`. Check out early -- should require reason
8. Remove office settings row entirely. Check in -- should fall back to org-level settings
9. Hybrid worker with both QR and remote methods enabled -- verify which dialog opens
10. Test from mobile bottom nav, home card, and top bar -- all should open the same dialog

---

## 10. Prioritized Improvements

| # | Change | Problem | User Impact | Risk | Effort | Priority |
|---|--------|---------|-------------|------|--------|----------|
| 1 | Extract `shouldUseRemoteCheckIn` to shared hook | Triplicated 15-line IIFE in 3 files | Zero user-facing change; prevents maintenance bugs | Very Low | 30 min | **High** -- maintenance debt |
| 2 | Fix QR dialog to skip GPS when `location` not in office methods | QR dialog always requests GPS even when office doesn't require geofencing | Office workers get unnecessary GPS prompt; slower check-in | Low | 1 hour | **High** -- UX friction |
| 3 | Fix `requiresLocation` flash on first load | GPS prompt shown briefly before settings load | Confusing flicker for remote workers without location requirement | Very Low | 30 min | **Medium** |
| 4 | Add hybrid worker method chooser | Hybrid workers always get remote dialog, never QR | Hybrid workers can't use QR even when it's enabled for them | Low | 2 hours | **Medium** -- depends on admin intent |
| 5 | Store check-out coordinates | Check-out location never captured even with `remote_location` | Admins can't verify where employee was at check-out | Very Low | 1 hour | **Low** -- nice to have |
| 6 | Extract reverse-geocoding utility | Duplicated Nominatim calls | Zero user-facing change | Very Low | 15 min | **Low** |
| 7 | Fix frontend/backend date mismatch | UTC vs org-timezone date on timezone boundaries | Session counts may disagree near midnight | Very Low | 30 min | **Low** -- edge case |
| 8 | Add unit tests for settings fallback + check-in decision | No test coverage for core decision logic | No user impact until a regression ships | Very Low | 2 hours | **Medium** -- safety net |
