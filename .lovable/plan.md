# Update Old Social Feed References to New Unified Posts System

## Status: ✅ COMPLETED

## Summary
The application migrated from an old social feed system (using separate `updates` and `kudos` tables) to a new unified `posts` table with `post_type` field. This plan addressed updating all legacy references.

---

## Completed Changes

### 1. ✅ Super Admin Analytics (`src/pages/super-admin/SuperAdminAnalytics.tsx`)
- Replaced `buildQuery('updates')` and `buildQuery('kudos')` with `buildQuery('posts')`
- Updated all `getCount` calls to query `posts.post_type` instead of old tables
- Added new metrics for all post types: `win`, `announcement`, `kudos`, `social`, `update`, `executive_message`
- Updated feature usage array with new post type counts
- Changed `feed_reactions` to `post_reactions` table

### 2. ✅ Notifications Page (`src/pages/Notifications.tsx`)
- Added `'post'` to navigation handler for social feed notifications
- Added `'employee'` reference type handling for team profile navigation
- Added new "Posts" filter tab for announcement and post-related notifications
- Filter now includes: All, Kudos, Mentions, Reactions, Leave, Posts

### 3. ✅ Notification Types (`src/types/notification.ts`)
- Added `'post'` to `NotificationReferenceType` union type
- Added `'comment'` to `NotificationReferenceType` for future use

### 4. ✅ Social Feed Service (`src/services/useSocialFeed.ts`)
- Updated ALL notification inserts to use `reference_type: 'post'` instead of `'update'`
- Fixed notification `type` for reactions (changed from 'mention' to 'reaction')
- Updated 12 notification insert locations across:
  - `useCreatePost` (mentions, kudos, office, department, project scopes)
  - `useUpdatePost` (mentions, kudos)
  - `useCreateComment` (mentions, post author)
  - `useTogglePostReaction` (post author)
  - `useToggleCommentReaction` (comment author)

### 5. ✅ Type Definitions (`src/types/feed.ts`)
- Added deprecation warnings to legacy types
- Documented that new types are in `src/services/useSocialFeed.ts`
- Marked `FeedUpdate` and `UpdateType` as `@deprecated`

### 6. ✅ Team Member Profile (`src/pages/TeamMemberProfile.tsx`)
- Removed unused legacy imports (`WinCard`, `FeedReactions`, `Update`)
- Added comment noting the migration to ProfileActivityFeed
- Confirmed ProfileActivityFeed already uses the new posts system

---

## Backwards Compatibility
- Old notifications with `reference_type: 'update'` or `'kudos'` still navigate correctly
- Legacy `FeedReactions` component retained for old data (uses `feed_reactions` table)
- New posts use `PostReactions` component (uses `post_reactions` table)

---

## Not Changed (By Design)
- Legacy dialog components (`PostViewDialog.tsx`, `KudosViewDialog.tsx`, `WinCard.tsx`) retained for backwards compatibility
- `FeedReactions.tsx` component retained for old reaction data
- Notification preference categories unchanged (still semantically valid)
