

# Fix: "Add New Question" Dialog Inputs Unresponsive

## Root Cause

The `EditFieldDialog` component in `ApplicationFormSettings.tsx` has a state initialization bug. The `draft` state (which tracks edits to the question being created/edited) is only initialized inside the `handleOpen` callback, which is bound to Radix Dialog's `onOpenChange`. This callback fires only on **user-initiated** open/close actions (clicking the overlay, pressing Escape), **not** when the `open` prop changes programmatically.

When `addField()` or `openEdit()` set `editDialogOpen = true`, the dialog opens but `draft` remains `null`. The `updateDraft` function then becomes a no-op:

```
setDraft((prev) => (prev ? { ...prev, ...updates } : prev));
//                  prev is null → returns null → no update
```

The inputs display correctly (falling back to the `field` prop) but cannot be modified.

## Fix

**File:** `src/components/hiring/ApplicationFormSettings.tsx`

Replace the manual `handleOpen` initialization with a `useEffect` that syncs `draft` whenever `open` becomes `true` and a `field` is provided. This ensures `draft` is always initialized regardless of how the dialog opens.

### Changes

1. **Add `useEffect` to `EditFieldDialog`** to initialize `draft` when `open` transitions to `true`:
   ```typescript
   useEffect(() => {
     if (open && field) {
       setDraft({ ...field, options: field.options ? [...field.options] : [] });
     } else if (!open) {
       setDraft(null);
     }
   }, [open, field]);
   ```

2. **Simplify `handleOpen`** to just forward the open state (no more draft initialization logic there, since the effect handles it):
   ```typescript
   const handleOpen = (isOpen: boolean) => {
     onOpenChange(isOpen);
   };
   ```

3. **Update the dialog title** to show "Add New Question" vs "Edit Question" based on whether the field already exists in the list (i.e., whether `field.label` is empty, indicating a new field).

### Single file modified
- `src/components/hiring/ApplicationFormSettings.tsx` (lines ~134-160)

No database changes, no new files, no edge function changes required.

## Edge Cases
- Opening the dialog for an existing question (edit): works because `useEffect` fires with the existing field data.
- Rapid open/close cycles: the effect cleans up `draft` on close, preventing stale data.
- Fields with options (radio, checkboxes, dropdown): options array is deep-copied in the effect, preventing mutation of the parent state.

