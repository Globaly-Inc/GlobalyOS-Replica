

# Consolidate Address Display with Country Flag

## Summary

Replace the 3-column address layout (Address, City, Country) with a single-line display showing the full formatted address with a country flag emoji.

## Current Layout

```text
+----------------------------------------------------------+
| Address              | City               | Country        |
| 75 Dalmatia Avenue   | Sydney             | Australia      |
+----------------------------------------------------------+
```

## Proposed Layout

```text
+----------------------------------------------------------+
| Location                                                  |
| [MapPin] 75 Dalmatia Avenue, Sydney, Australia  [flag]   |
+----------------------------------------------------------+
```

## Implementation Details

### Changes to OfficeDetailView.tsx

1. **Remove the 3-column grid** for Address, City, and Country
2. **Add a single address display line** that combines all parts
3. **Import `getCountryFlag`** from `@/lib/countryFlags`
4. **Format the address** as: `{address}, {city}, {country} {flag}`
5. **Make each part editable** via a popover or inline editing approach

### Approach Options

**Option A: Read-only display with Edit button**
- Display combined address as read-only text with flag
- "Edit" button opens a dialog/popover to edit individual fields

**Option B: Individual inline editable fields stacked**
- Keep fields editable inline but display on one line when not editing
- Show formatted address normally, expand to edit mode on click

**Recommended: Option A** - Cleaner UX, single click to edit all address fields

### New Address Display Component

```tsx
// Inside CardContent
<div className="flex items-center gap-2">
  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
  <div className="flex items-center gap-2 flex-1 min-w-0">
    <p className="text-sm text-foreground">
      {[office.address, office.city, office.country]
        .filter(Boolean)
        .join(', ') || 'No address specified'}
    </p>
    {office.country && (
      <span className="text-lg">{getCountryFlag(office.country)}</span>
    )}
  </div>
  <Button variant="ghost" size="sm" onClick={() => setEditingAddress(true)}>
    <Pencil className="h-3 w-3" />
  </Button>
</div>
```

### Address Edit Dialog

Create a simple dialog or popover that allows editing all three fields:

```text
+-- Edit Address Dialog ------------------+
| Street Address: [________________]      |
| City:           [________________]      |
| Country:        [________________]      |
|                                         |
|                     [Cancel] [Save]     |
+-----------------------------------------+
```

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/offices/OfficeDetailView.tsx` | Replace 3-column grid with single-line address display + edit dialog |

### Visual Result

**Before:**
```text
Address              City           Country
[MapPin] 75 Dalma... Sydney         Australia
```

**After:**
```text
[MapPin] 75 Dalmatia Avenue, Sydney, Australia [flag] [Edit]
```

### Benefits

1. **Cleaner layout** - Less visual clutter
2. **More context** - Full address visible at a glance
3. **Country flag** - Visual indicator of office location
4. **Single edit action** - One click to edit all address components

