

# Compact TopNav: Icon-Only with Active Label

## Problem
With many nav items (Home, Team, KPIs, Wiki, Chat, Tasks, CRM), the top navigation bar runs out of horizontal space, especially on smaller desktop screens.

## Solution
- **Inactive items**: Show icon only (no text label)
- **Active/selected item**: Show icon + text label (so the user always knows where they are)
- **Hover**: Show the item name in a tooltip on inactive items

## Changes

### File: `src/components/TopNav.tsx`

1. Import `Tooltip`, `TooltipTrigger`, `TooltipContent`, and `TooltipProvider` from `@/components/ui/tooltip`
2. For each nav item:
   - If **active**: render icon + text label as it does today (with slightly tighter padding)
   - If **inactive**: wrap the link in a `Tooltip` and hide the text label, showing only the icon. The tooltip displays the item name on hover.
3. The Chat unread badge continues to show on the Chat icon regardless of active state
4. Reduce horizontal padding on inactive items (`px-2` instead of `px-3`) to keep them compact

### Visual Result

```text
Before:  [Home] [Team] [KPIs] [Wiki] [Chat 3] [Tasks] [CRM]
After:   [icon] [icon] [KPIs] [icon] [icon 3] [icon]  [icon]
                        ^^^^^ active item shows text
```

Hovering any icon-only item shows a tooltip with the name.

### Technical Details

- Wrap the entire nav in `TooltipProvider` with a short `delayDuration` (e.g., 100ms) for snappy tooltips
- Each inactive item gets `Tooltip` > `TooltipTrigger asChild` > `OrgLink` with icon only
- Active items render normally with icon + label, no tooltip needed
- Tour class names (`tour-team-directory`, etc.) are preserved on the links
- No other files need changes

