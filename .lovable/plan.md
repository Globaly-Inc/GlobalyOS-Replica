

# Simplify Check-in Methods UI

## Summary

Consolidate location settings into the work type cards, rename location options for clarity, add Remote Location Verification for hybrid/remote workers, and remove the Third-party System option.

## Current Issues

1. **Redundant Location Settings section** - The separate "Location Settings" panel duplicates what should be configured per work type
2. **Confusing naming** - "Location Verification" is ambiguous (office vs remote location)
3. **Missing remote location option** - No way to verify remote workers' locations
4. **Unused feature** - Third-party System is disabled and clutters the UI

## Changes

### 1. Remove Third-party System from All Cards

Remove `third_party` from `AVAILABLE_METHODS` array entirely.

### 2. Rename and Split Location Methods

**Before:**
- `location` = "Location Verification"

**After:**
- `location` = "Office Location Verification" (verify employee is at office)
- `remote_location` = "Remote Location Verification" (verify employee's remote location)

### 3. Update Available Methods per Work Type

| Work Type | Available Methods |
|-----------|------------------|
| Office Workers | QR Code Scan, Office Location Verification |
| Hybrid Workers | QR Code Scan, Office Location Verification, Remote Check-in, Remote Location Verification |
| Remote Workers | Remote Check-in, Remote Location Verification |

### 4. Add Geofence Radius Inline with Location Options

When "Office Location Verification" is checked, show a small inline input for geofence radius directly below it (instead of in a separate section).

```text
[x] Office Location Verification
    Geofence: [100] meters
```

### 5. Remove Separate Location Settings Section

Delete the entire `border-t pt-6` section (lines 129-177) since:
- Geofence radius moves inline with office location option
- The require_location toggles become redundant (checking the method = requiring it)

## Updated AVAILABLE_METHODS

```typescript
const OFFICE_METHODS = [
  { id: 'qr', label: 'QR Code Scan' },
  { id: 'location', label: 'Office Location Verification' },
];

const HYBRID_METHODS = [
  { id: 'qr', label: 'QR Code Scan' },
  { id: 'location', label: 'Office Location Verification' },
  { id: 'remote', label: 'Remote Check-in' },
  { id: 'remote_location', label: 'Remote Location Verification' },
];

const REMOTE_METHODS = [
  { id: 'remote', label: 'Remote Check-in' },
  { id: 'remote_location', label: 'Remote Location Verification' },
];
```

## Visual Result

**Before:**
```text
+------------------+------------------+------------------+
| Office Workers   | Hybrid Workers   | Remote Workers   |
| [ ] QR Code      | [ ] QR Code      | [x] Remote       |
| [ ] Location     | [ ] Location     | [ ] Third-party  |
| [ ] Third-party  | [ ] Remote       |                  |
|                  | [ ] Third-party  |                  |
+------------------+------------------+------------------+

--- Location Settings ---
[ ] Require location for office
[ ] Require location for hybrid
Geofence: [100] meters
```

**After:**
```text
+------------------+------------------+------------------+
| Office Workers   | Hybrid Workers   | Remote Workers   |
| [ ] QR Code      | [ ] QR Code      | [x] Remote       |
| [ ] Office Loc   | [ ] Office Loc   | [ ] Remote Loc   |
|   Radius: [100]m | [ ] Remote       |   Radius: [100]m |
|                  | [ ] Remote Loc   |                  |
|                  |   Radius: [100]m |                  |
+------------------+------------------+------------------+
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/offices/attendance/CheckInMethodsTab.tsx` | Update methods, add inline geofence, remove Location Settings section |

## Props Cleanup

The following props can be simplified:
- `requireLocationForOffice` / `requireLocationForHybrid` - No longer needed (method selection = requirement)
- `locationRadiusMeters` - Still needed for inline geofence input

