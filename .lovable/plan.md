

# Fix: Email Click-to-Edit Not Opening Dialog

## Root Cause

In `TeamMemberProfile.tsx` (line 813-822), the email field is wrapped like this:

```
EditEmailDialog
  -> DialogTrigger (asChild)
    -> ClickToEdit (renders a <button>)
      -> <span>kavita@globalyos.com</span>
```

The `ClickToEdit` component calls `e.stopPropagation()` on click (line 44 of `ClickToEdit.tsx`), which **prevents the click event from bubbling up** to the `DialogTrigger`. Meanwhile, `onEdit` is set to `() => {}` — an empty function that does nothing.

Result: clicking the email swallows the event and the dialog never opens.

This same bug affects **all fields** using this pattern (Email, User Role, Manager, Department, Position, Projects) on the profile page.

## Fix

**In `ClickToEdit.tsx`**: Remove `e.stopPropagation()` from the click handler. The `stopPropagation` was originally added to prevent parent click handlers from firing, but it breaks the `DialogTrigger asChild` pattern where the dialog relies on the click event reaching its wrapper. The `onEdit` callback alone is sufficient for cases that need custom handling.

Change:
```typescript
onClick={(e) => {
  e.stopPropagation();
  onEdit();
}}
```

To:
```typescript
onClick={() => {
  onEdit();
}}
```

This is a one-line change in a single file (`src/components/ui/ClickToEdit.tsx`, line 43-46) that fixes the email dialog and all other click-to-edit fields on the profile page.

## Risk Assessment

- **Low risk**: `ClickToEdit` is used only on the Team Member Profile page for fields that all use the same `DialogTrigger asChild` pattern.
- Removing `stopPropagation` allows parent click handlers to also fire, but the profile page layout has no competing click handlers on parent elements that would cause issues.

