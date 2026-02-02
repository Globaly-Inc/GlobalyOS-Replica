
# Add NPR (Nepalese Rupee) to Currency List

## Summary
Add the missing NPR (Nepalese Rupee) currency to the searchable currency dropdown in the Job Creation form. The component is already using the project's standard UI components (Popover + Command pattern from shadcn/ui).

## Change Required

**File:** `src/components/hiring/CurrencyCombobox.tsx`

Add NPR to the `CURRENCIES` array at an appropriate position (after INR, since they're in the same region):

```typescript
const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'NPR', symbol: 'रू', name: 'Nepalese Rupee' },  // <-- Add this
  // ... rest of currencies
];
```

## Technical Notes
- The symbol `रू` for NPR is consistent with other parts of the codebase (found in `InviteTeamMemberDialog.tsx` and `PayrollProfilesTab.tsx`)
- The component is already using the project's existing UI components:
  - `Popover` / `PopoverContent` / `PopoverTrigger`
  - `Command` / `CommandInput` / `CommandList` / `CommandItem` / `CommandEmpty` / `CommandGroup`
- No changes needed to the component logic - just adding the missing currency entry

## Future Consideration
The codebase has multiple duplicate currency lists across different components. A future improvement could consolidate these into a shared `src/constants/currencies.ts` file to ensure consistency.
