
# Icon-Only Nav for Super Admin Layout

Apply the same compact/expanded pattern used in `TopNav.tsx` to the Super Admin sub-navigation: inactive items show icon-only with tooltips, while the active item shows icon + label.

## Changes

**File: `src/components/super-admin/SuperAdminLayout.tsx`**

1. Add imports for `useRef`, `useState`, `useEffect` from React, and `Tooltip`/`TooltipTrigger`/`TooltipContent`/`TooltipProvider` from the UI tooltip component.

2. Add a `ResizeObserver`-based compact mode detection (same pattern as `TopNav`):
   - Track nav container width with a ref
   - Calculate threshold as `navItems.length * EXPANDED_ITEM_WIDTH` (90px per item)
   - When container is narrower than threshold, switch to compact mode

3. Update nav item rendering:
   - **Active item**: Always shows icon + label (with padding `gap-2 px-3 py-2`)
   - **Inactive items**: In compact mode, show icon-only as a 9x9 square button; in expanded mode, show icon + label
   - Icon-only items get wrapped in a `Tooltip` to show the label on hover

4. Update `isActive` to also match sub-paths (e.g. `/super-admin/features/crm` matches `/super-admin/features`)

## Technical Details

- Reuses the exact same `ResizeObserver` + `isCompact` state pattern from `TopNav.tsx`
- Uses the same `TooltipProvider` / `Tooltip` / `TooltipTrigger` / `TooltipContent` components
- `EXPANDED_ITEM_WIDTH = 90` constant matches `TopNav`
- No new files or dependencies needed -- single file edit
