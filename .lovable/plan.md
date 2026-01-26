
# Plan: Smart Date Display for Social Feed (Relative → Full Date After 3 Days)

## Overview

This change updates the social feed to show relative time (e.g., "2h ago", "1d ago") for recent posts, but switches to full date with time (e.g., "24 Jan 2026 - 3:45 PM") for posts older than 3 days.

---

## Current Behavior

- **`PostCard.tsx`**: Uses `formatDistanceToNow()` from date-fns (e.g., "about 5 hours ago")
- **`PostComments.tsx`**: Same approach for comment timestamps
- Always shows relative time regardless of age

---

## Proposed Solution

Create a new utility function `formatSmartDateTime` that intelligently switches between relative and absolute formats based on age.

---

## Technical Changes

### 1. Add New Utility Function in `src/lib/utils.ts`

```typescript
/**
 * Smart date formatter for social feeds
 * Shows relative time for recent posts, full date+time for older posts
 * @param date - The date to format
 * @param thresholdDays - Number of days after which to show full date (default: 3)
 * @param timezone - Optional timezone for formatting
 */
export function formatSmartDateTime(
  date: string | Date | null | undefined, 
  thresholdDays: number = 3,
  timezone?: string
): string {
  if (!date) return '';
  const dateObj = new Date(date);
  if (!isValidDate(dateObj)) return '';
  
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  
  // If older than threshold, show full date with time
  if (diffDays >= thresholdDays) {
    if (timezone) {
      return formatInTimeZone(dateObj, timezone, "dd MMM yyyy - h:mm a");
    }
    return format(dateObj, "dd MMM yyyy - h:mm a");
  }
  
  // Otherwise, show relative time
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffDays)}d ago`;
}
```

---

### 2. Update `PostCard.tsx` (Line 251)

**Before:**
```tsx
{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
```

**After:**
```tsx
{formatSmartDateTime(post.created_at, 3)}
```

Also update imports to include `formatSmartDateTime` from `@/lib/utils`.

---

### 3. Update `PostComments.tsx` (Line 153)

**Before:**
```tsx
{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
```

**After:**
```tsx
{formatSmartDateTime(comment.created_at, 3)}
```

Also update imports accordingly.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/utils.ts` | Add `formatSmartDateTime` function |
| `src/components/feed/PostCard.tsx` | Use new function for post timestamps |
| `src/components/feed/PostComments.tsx` | Use new function for comment timestamps |

---

## Behavior Summary

| Post Age | Display Format |
|----------|----------------|
| < 1 min | "just now" |
| 1-59 min | "5m ago" |
| 1-23 hours | "3h ago" |
| 1-2 days | "1d ago", "2d ago" |
| ≥ 3 days | "24 Jan 2026 - 3:45 PM" |

---

## Edge Cases

1. **Future dates**: Will show relative time (negative values handled gracefully)
2. **Invalid dates**: Returns empty string (existing validation)
3. **Timezone support**: Full date format respects user timezone when provided
