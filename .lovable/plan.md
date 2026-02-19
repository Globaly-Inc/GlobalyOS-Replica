

# TopNav Icon Styling: Square Icons with Lighter Background

## Summary
Update inactive nav items in `TopNav.tsx` to render as square icon buttons with a subtle lighter background, matching the right-side quick action icons.

## Changes

### File: `src/components/TopNav.tsx`

Update the `className` logic inside the `OrgLink` (around lines 99-117):

**Inactive items** get these classes:
```
h-9 w-9 justify-center bg-muted/50 text-muted-foreground hover:bg-secondary hover:text-foreground relative
```

**Active items** keep:
```
gap-2 bg-secondary text-foreground px-3 py-2
```

**Shared base** (both):
```
flex items-center rounded-lg text-sm font-medium transition-colors
```

**Chat badge** gets conditional absolute positioning when inactive:
```
className={cn(
  "h-5 min-w-[20px] px-1.5 text-[10px] font-semibold",
  !active && "absolute -top-1 -right-1"
)}
```

### Specific line changes (lines 99-117)

Replace the current className and badge block with:
- Remove `gap-2` from the shared base (only apply on active)
- Remove `text-muted-foreground` and `hover:bg-secondary hover:text-foreground` from shared (move to inactive branch)
- Active branch: `gap-2 bg-secondary text-foreground px-3 py-2`
- Inactive branch: `h-9 w-9 justify-center bg-muted/50 text-muted-foreground hover:bg-secondary hover:text-foreground relative`
- Badge: add `!active && "absolute -top-1 -right-1"` for proper positioning in icon-only mode

No other files need changes.

