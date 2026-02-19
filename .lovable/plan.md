

# Dynamic TopNav: Responsive Text/Icon Mode

## What Changes

The TopNav will automatically detect available horizontal space and switch between two modes:

- **Expanded mode** (enough space): All items show icon + text label (like a traditional nav bar)
- **Compact mode** (tight space): Inactive items collapse to icon-only square buttons; the active item still shows its text label

This uses a `ResizeObserver` on the nav container to measure available width and decide which mode to use.

## How It Works

```text
Wide screen (e.g. 1920px):
  [Home]  [Team]  [KPIs]  [Wiki]  [Chat]  [Tasks]  [CRM]
   icon+   icon+   icon+   icon+   icon+   icon+    icon+
   text    text    text    text    text    text     text

Narrow screen (e.g. 1280px with sidebar + right actions taking space):
  [H] [T] [K] [W] [ Chat ] [T] [C]
  icon icon icon icon  active  icon icon
                      (label)
```

## Technical Details

### File: `src/components/TopNav.tsx`

1. **Add a `useRef` on the `<nav>` element** and a `useState` for `isCompact` (boolean).

2. **Add a `useEffect` with `ResizeObserver`** that watches the nav container width:
   - Calculate the space needed for expanded mode: roughly `visibleItems.length * 90px` (each item with icon + text + padding + gap).
   - If the container width is less than the threshold, set `isCompact = true`; otherwise `isCompact = false`.

3. **Update the rendering logic**:
   - When `isCompact` is `false` (expanded): all items show icon + text label with `gap-2 px-3 py-2` and the active item gets `bg-secondary`.
   - When `isCompact` is `true` (compact): inactive items use the current square icon style (`h-9 w-9 justify-center bg-muted/50`), active item keeps icon + text.

4. **Add tooltips for compact mode**: Wrap inactive icon-only items in a `Tooltip` so users can hover to see the label (using the existing `Tooltip` component from `@/components/ui/tooltip`).

5. **Chat badge positioning** remains the same -- absolute when icon-only, inline when showing text.

### Threshold Calculation

The threshold will be based on the number of visible items. Each expanded item needs approximately 85-95px (icon 16px + gap 8px + text ~40-50px + padding 24px). A simple formula:

```typescript
const EXPANDED_ITEM_WIDTH = 90;
const threshold = visibleItems.length * EXPANDED_ITEM_WIDTH;
```

The `ResizeObserver` fires on mount and whenever the nav container resizes (e.g., window resize, sidebar toggle), so mode switches happen automatically with no flicker.

### No Other File Changes

All changes are contained within `src/components/TopNav.tsx`. The existing `Tooltip`, `TooltipTrigger`, `TooltipContent`, and `TooltipProvider` components from `@/components/ui/tooltip` will be imported and used.

