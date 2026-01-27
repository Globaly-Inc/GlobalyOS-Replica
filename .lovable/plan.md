

# Add Post Visibility Badge to PostCard

## Overview

Display where each post is shared (Office, Department, Project, or Everyone) as a minimal tag after the post timestamp. The existing `VisibilityBadge` component will be reused with a more compact styling.

---

## Suggested UI Design

```text
Current:
+------------------------------------------------------------------+
| [Avatar]  John Smith              [Win Badge] [Pinned]           |
|           2h ago                                                 |
+------------------------------------------------------------------+

Updated:
+------------------------------------------------------------------+
| [Avatar]  John Smith              [Win Badge] [Pinned]           |
|           2h ago · [Globe] Everyone                              |
|           2h ago · [Building] London Office                       |
|           2h ago · [Briefcase] Engineering                        |
|           2h ago · [Folder] Project Alpha                         |
+------------------------------------------------------------------+
```

The visibility tag will be:
- Very minimal and muted (matches timestamp styling)
- Shows appropriate icon (Globe/Building/Briefcase/Folder)
- Displays scope name (Everyone, Office name, Department name, or Project name)
- Separated from timestamp by a centered dot (·)

---

## Implementation

### File: `src/components/feed/PostCard.tsx`

**1. Add import for VisibilityBadge (around line 60)**

```typescript
import { VisibilityBadge } from './VisibilityBadge';
```

**2. Update Row 2 (lines 248-253) to include visibility badge**

Current code:
```tsx
{/* Row 2: Time */}
<div className="flex items-center gap-2 mt-0.5">
  <span className="text-muted-foreground text-sm">
    {formatSmartDateTime(post.created_at, 3)}
  </span>
</div>
```

Updated code:
```tsx
{/* Row 2: Time + Visibility */}
<div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
  <span className="text-muted-foreground text-sm">
    {formatSmartDateTime(post.created_at, 3)}
  </span>
  <span className="text-muted-foreground/50">·</span>
  <VisibilityBadge
    accessScope={post.access_scope}
    offices={post.post_offices}
    departments={post.post_departments}
    projects={post.post_projects}
    className="h-5 py-0 px-1.5 text-[11px] border-0 bg-transparent"
  />
</div>
```

---

## Visual Examples

| Scope | Display |
|-------|---------|
| Company/Everyone | `2h ago · 🌐 Everyone` |
| Office | `2h ago · 🏢 London Office` |
| Department | `2h ago · 💼 Engineering` |
| Project | `2h ago · 📁 Project Alpha` |
| Multiple | `2h ago · 🏢 London, NYC...` (truncated with tooltip) |

---

## Styling Details

The visibility badge will use a minimal inline style:
- **No border**: `border-0`
- **Transparent background**: `bg-transparent`
- **Smaller text**: `text-[11px]`
- **Compact height**: `h-5 py-0 px-1.5`
- **Icon + text color**: Matches muted-foreground for subtle appearance

This keeps it visually consistent with the timestamp and doesn't add clutter.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/feed/PostCard.tsx` | Import VisibilityBadge, add to Row 2 after timestamp |

---

## Result

- Every post will show its visibility scope inline after the timestamp
- Minimal, non-intrusive tag that blends with the existing meta info
- Tooltip shows full list if truncated (e.g., multiple offices)
- Consistent with the existing VisibilityBadge component design

