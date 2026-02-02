
# Add Department Selection When Creating New Position

## Summary
Enhance the `PositionCombobox` component to allow users to select a department when creating a new position inline. Currently, new positions are created with the `departmentId` prop value (if provided), but users cannot choose or change the department during inline creation.

## Current Behavior
- User types a position name that doesn't exist
- "Create [position name]" option appears
- Clicking it creates the position with whatever `departmentId` was passed as a prop
- No way to select a different department during creation

## Proposed Behavior
- User types a position name that doesn't exist
- "Create [position name]" option appears with a department dropdown below it
- User can select a department from existing departments
- Position is created with the selected department

## Implementation Details

### File: `src/components/hiring/PositionCombobox.tsx`

**Changes:**

1. **Import `useDepartments` hook** to fetch available departments

2. **Add state for selected department** when creating:
   - `newPositionDepartmentId` - tracks the department selection for new position

3. **Modify the "Create" section UI:**
   - Show a small department selector (Select component) below the "Create" button
   - Pre-populate with the `departmentId` prop if provided
   - Allow changing to any available department

4. **Update `handleCreate` function:**
   - Use `newPositionDepartmentId` instead of just `departmentId` prop

### UI Layout (within the CommandGroup for creating)

```text
+------------------------------------------+
| + Create "Software Engineer"             |
|   Department: [Select department v]      |
+------------------------------------------+
```

The department selector will:
- Appear only when `canCreate` is true
- Default to the `departmentId` prop value if provided
- Show "No department" option for positions without department assignment
- Use the same Select component pattern used elsewhere in the app

## Technical Considerations

1. **State Management**: Reset `newPositionDepartmentId` when the popover closes or when a position is successfully created

2. **UX Flow**: The department dropdown appears automatically when user types a non-existing position name, making it clear they can assign a department

3. **Consistency**: Uses the same `Select` component and styling as the rest of the system

## Files to Modify

| File | Change |
|------|--------|
| `src/components/hiring/PositionCombobox.tsx` | Add department selector in create section, import useDepartments, manage department selection state |
