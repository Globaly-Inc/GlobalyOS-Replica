

## Refactor EmployeePickerPopover to use Command-based searchable dropdown

### What changes

Update `src/components/tasks/EmployeePickerPopover.tsx` to use the `Command` / `CommandInput` / `CommandList` / `CommandItem` / `CommandEmpty` components (same pattern as the Leave Records employee filter) instead of the current raw `Input` + `ScrollArea` approach.

### Changes — single file: `src/components/tasks/EmployeePickerPopover.tsx`

1. **Replace imports**: Swap `Input`, `ScrollArea`, `Search` imports for `Command`, `CommandInput`, `CommandList`, `CommandItem`, `CommandEmpty`, `CommandGroup` from `@/components/ui/command`.

2. **Replace inner content of `PopoverContent`**: Remove the manual search input + ScrollArea and replace with:
   - `Command` wrapper
   - `CommandInput` with placeholder "Search employees..."
   - `CommandList` containing `CommandEmpty` ("No employees found.") and `CommandGroup`
   - Each employee rendered as a `CommandItem` with avatar + name (the Command component handles search/filtering natively via the `value` prop)
   - Keep the "Unassign" option when a value is selected
   - Keep the selected highlight styling

3. **Remove manual search state and filtering**: The `cmdk` `Command` component handles search filtering internally via `CommandInput`, so the `search` state and `filtered` memo can be removed.

4. **Increase popover width** from `w-64` to `w-[280px]` to match the Leave Records pattern.

### Result
The dropdown will look and behave like the Leave Records employee filter: a searchable command palette with a scrollable list, native keyboard navigation, and consistent styling.

