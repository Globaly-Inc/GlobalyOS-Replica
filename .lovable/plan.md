

# Implement Consistent Icon and Text Sizes in Spaces Section

## Overview
Make the Spaces section in the left sidebar visually consistent with the Favorites section by updating icon sizes to match.

---

## Current State Analysis

| Property | Favorites Section | Spaces Section |
|----------|------------------|----------------|
| Icon container size | `h-6 w-6` | `h-4 w-4` |
| Icon fallback text | `text-[10px]` | N/A (uses Hash icon) |
| Row text | `text-sm` | `text-sm` |
| Row gap | `gap-2.5` | `gap-2.5` |
| Padding | `px-2 py-1.5` | `px-2 py-1.5` |

**Key Difference:** The Spaces section uses smaller `h-4 w-4` icons, while Favorites uses `h-6 w-6` icon containers.

---

## Implementation

### File: `src/components/chat/ChatSidebar.tsx`

**Change 1: Update space image size** (around line 573-578)

```tsx
// Before
{space.icon_url ? (
  <img 
    src={space.icon_url} 
    alt="" 
    className="h-4 w-4 rounded flex-shrink-0" 
  />
) : (
  <Hash className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
)}

// After
{space.icon_url ? (
  <div className="flex items-center justify-center h-6 w-6 flex-shrink-0">
    <img 
      src={space.icon_url} 
      alt="" 
      className="h-6 w-6 rounded object-cover" 
    />
  </div>
) : (
  <div className="flex items-center justify-center h-6 w-6 rounded bg-muted text-muted-foreground font-medium text-[10px]">
    {space.name.charAt(0).toUpperCase()}
  </div>
)}
```

This matches the Favorites section pattern where:
- Icons/images are wrapped in a `h-6 w-6` container
- Fallback shows a letter initial with `text-[10px]` and `bg-muted` background
- Images use `object-cover` for proper scaling

---

## Summary of Changes

| File | Lines | Description |
|------|-------|-------------|
| `src/components/chat/ChatSidebar.tsx` | ~573-581 | Update space icon/image container to use `h-6 w-6` size with letter fallback matching Favorites style |

---

## Expected Result

After implementation:
- Space icons will be `h-6 w-6` (same as Favorites)
- Spaces without custom icons will show a letter initial in a `h-6 w-6` muted background circle (matching Favorites)
- Visual consistency across Favorites, Direct Messages, and Spaces sections

