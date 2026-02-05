

# Office Header Card UI Refinements

## Summary

Make three visual adjustments to the office header card: combine address and team members on the same row, show edit icons only on hover, and remove the redundant employee count text.

## Changes

### 1. Combine Address and Team Stack on Same Row

**Current layout:**
```text
[MapPin] 75 Dalmatia Avenue, Sydney, Australia [flag] [Edit]
[UsersRound] [Avatar Stack]
2 employees in this office
```

**New layout:**
```text
[MapPin] 75 Dalmatia Avenue, Sydney, Australia [flag] [Edit]  |  [UsersRound] [Avatar Stack]
```

- Use flexbox with `justify-between` to position address on the left and team stack on the right
- Add a subtle visual separator (via spacing or border) between the two sections

### 2. Show Edit Icons Only on Hover

**Office Name (EditableField):**
- The `EditableField` component already has hover-to-show functionality built-in (lines 87-94)
- Currently showing the pencil icon on hover - no changes needed there

**Address Edit Button:**
- Wrap the address section in a group class
- Apply `opacity-0 group-hover:opacity-100` to the edit button
- Add smooth transition for the reveal effect

### 3. Remove Employee Count Text

- Delete the `<div className="pt-2 text-sm text-muted-foreground">` block (lines 213-215)
- The team member avatar stack already provides visual indication of team size

## Implementation Details

### File to Modify

`src/components/offices/OfficeDetailView.tsx`

### Updated CardContent Structure

```tsx
<CardContent>
  {/* Single row: Address (left) + Team Stack (right) */}
  <div className="flex items-center justify-between gap-4 group">
    {/* Address section */}
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <p className="text-sm text-foreground truncate">
        {formattedAddress || 'No address specified'}
      </p>
      {countryFlag && (
        <span className="text-lg flex-shrink-0">{countryFlag}</span>
      )}
      {/* Edit button - hidden until hover */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <OfficeAddressEditDialog ... />
      </div>
    </div>
    
    {/* Team stack section */}
    {teamMembers.length > 0 && (
      <div className="flex items-center gap-2 flex-shrink-0">
        <UsersRound className="h-4 w-4 text-muted-foreground" />
        <ProfileStack users={teamMembers} ... />
      </div>
    )}
  </div>
  
  {/* REMOVED: Employee count text */}
</CardContent>
```

### Office Name Edit Icon on Hover

The `EditableField` component already handles hover behavior correctly. The pencil icon appears on hover by default (line 87-94 in EditableField.tsx).

## Visual Result

**Before:**
```text
+-----------------------------------------------------+
| [Building] Sydney Office                    [Trash] |
+-----------------------------------------------------+
| [MapPin] 75 Dalmatia Avenue, Sydney [flag] [Edit]   |
| [Users] [Avatar] [Avatar] [Avatar] +3               |
| 22 employees in this office                         |
+-----------------------------------------------------+
```

**After:**
```text
+-----------------------------------------------------+
| [Building] Sydney Office                    [Trash] |
+-----------------------------------------------------+
| [MapPin] 75 Dalmatia Ave... [flag]   [Users] [Avatars] |
|                            ^-- Edit appears on hover   |
+-----------------------------------------------------+
```

