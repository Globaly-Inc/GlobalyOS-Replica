# Plan: Prevent Multiple Current Positions

## Problem Summary
Currently, when adding a new position entry, users can check "Present (Current)" even when there's already a current position. While there IS a confirmation dialog (lines 257-262), the user wants to prevent this option entirely - the "Present (Current)" checkbox should be disabled when:
1. Adding a new position AND there's already a current position
2. Editing a historical position (not the current one) AND there's already a current position

The checkbox should only be enabled when:
1. Adding a new position AND there's NO current position
2. Editing the CURRENT position itself

## Solution

### File: `src/components/dialogs/PositionDialog.tsx`

**1. Add logic to determine if "Present (Current)" should be disabled (around line 99)**

```tsx
const currentPosition = existingPositions.find(p => p.is_current);

// Determine if "Present (Current)" checkbox should be disabled
// Only allow setting as current if:
// - There's no current position yet, OR
// - We're editing the current position itself
const isEditingCurrentPosition = isEditing && entry?.is_current;
const hasOtherCurrentPosition = currentPosition && currentPosition.id !== entry?.id;
const disableCurrentCheckbox = hasOtherCurrentPosition;
```

**2. Update the checkbox UI (lines 619-628)**

- Disable the checkbox when `disableCurrentCheckbox` is true
- Add a tooltip or helper text explaining why it's disabled
- Visually indicate the disabled state

```tsx
<div className="flex items-center gap-2">
  <Checkbox
    id="is_current"
    checked={formData.is_current}
    onCheckedChange={handleCurrentToggle}
    disabled={disableCurrentCheckbox}
  />
  <Label 
    htmlFor="is_current" 
    className={cn(
      "text-sm font-normal cursor-pointer",
      disableCurrentCheckbox && "opacity-50 cursor-not-allowed"
    )}
  >
    Present (Current)
  </Label>
  {disableCurrentCheckbox && (
    <span className="text-xs text-muted-foreground">
      (End current position first)
    </span>
  )}
</div>
```

**3. Remove the confirmation dialog logic (lines 257-262, 666-683)**

Since we're preventing the action entirely, the confirmation dialog for replacing current position becomes unnecessary and can be removed:
- Remove the `confirmDialogOpen` and `pendingSubmit` state variables
- Remove the confirmation check in `handleSubmit`
- Remove the `AlertDialog` component

**4. Simplify handleCurrentToggle**

The toggle handler remains the same but will only be called when the checkbox is enabled.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/dialogs/PositionDialog.tsx` | Disable "Present (Current)" checkbox when another current position exists, remove confirmation dialog |

## Expected Result

- When adding a new position with an existing current position: "Present (Current)" checkbox is disabled with helper text "(End current position first)"
- When editing a historical position: Same behavior - checkbox disabled
- When editing the current position: Checkbox enabled (can toggle it off to convert to historical)
- When adding first position (no history): Checkbox enabled
- Cleaner UX without confusing confirmation dialogs

## Critical Files for Implementation
- `src/components/dialogs/PositionDialog.tsx` - Main dialog with checkbox logic to modify
