

# Add Online Status to Right Panel Members List

## Problem Identified
The `ChatRightPanelEnhanced.tsx` component displays member avatars in the Members section (lines 744-749) without online status indicators. The component is missing:
1. Import of `useTeamPresence` hook
2. Fetching online status for member employee IDs
3. The green dot visual indicator on avatars

## Current Code (lines 744-749)
```tsx
<Avatar className="h-7 w-7">
  <AvatarImage src={profile?.avatar_url || undefined} />
  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
    {getInitials(profile?.full_name || "U")}
  </AvatarFallback>
</Avatar>
```

## Solution

### Step 1: Add Import
Add the `useTeamPresence` hook import from `useTeamData.ts`:
```tsx
import { useTeamPresence } from "@/services/useTeamData";
```

### Step 2: Extract Member IDs and Fetch Status
After the existing `spaceMemberIds` extraction, use the hook to get online statuses:
```tsx
// Already exists for exempt IDs
const spaceMemberIds = spaceMembers.map(m => m.employee_id);

// Get all member IDs for online status (both space and group)
const allMemberIds = members.map((m: any) => m.employee_id);
const { data: onlineStatuses = {} } = useTeamPresence(allMemberIds);
```

### Step 3: Update Avatar Rendering (lines 744-749)
Wrap the Avatar in a relative container and add the green dot:
```tsx
{(() => {
  const isOnline = onlineStatuses[member.employee_id];
  return (
    <div className="relative">
      <Avatar className="h-7 w-7">
        <AvatarImage src={profile?.avatar_url || undefined} />
        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
          {getInitials(profile?.full_name || "U")}
        </AvatarFallback>
      </Avatar>
      {isOnline && (
        <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 border-2 border-background" />
      )}
    </div>
  );
})()}
```

## Files to Modify
| File | Change |
|------|--------|
| `src/components/chat/ChatRightPanelEnhanced.tsx` | Add `useTeamPresence` import, extract member IDs, add online dot to member avatars |

## Visual Result
After implementation, each member in the right panel will show:
- Their profile picture
- A small green dot at bottom-right when they are online
- Consistent with other parts of the app (message bubbles, chat sidebar, etc.)

