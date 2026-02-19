

# TopNav Icon Styling: Square Icons with Lighter Background

## What Changes
Update inactive nav items in `TopNav.tsx` to render as square icon buttons with a subtle lighter background, matching the visual pattern of the right-side quick action icons (Search, Check-In, Notifications, etc.).

## Visual Result

```text
Right-side actions:  [Search] [AI] [Check-In] [Leave] [Bell] [Settings] [Avatar]
                      ^-- square outlined icon buttons

Top nav (after):     [Home] [Team] [KPIs] [Wiki] [Chat] [Tasks] [CRM]
                      ^-- similar square buttons with light bg, active one shows label
```

## Technical Details

### File: `src/components/TopNav.tsx`

Changes to the inactive item styling:
- Add a fixed square size (`h-9 w-9` or `h-8 w-8`) with centered content for inactive icons
- Apply a light background color like `bg-muted/50` (lighter than the current hover state) so they appear as distinct square "buttons"
- Remove the `gap-2` and `px-2 py-2` on inactive items; use `p-0 justify-center` to keep icons perfectly centered in the square
- Keep the active item styling unchanged (icon + label with `bg-secondary`)
- Chat badge positioning: use `relative` on the link and absolute-position the badge on inactive state

Inactive item classes will look like:
`h-9 w-9 flex items-center justify-center rounded-lg bg-muted/50 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors`

This gives them a square shape with a subtle background tint, similar to the outlined icon buttons on the right side but slightly lighter/softer to differentiate nav from actions.

