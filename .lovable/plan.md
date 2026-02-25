

## Replace inline Assignee selector with Command-based searchable dropdown

### What changes

Update the `AssigneeSelector` in `src/components/tasks/TaskInlineCellEditors.tsx` to use the `Command` / `CommandInput` / `CommandList` / `CommandItem` / `CommandEmpty` / `CommandGroup` components — the same pattern used in the `EmployeePickerPopover` and Leave Records employee filter.

### Single file: `src/components/tasks/TaskInlineCellEditors.tsx`

**Changes to `AssigneeSelector` component (lines ~96–145):**

1. **Replace imports**: Add `Command`, `CommandInput`, `CommandList`, `CommandItem`, `CommandEmpty`, `CommandGroup` from `@/components/ui/command`. Remove the manual `<input>` search field.

2. **Replace inner `PopoverContent` body**: Remove the raw `<input>` search box and manual `<div className="max-h-48 overflow-y-auto">` list. Replace with:
   - `Command` wrapper
   - `CommandInput` with placeholder `"Search..."`
   - `CommandList` containing `CommandEmpty` ("No members found.") and `CommandGroup`
   - "Unassigned" option as a `CommandItem`
   - Each member rendered as a `CommandItem` with `value={m.full_name}` so search filtering works natively

3. **Remove manual search state**: Drop the `search` state and `filtered` array — the `Command` component handles filtering internally.

4. **Widen popover**: Change from `w-48` to `w-[220px]` for better readability.

### Result
The inline assignee dropdown in "+ Add Task" will look and behave like the Leave Records employee filter: searchable via Command input, scrollable list, native keyboard navigation, and consistent styling.

