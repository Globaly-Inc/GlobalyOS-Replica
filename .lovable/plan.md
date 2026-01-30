
# Update Old Social Feed References to New Unified Posts System

## Summary
The application migrated from an old social feed system (using separate `updates` and `kudos` tables) to a new unified `posts` table with `post_type` field. However, several areas still reference the old data sources and types, resulting in no data being displayed. This plan addresses the three main areas you identified plus other system-wide references.

---

## Problem Analysis

### 1. Notifications Page (`src/pages/Notifications.tsx`)
**Current Issues:**
- Notification type filters use old types (`kudos`, `mention`, `reaction`) that match the old system
- The `reference_type` in notifications still uses `"update"` and `"kudos"` which corresponds to old tables
- Navigation handler only handles `"kudos"`, `"update"`, `"leave_request"`, `"kpi"` reference types

**What exists:**
- Filtering works but only counts old notification types
- No filter for new post types: `social`, `executive_message`, `announcement` as post types

**Required Changes:**
- Add new notification type filter for "Posts" covering all social feed notifications
- Update notification types to include `post_reaction` alongside existing types
- Ensure deep links navigate correctly to the unified feed or specific posts

---

### 2. Super Admin Analytics (`src/pages/super-admin/SuperAdminAnalytics.tsx`)
**Current Issues:**
- Lines 169-170: Queries old `updates` and `kudos` tables
- Lines 254-256: Gets counts from old `updates` table filtering by `type: 'win'` and `type: 'announcement'`
- Lines 256: Gets counts from old `kudos` table
- Lines 283-285: Shows "Wins", "Announcements", "Kudos" metrics from old tables

**What exists:**
- The old tables (`updates`, `kudos`) still exist in DB schema but are deprecated
- New data is in `posts` table with `post_type` field

**Required Changes:**
- Replace `buildQuery('updates')` with `buildQuery('posts')`
- Replace `buildQuery('kudos')` → remove (kudos are in posts now)
- Update count queries:
  - `getCount('updates', { column: 'type', value: 'win' })` → `getCount('posts', { column: 'post_type', value: 'win' })`
  - `getCount('updates', { column: 'type', value: 'announcement' })` → `getCount('posts', { column: 'post_type', value: 'announcement' })`
  - `getCount('kudos')` → `getCount('posts', { column: 'post_type', value: 'kudos' })`
- Add new metrics for `social`, `update`, `executive_message` post types

---

### 3. Team Profile Page Activity Feed (`src/pages/TeamMemberProfile.tsx`)
**Current Status:**
- ✅ Already using the new system via `ProfileActivityFeed` component
- ✅ `ProfileActivityFeed` uses `useEmployeeFeed` which queries the `posts` table
- ✅ Legacy section removed (line 1370 confirms: "Legacy Kudos and Wins section removed")

**No changes needed** - this is already correctly implemented.

---

### 4. Old Type Definitions (`src/types/feed.ts`)
**Current Issues:**
- Contains old interfaces: `FeedUpdate`, `Kudos`, `KudosWithRelations`, `FeedReaction`
- `UpdateType` defines old types: `'win' | 'update' | 'achievement'`
- `FeedItem` references old combined types

**What exists:**
- New types are in `src/services/useSocialFeed.ts`: `PostType`, `Post`, `CreatePostInput`
- Old types still imported in `src/types/index.ts`

**Required Changes:**
- Deprecate or remove `src/types/feed.ts` 
- Update any imports to use types from `useSocialFeed.ts`
- Update `src/types/notification.ts` to add `post` as a reference type

---

### 5. Notification Reference Types (`src/types/notification.ts`)
**Current Issues:**
- `NotificationReferenceType` only includes: `'kudos' | 'update' | 'leave_request' | 'employee' | 'kpi' | 'post'`
- Should use `'post'` consistently instead of `'kudos'` and `'update'`

**Required Changes:**
- Add `'post'` to `NotificationReferenceType`
- Update all notification inserts in `useSocialFeed.ts` to use `reference_type: 'post'`

---

### 6. Legacy Reaction Components
**Current Issues:**
- `FeedReactions.tsx` uses `feed_reactions` table with `target_type: "update" | "kudos"`
- New system uses `post_reactions` table with `post_id`
- `PostViewDialog.tsx` and `KudosViewDialog.tsx` still use old `FeedReactions` component
- `WinCard.tsx` uses old `FeedReactions` component

**What exists:**
- `useSocialFeed.ts` has `usePostReactions` using the new `post_reactions` table
- `PostCard.tsx` component uses new reactions system

**Required Changes:**
- These dialog components appear to be legacy and may be unused
- Search for usage and either remove or update to use `PostReactions` from the new system

---

### 7. Notification Preferences (`src/hooks/useNotificationPreferences.tsx`)
**Current Status:**
- Has categories: `kudos`, `mentions`, `leave`, `general`
- Categories are still valid for the new system (kudos posts still generate kudos notifications)

**No changes needed** - notification preference categories are semantic and still apply.

---

## Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `src/pages/super-admin/SuperAdminAnalytics.tsx` | Major update | Replace old table queries with `posts` table queries |
| `src/pages/Notifications.tsx` | Minor update | Update navigation handler for `post` reference type |
| `src/services/useSocialFeed.ts` | Minor update | Change `reference_type: 'update'` to `reference_type: 'post'` |
| `src/types/notification.ts` | Minor update | Add `'post'` to `NotificationReferenceType` |
| `src/types/feed.ts` | Deprecation | Add deprecation comments, update exports |
| `src/components/dialogs/PostViewDialog.tsx` | Evaluate | Check if used, remove or update |
| `src/components/dialogs/KudosViewDialog.tsx` | Evaluate | Check if used, remove or update |
| `src/components/WinCard.tsx` | Evaluate | Check if used, remove or update |

---

## Implementation Steps

### Phase 1: Super Admin Analytics (Critical)
1. Update `buildQuery` calls to use `posts` table instead of `updates`/`kudos`
2. Update `getCount` calls to query `posts.post_type` 
3. Add counts for new post types: `social`, `update`, `executive_message`
4. Update feature usage display array with correct metrics

### Phase 2: Notification System Updates
1. Add `'post'` to `NotificationReferenceType` in types file
2. Update notification inserts in `useSocialFeed.ts` to use `reference_type: 'post'`
3. Update `handleNotificationClick` in Notifications page to handle `post` type
4. Keep backwards compatibility for existing notifications in DB

### Phase 3: Cleanup Legacy Components
1. Search codebase for `PostViewDialog`, `KudosViewDialog`, `WinCard` usage
2. If unused, remove the components
3. If used, update to use new reaction system or remove reaction functionality
4. Add deprecation warnings to `src/types/feed.ts`

---

## Technical Details

### SuperAdminAnalytics.tsx Changes

**Lines 168-170 - Replace old queries:**
```typescript
// OLD:
buildQuery('updates'),
buildQuery('kudos'),

// NEW:
buildQuery('posts'),  // Remove kudos - now in posts table
```

**Lines 254-256 - Replace count queries:**
```typescript
// OLD:
getCount('updates', { column: 'type', value: 'win' })
getCount('updates', { column: 'type', value: 'announcement' })
getCount('kudos')

// NEW:
getCount('posts', { column: 'post_type', value: 'win' })
getCount('posts', { column: 'post_type', value: 'announcement' })
getCount('posts', { column: 'post_type', value: 'kudos' })
getCount('posts', { column: 'post_type', value: 'social' })
getCount('posts', { column: 'post_type', value: 'update' })
getCount('posts', { column: 'post_type', value: 'executive_message' })
```

**Lines 283-285 - Update feature usage array:**
```typescript
// Update these lines to pull from new count variables
{ name: 'Wins', count: postsWinsCount, ... }
{ name: 'Announcements', count: postsAnnouncementsCount, ... }
{ name: 'Kudos', count: postsKudosCount, ... }
{ name: 'Social Posts', count: postsSocialCount, ... }
{ name: 'Updates', count: postsUpdatesCount, ... }
{ name: 'Executive Messages', count: postsExecutiveCount, ... }
```

### Notifications.tsx Changes

**Line 217-218 - Update navigation handler:**
```typescript
// OLD:
if (notification.reference_type === "kudos" || notification.reference_type === "update") {
  navigateOrg("/");
}

// NEW:
if (notification.reference_type === "kudos" || notification.reference_type === "update" || notification.reference_type === "post") {
  navigateOrg("/");  // Navigate to home where unified feed is
}
```

### useSocialFeed.ts Changes

**All notification inserts (lines 436, 459, 483, 506, 532, 828, 862, 1094, 1116, 1246, 1332):**
```typescript
// OLD:
reference_type: 'update',

// NEW (for backwards compatibility, keep both working):
reference_type: 'post',
```

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Old notifications won't navigate | Keep `"update"` and `"kudos"` handlers alongside `"post"` |
| Analytics shows zero data | Test with production data structure before deploying |
| Legacy dialogs break | Check for usage before removing |

---

## Estimated Effort

| Task | Effort |
|------|--------|
| SuperAdminAnalytics updates | 30 min |
| Notification system updates | 20 min |
| Type updates | 10 min |
| Legacy component cleanup | 15 min |
| Testing | 15 min |
| **Total** | ~1.5 hours |
