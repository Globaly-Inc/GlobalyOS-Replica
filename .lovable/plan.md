
# Enable Add Member Feature for Spaces with Auto-Sync

## Overview

Fix the "Add Member" button to be always enabled for space admins, regardless of whether auto-sync is active. This aligns with the source-based membership control system where manually added members coexist with auto-synced members.

## Current Problem

The "+" button to add members is currently **disabled** when a space has `auto_sync_members = true`. This prevents admins from inviting individual team members who don't match the auto-sync criteria (e.g., inviting someone from a different department to a department-synced space).

```tsx
// Current (line 748) - WRONG:
disabled={spaceId ? autoSyncEnabled : false}
```

## Expected Behavior

Per the established system design:
- Auto-sync manages members automatically based on profile criteria (office, department, project)
- Admins can **always** manually invite additional members (tagged with `source = 'manual'`)
- Only manually invited members can be removed by admins
- Auto-synced members cannot be removed manually (they leave when their profile no longer matches)

## Changes

### File: `src/components/chat/ChatRightPanelEnhanced.tsx`

| Line | Change | Description |
|------|--------|-------------|
| 748 | Remove `disabled` prop | Button always enabled for admins |
| 762-765 | Remove tooltip condition | No longer needed since button is always enabled |

**Before:**
```tsx
<Button
  variant="ghost"
  size="icon"
  className="h-6 w-6"
  disabled={spaceId ? autoSyncEnabled : false}
  onClick={...}
>
```

**After:**
```tsx
<Button
  variant="ghost"
  size="icon"
  className="h-6 w-6"
  onClick={...}
>
```

**Before (Tooltip):**
```tsx
{spaceId && autoSyncEnabled && (
  <TooltipContent>
    <p>Disable auto-sync in settings to add members</p>
  </TooltipContent>
)}
```

**After:** Remove this entire conditional block.

## What Already Works

The existing `AddSpaceMembersDialog` component:
- Shows all active employees not already in the space
- Allows multi-select with search
- Adds members with `source = 'manual'` (via `useAddSpaceMembers` hook)
- Posts system messages to the space

No changes needed to the dialog itself.

## Result

After this change:
- Space admins can always click "+" to add members
- New members are tagged as `source = 'manual'`
- These members appear with an "Invited" badge in the member list
- They can be removed by admins (unlike auto-synced members)
