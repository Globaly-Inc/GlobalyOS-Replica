

## Plan: Style Tag Badges with Faded Grey Text

**File: `src/components/tasks/TaskRow.tsx`** (line 424)

Add `text-muted-foreground` to the Badge className to make the tag text appear in a faded grey instead of the default black.

```tsx
// Before
<Badge key={tag} variant="outline" className="text-[10px] h-4 px-1 shrink-0 gap-0.5 group/tag">

// After
<Badge key={tag} variant="outline" className="text-[10px] h-4 px-1 shrink-0 gap-0.5 group/tag text-muted-foreground">
```

Single-line change.

