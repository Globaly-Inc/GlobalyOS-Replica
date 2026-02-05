
# Advanced Office-Level Attendance Settings

## Overview

This plan transforms the current organization-wide attendance settings into a comprehensive **per-office configuration system**. Each office will have its own attendance policies, check-in methods, exemptions, and automation rules.

## Current State Analysis

| Feature | Current Implementation |
|---------|----------------------|
| Settings scope | Organization-level (all offices share same settings) |
| Attendance settings location | Organization table columns + AttendanceSettingsDialog |
| Check-in exemptions | Employee-level (`checkin_exempt` on employees table) |
| Overtime/undertime adjustments | Organization-level toggle, fixed to "Day In Lieu" |
| Check-in methods | QR codes per office (existing), no work-type-specific rules |
| Auto checkout | Not implemented |
| Check-in method by work type | Not implemented |

## Solution Architecture

### New Database Schema

**New table: `office_attendance_settings`**
```text
- id (uuid, primary key)
- office_id (uuid, foreign key to offices, unique)
- organization_id (uuid, foreign key)
- attendance_enabled (boolean, default true)

-- Session settings
- multi_session_enabled (boolean, default true)
- max_sessions_per_day (integer, default 3)
- early_checkout_reason_required (boolean, default true)

-- Automatic adjustments
- auto_adjustments_enabled (boolean, default false)
- overtime_credit_leave_type_id (uuid, FK to office_leave_types, nullable)
- undertime_debit_leave_type_id (uuid, FK to office_leave_types, nullable)
- max_dil_days (numeric, nullable - cap for Day In Lieu accumulation)
- min_overtime_minutes (integer, default 30 - minimum overtime before credit)
- min_undertime_minutes (integer, default 15 - grace period before deduction)

-- Auto checkout
- auto_checkout_enabled (boolean, default false)
- auto_checkout_after_minutes (integer, default 60 - minutes after schedule end)
- auto_checkout_status (text, default 'present' - status to set on auto checkout)

-- Check-in methods by work type
- office_checkin_methods (text[], default ['qr','location'])
- hybrid_checkin_methods (text[], default ['qr','location','remote'])
- remote_checkin_methods (text[], default ['remote'])

-- Location restrictions
- require_location_for_office (boolean, default true)
- require_location_for_hybrid (boolean, default false)
- location_radius_meters (integer, default 100)

- created_at (timestamptz)
- updated_at (timestamptz)
```

**New table: `office_attendance_exemptions`**
```text
- id (uuid, primary key)
- office_id (uuid, foreign key)
- employee_id (uuid, foreign key, unique per office)
- exempted_at (timestamptz)
- exempted_by (uuid, who added the exemption)
- reason (text, nullable)
```

### UI/UX Design

**Main Navigation Change:**
Move Attendance Settings from the modal dialog into the Office Detail View (alongside Leave Settings), creating a consistent per-office configuration experience.

**Office Attendance Settings Card Structure:**

```text
+----------------------------------------------------------+
| Attendance Settings                          [Toggle On/Off]
| Configure check-in rules and policies for this office
+----------------------------------------------------------+
| [Tabs: Check-in Methods | Sessions | Overtime | Auto Checkout | Exemptions]
|
| === CHECK-IN METHODS TAB ===
| 
| Configure how employees check in based on their work type
|
| +-- Office Workers ----------------------------------+
| | [x] QR Code Scan                                  |
| | [x] Location Verification                         |
| | [ ] Third-party System (Coming Soon)              |
| +---------------------------------------------------+
|
| +-- Hybrid Workers ----------------------------------+
| | [x] QR Code Scan (when in office)                 |
| | [x] Location Verification                         |
| | [x] Remote Check-in (when working from home)      |
| +---------------------------------------------------+
|
| +-- Remote Workers ----------------------------------+
| | [x] Remote Check-in                               |
| +---------------------------------------------------+
|
| Location Settings
| [x] Require location verification for office check-in
| [ ] Require location verification for hybrid check-in
| Geofence radius: [100] meters
|
| === SESSIONS TAB ===
|
| [Switch] Allow Multiple Sessions Per Day
|   Maximum sessions: [3 v]
|
| [Switch] Require Reason for Early Checkout
|
| === OVERTIME TAB ===
|
| [Switch] Enable Automatic Adjustments
|
| When enabled, overtime and undertime hours are automatically
| converted to leave balance changes.
|
| +-- Overtime Credit --------------------------------+
| | Credit leave type: [Day In Lieu v]               |
| | Minimum overtime:  [30] minutes before credit    |
| | Maximum balance:   [x] Cap at [10] days          |
| +--------------------------------------------------+
|
| +-- Undertime Deduction ----------------------------+
| | Deduct from:       [Day In Lieu v] (first)       |
| |                    [Annual Leave v] (fallback)   |
| | Grace period:      [15] minutes before deduction |
| +--------------------------------------------------+
|
| === AUTO CHECKOUT TAB ===
|
| [Switch] Enable Auto Checkout
|
| Automatically check out employees who haven't checked out
| after their scheduled end time.
|
| Auto checkout after: [60] minutes past schedule end
| Set status to:       [Present v]
|
| [Info] Auto checkout runs daily at midnight office time
|
| === EXEMPTIONS TAB ===
|
| Employees exempt from check-in won't appear in "Not Checked In"
| reports and won't receive reminders.
|
| +-- Exempt Employees -------------------------------+
| | [Avatar] John Smith          CEO          [x]    |
| | [Avatar] Jane Doe            Director     [x]    |
| +--------------------------------------------------+
| [+ Add exempt employee...]
|
+----------------------------------------------------------+
| [Save Settings]
+----------------------------------------------------------+
```

### Implementation Plan

**Phase 1: Database Migration**

1. Create `office_attendance_settings` table with all columns
2. Create `office_attendance_exemptions` table
3. Migrate existing organization-level settings to office-level settings for each office
4. Create RLS policies for both tables
5. Create trigger to auto-create default settings when a new office is created

**Phase 2: New Components**

| Component | Purpose |
|-----------|---------|
| `OfficeAttendanceSettings.tsx` | Main attendance settings card for office detail view |
| `AttendanceCheckInMethodsTab.tsx` | Configure check-in methods by work type |
| `AttendanceSessionsTab.tsx` | Multi-session and early checkout settings |
| `AttendanceOvertimeTab.tsx` | Overtime/undertime automatic adjustments |
| `AttendanceAutoCheckoutTab.tsx` | Auto checkout configuration |
| `AttendanceExemptionsTab.tsx` | Manage exempt employees for this office |

**Phase 3: Service Layer Updates**

1. Create `useOfficeAttendanceSettings` hook:
   - Fetch settings for a specific office
   - CRUD operations for settings
   - React Query integration with proper cache invalidation

2. Update `process-attendance-adjustments` edge function:
   - Read from `office_attendance_settings` instead of organization table
   - Use configurable leave types for credits/debits
   - Respect per-office grace periods and caps

3. Create `process-auto-checkout` edge function:
   - Run on a cron schedule (every 15 minutes)
   - Check each office's timezone and auto-checkout settings
   - Auto-checkout employees past their schedule + buffer

**Phase 4: Check-in Flow Updates**

1. Update `QRScannerDialog` and `RemoteCheckInDialog`:
   - Check office attendance settings for allowed methods
   - Validate check-in method against employee's work type
   - Show appropriate error if method not allowed

2. Update attendance validation RPC:
   - Add check for office-level exemptions
   - Validate against office-specific multi-session limits

**Phase 5: UI Integration**

1. Add `OfficeAttendanceSettings` to `OfficeDetailView.tsx`
2. Remove or deprecate the organization-level `AttendanceSettingsDialog`
3. Update Settings page to point users to office-specific settings

### Dialog Size Adjustment

Increase dialog size by 80%:
```text
Current: max-w-2xl (672px)
New: max-w-[1200px] (approximately 80% larger)
```

Since we're moving to a card-based approach in the Office Detail View, the dialog will be deprecated in favor of the inline card with tabs.

### Additional Suggested Features

Based on analysis of modern attendance systems, these complementary features would enhance the system:

| Feature | Description | Priority |
|---------|-------------|----------|
| **Break tracking** | Track break time separately, enforce maximum break duration | Medium |
| **Shift patterns** | Support rotating shifts beyond fixed schedules | Low |
| **Attendance notifications** | Configurable reminders for late check-in, missed checkout | High |
| **IP restriction** | Restrict remote check-in to specific IP ranges | Low |
| **Device trust** | Remember trusted devices for faster check-in | Medium |
| **Attendance reports** | Office-specific attendance reports and analytics | High |
| **Holiday calendar sync** | Auto-mark holidays based on office location | High |
| **Minimum work hours** | Alert when employee checks out before minimum hours | Medium |

### Files to Create

| File | Description |
|------|-------------|
| `supabase/migrations/[timestamp]_create_office_attendance_settings.sql` | Database schema |
| `src/components/offices/OfficeAttendanceSettings.tsx` | Main attendance settings component |
| `src/components/offices/attendance/CheckInMethodsTab.tsx` | Check-in methods by work type |
| `src/components/offices/attendance/SessionsTab.tsx` | Session settings |
| `src/components/offices/attendance/OvertimeTab.tsx` | Overtime/undertime settings |
| `src/components/offices/attendance/AutoCheckoutTab.tsx` | Auto checkout settings |
| `src/components/offices/attendance/ExemptionsTab.tsx` | Employee exemptions |
| `src/hooks/useOfficeAttendanceSettings.ts` | Data fetching hook |
| `supabase/functions/process-auto-checkout/index.ts` | Auto checkout edge function |

### Files to Modify

| File | Change |
|------|--------|
| `src/components/offices/OfficeDetailView.tsx` | Add OfficeAttendanceSettings card |
| `src/components/dialogs/QRScannerDialog.tsx` | Check office settings for allowed methods |
| `src/components/dialogs/RemoteCheckInDialog.tsx` | Check office settings for allowed methods |
| `supabase/functions/process-attendance-adjustments/index.ts` | Read from office_attendance_settings |
| `src/services/useAttendance.ts` | Update to respect office-level settings |

### Migration Strategy

1. Deploy database migration first
2. Create trigger to auto-populate settings for existing offices using current org-level values
3. Deploy UI changes
4. Users can then customize per-office as needed
5. Keep organization-level settings as fallback for offices without custom settings (optional)

### Technical Considerations

- **Backward compatibility**: Existing org-level settings will be migrated to all offices
- **Default settings**: New offices get sensible defaults via database trigger
- **Performance**: Settings are cached per-office with React Query
- **Multi-tenant security**: RLS ensures offices only see their own settings
