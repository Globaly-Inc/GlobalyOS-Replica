
# Social Feed Horizontal Scroll Layout for Team Profile

## Summary
The wireframe shows a **horizontal scrolling row** of compact post cards in the Team Profile Activity Feed section, not a vertical list or grid. This matches patterns already used in GlobalyOS (e.g., WorldClockCards, InlinePostComposer pills).

---

## Current State vs. Wireframe

| Wireframe Element | Current Status | Notes |
|-------------------|----------------|-------|
| "Activity Feed" header | Implemented | Exists with Activity icon |
| Filters row | Implemented | Tabs with All, Posts, Kudos Received, Mentioned In |
| **Horizontal scroll container** | Missing | Currently vertical stack with `space-y-4` |
| Compact post cards in a row | Missing | Using full-height `PostCard` components |
| Fixed-width cards that scroll | Missing | Cards are full-width |

---

## Proposed Solution

### Layout Pattern
Use the same horizontal scroll pattern from `WorldClockCards` and `InlinePostComposer`:

```
flex gap-3 overflow-x-auto scrollbar-hide py-2
```

Each card will be a fixed-width, compact representation:
- `min-w-[280px]` or `w-[280px]` for consistent card widths
- `shrink-0` to prevent flex shrinking
- Height determined by content (2-3 lines max)

### Visual Structure
```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Activity Feed (or "Social Feed")                                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [All] [Posts] [Kudos Received] [Mentioned In]                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│ ◀ scroll                                                                        │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│ │ [Avatar] Name│ │ [Avatar] Name│ │ [Avatar] Name│ │ [Avatar] Name│  → scroll  │
│ │ [Badge] time │ │ [Badge] time │ │ [Badge] time │ │ [Badge] time │            │
│ │ Content...   │ │ Content...   │ │ Content...   │ │ Content...   │            │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                     scroll →    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Step 1: Create `PostCardCompact.tsx` Component

**Location:** `src/components/feed/PostCardCompact.tsx`

**Reuses from existing codebase:**
- `POST_TYPE_CONFIG` from `PostCard.tsx` (colors, icons, labels)
- `Avatar`, `Badge`, `Card` components
- `OrgLink` for profile navigation
- `formatSmartDateTime` utility
- `TruncatedRichText` with reduced `maxLines={2}`

**Props:**
```typescript
interface PostCardCompactProps {
  post: Post;
  onClick?: (post: Post) => void;  // Optional: for future expand/modal
}
```

**Card Structure:**
```text
┌────────────────────────────────────┐
│ [Avatar] Name          [TypeBadge] │
│          timestamp                 │
├────────────────────────────────────┤
│ Truncated content (2 lines max)... │
└────────────────────────────────────┘
```

**Sizing:**
- Fixed width: `w-[280px]` or `min-w-[280px]`
- `shrink-0` to prevent compression
- Consistent with WorldClockCards pattern

---

### Step 2: Update `ProfileActivityFeed.tsx` Layout

**Change from:**
```tsx
<div className="space-y-4">
  {filteredPosts.map(post => (
    <PostCard key={post.id} post={post} />
  ))}
</div>
```

**Change to:**
```tsx
<div className="flex gap-3 overflow-x-auto scrollbar-hide py-2 -mx-1 px-1">
  {filteredPosts.map(post => (
    <PostCardCompact key={post.id} post={post} />
  ))}
</div>
```

**Pattern reused from:**
- `WorldClockCards.tsx` line 134: `flex gap-2 overflow-x-auto`
- `InlinePostComposer.tsx` line 413: `flex gap-1.5 overflow-x-auto ... scrollbar-hide`

---

### Step 3: Optional UI Refinements

1. **Empty state:** Keep existing centered text, but may need horizontal alignment adjustment
2. **Section rename:** Update header from "Activity Feed" to "Social Feed" if desired (in `TeamMemberProfile.tsx` line 1390)

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/feed/PostCardCompact.tsx` | Create | New compact card for horizontal scroll |
| `src/components/feed/ProfileActivityFeed.tsx` | Modify | Change layout from vertical to horizontal scroll |
| `src/pages/TeamMemberProfile.tsx` | Optional | Rename section header if needed |

---

## Technical Details

### Horizontal Scroll CSS Pattern
Already defined in `src/index.css` (lines 98-103):
```css
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

### PostCardCompact Component
Will reuse:
- `POST_TYPE_CONFIG` object (icon, colors, labels) from `PostCard.tsx`
- `Avatar`, `AvatarImage`, `AvatarFallback` 
- `Badge` for post type
- `Card` with hover state
- `OrgLink` for navigation to author profile
- `formatSmartDateTime` for relative timestamps
- `TruncatedRichText` with `maxLines={2}` for content

---

## Performance Considerations

- **Less DOM:** Compact cards render ~80% less DOM than full `PostCard`
- **No API changes:** Reuses existing `useEmployeeFeed` hook
- **Native scroll:** Uses browser's native horizontal scroll (no carousel library needed for this simple case)
- **Efficient re-renders:** Each card is a simple presentational component

---

## Security Considerations

- No new permissions required
- No additional data exposure
- Uses same `OrgLink` patterns for navigation
- Post visibility already enforced by `useEmployeeFeed` query

---

## Testing Checklist

- [ ] Horizontal scroll works on desktop (mouse wheel + drag)
- [ ] Horizontal scroll works on mobile (touch swipe)
- [ ] All filter tabs work correctly with horizontal layout
- [ ] Post type badges display with correct colors/icons
- [ ] Truncated content shows ellipsis after 2 lines
- [ ] Avatar links navigate to correct profile
- [ ] Empty states display correctly per filter
- [ ] Loading spinner displays during data fetch
- [ ] Cards have consistent width and don't compress
- [ ] Scrollbar is hidden but scroll functionality works

---

## Estimated Effort

| Task | Time |
|------|------|
| Create `PostCardCompact.tsx` | 20 min |
| Update `ProfileActivityFeed.tsx` layout | 10 min |
| Testing & refinement | 15 min |
| **Total** | ~45 min |
