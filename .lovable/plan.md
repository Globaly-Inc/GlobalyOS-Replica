
# Space Creation Dialog UI Improvements

## Overview

This plan implements three improvements to the Create Space dialog:
1. Display Collaboration and Announcement options in a single row (side-by-side)
2. Show the count of members that will be automatically added below the access settings
3. Clarify that company-wide and group access automatically adds all matching members via auto-sync

---

## Changes Required

### Part 1: Display Space Type Options in Single Row

**File:** `src/components/chat/CreateSpaceDialog.tsx`

Change the Space Type RadioGroup from vertical stacking (`space-y-2`) to a horizontal grid layout:

```typescript
// Current (lines 208-252):
<RadioGroup
  value={spaceType}
  onValueChange={(v) => setSpaceType(v as 'collaboration' | 'announcements')}
  className="space-y-2"  // Vertical stack
>
  {/* Two separate divs stacked vertically */}
</RadioGroup>

// Updated:
<RadioGroup
  value={spaceType}
  onValueChange={(v) => setSpaceType(v as 'collaboration' | 'announcements')}
  className="grid grid-cols-2 gap-3"  // Side-by-side layout
>
  {/* Two divs in a row */}
</RadioGroup>
```

Additionally, simplify each option card to be more compact for the row layout by reducing padding and adjusting icon/text sizing.

---

### Part 2: Show Member Count Below Access Settings

**File:** `src/components/chat/AccessScopeSelector.tsx`

Add a new prop to expose the calculated member count, and display it below the access options:

1. Calculate total member count based on selected scope:
   - **Company-wide**: Total active employees in the organization
   - **Group Access**: Count of employees matching the selected criteria (already calculated as `groupMemberIds`)
   - **Manual invites**: Count of selected members

2. Add a summary section below the RadioGroup showing:
   ```
   👥 X members will be added automatically
   ```
   Or for manual invites:
   ```
   👥 X members selected
   ```

The component already has `groupMemberIds` for custom scope and `employeesWithDetails` for all employees. We'll add:
- A computed `memberCount` variable
- A summary display below the access options

---

### Part 3: Clarify Auto-Sync Behavior

**File:** `src/components/chat/AccessScopeSelector.tsx`

Update the description text for Company-wide and Group Access options to clarify that all matching members are automatically added and synced:

```typescript
// Current:
{
  value: 'company',
  label: 'Company-wide',
  description: `Anyone in ${currentOrg?.name || 'organization'} can find, view, and join`,
}

// Updated:
{
  value: 'company',
  label: 'Company-wide',
  description: `All ${employeesWithDetails.length} members will be added automatically`,
}
```

For Group Access, dynamically show the count of matching members:
```typescript
{
  value: 'custom',
  label: 'Group Access',
  description: groupMemberIds.length > 0 
    ? `${groupMemberIds.length} members will be added automatically`
    : 'Only employees matching criteria can access',
}
```

---

## Summary of Changes

| File | Type | Description |
|------|------|-------------|
| `src/components/chat/CreateSpaceDialog.tsx` | Modify | Change Space Type to horizontal grid layout |
| `src/components/chat/AccessScopeSelector.tsx` | Modify | Add member count display, update descriptions |

---

## Visual Preview

**Before:**
```
Space type
┌─────────────────────────────────────┐
│ ○ Collaboration                     │
│   Everyone can post messages        │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ ○ Announcement                      │
│   Only admins can post              │
└─────────────────────────────────────┘
```

**After:**
```
Space type
┌─────────────────────┐ ┌─────────────────────┐
│ ○ Collaboration     │ │ ○ Announcement      │
│   Everyone can post │ │   Only admins post  │
└─────────────────────┘ └─────────────────────┘

Access settings
...

👥 32 members will be added automatically
```
