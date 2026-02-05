

# Reorganize Office Detail View into 3 Tabs

## Summary

Restructure the Office Detail View page from a vertically stacked card layout into a clean 3-tab interface. This will improve navigation and reduce scrolling while grouping related settings logically.

## Current Layout

```text
+----------------------------------------------------------+
| Office Header Card (Name, Address, City, Country)        |
+----------------------------------------------------------+
| Today's Overview Stats                                   |
+----------------------------------------------------------+
| Default Work Schedule Card                               |
+----------------------------------------------------------+
| Leave Settings Card                                      |
+----------------------------------------------------------+
| Attendance Settings Card                                 |
+----------------------------------------------------------+
| Team Members List                                        |
+----------------------------------------------------------+
```

## Proposed Layout

```text
+----------------------------------------------------------+
| Office Header Card (Name, Address, City, Country)        |
+----------------------------------------------------------+
| [Overview & Team]  [Attendance Settings]  [Leave Settings]
+----------------------------------------------------------+
|                                                          |
|  === OVERVIEW & TEAM TAB ===                             |
|                                                          |
|  +-- Today's Overview Stats -------------------------+   |
|  | Present: 0  |  On Leave: 0  |  Remote: 0  |  ...  |   |
|  +---------------------------------------------------+   |
|                                                          |
|  +-- Team Members -----------------------------------+   |
|  | [Avatar] John Smith      CEO         [Schedule]   |   |
|  | [Avatar] Jane Doe        Director    [Schedule]   |   |
|  | ...                                               |   |
|  +---------------------------------------------------+   |
|                                                          |
+----------------------------------------------------------+
|                                                          |
|  === ATTENDANCE SETTINGS TAB ===                         |
|                                                          |
|  +-- Default Work Schedule --------------------------+   |
|  | Work Start: 09:00  |  Work End: 17:00            |   |
|  | Break: 12:00-13:00 |  Timezone: UTC              |   |
|  | Late Threshold: 15 min  |  Leave Year: Jan 1     |   |
|  +---------------------------------------------------+   |
|                                                          |
|  +-- Attendance Rules -------------------------------+   |
|  | [Tabs: Check-in Methods | Sessions | Overtime     |   |
|  |        | Auto Checkout | Exemptions]              |   |
|  |                                                   |   |
|  | Configure how employees check in based on their   |   |
|  | work type...                                      |   |
|  +---------------------------------------------------+   |
|                                                          |
+----------------------------------------------------------+
|                                                          |
|  === LEAVE SETTINGS TAB ===                              |
|                                                          |
|  +-- Leave Year Configuration -----------------------+   |
|  | Leave Year Start: Jan 1                          |   |
|  +---------------------------------------------------+   |
|                                                          |
|  +-- Leave Types ------------------------------------+   |
|  | [+] Annual Leave       paid    12 days           |   |
|  | [+] Sick Leave         paid    7 days            |   |
|  | [+] Unpaid Leave       unpaid  0 days            |   |
|  +---------------------------------------------------+   |
|                                                          |
+----------------------------------------------------------+
```

## Tab Structure

| Tab | Components Included | Purpose |
|-----|---------------------|---------|
| **Overview & Team** | `OfficeOverviewStats`, `OfficeTeamList` | Daily status, team members with schedules |
| **Attendance Settings** | `OfficeScheduleCard`, `OfficeAttendanceSettings` (without outer card wrapper) | Work schedules, check-in methods, overtime, exemptions |
| **Leave Settings** | `OfficeLeaveSettings` (without outer card wrapper) | Leave year configuration, leave types |

## Implementation Details

### Changes to OfficeDetailView.tsx

1. **Keep the header card** at the top (outside of tabs)
2. **Add a Tabs component** below the header
3. **Move components into their respective tabs**
4. **Adjust component styling** to remove redundant card wrappers where needed

### Component Modifications

**OfficeAttendanceSettings.tsx**
- Add an optional `embedded` prop to hide the outer Card wrapper when used inside a tab
- When `embedded={true}`, render only the inner content without Card

**OfficeLeaveSettings.tsx**
- Add an optional `embedded` prop to hide the outer Card wrapper when used inside a tab
- When `embedded={true}`, render only the inner content without Card

**OfficeScheduleCard.tsx**
- No changes needed - already a standalone card

### Visual Design

- Tab bar will use the existing Tabs component with consistent styling
- Icons in tab triggers for visual clarity:
  - Overview & Team: `Users` icon
  - Attendance Settings: `Clock` icon
  - Leave Settings: `CalendarDays` icon
- First tab (Overview & Team) is the default active tab
- Content area has consistent padding and spacing

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/offices/OfficeDetailView.tsx` | Add Tabs wrapper, reorganize components into tab content areas |
| `src/components/offices/OfficeAttendanceSettings.tsx` | Add `embedded` prop to optionally hide Card wrapper |
| `src/components/settings/OfficeLeaveSettings.tsx` | Add `embedded` prop to optionally hide Card wrapper |

### Tab Content Layout

**Overview & Team Tab:**
```text
<TabsContent value="overview">
  <div className="space-y-6">
    <OfficeOverviewStats officeId={office.id} />
    <OfficeTeamList officeId={office.id} officeName={office.name} />
  </div>
</TabsContent>
```

**Attendance Settings Tab:**
```text
<TabsContent value="attendance">
  <div className="space-y-6">
    <OfficeScheduleCard office={office} onOfficeUpdated={onOfficeUpdated} />
    <OfficeAttendanceSettings 
      officeId={office.id} 
      organizationId={currentOrg.id}
      embedded={true}  // Removes outer Card wrapper
    />
  </div>
</TabsContent>
```

**Leave Settings Tab:**
```text
<TabsContent value="leave">
  <OfficeLeaveSettings
    office={office}
    organizationId={currentOrg.id}
    onOfficeUpdated={onOfficeUpdated}
    embedded={true}  // Removes outer Card wrapper
  />
</TabsContent>
```

## Benefits

1. **Reduced Scrolling**: Users don't need to scroll through all sections
2. **Logical Grouping**: Related settings are grouped together
3. **Cleaner Interface**: Less visual clutter on initial load
4. **URL Persistence**: Can add URL tab state for deep linking (optional future enhancement)
5. **Consistent UX**: Matches the tabbed pattern used elsewhere in the app (e.g., Attendance Settings inner tabs)

