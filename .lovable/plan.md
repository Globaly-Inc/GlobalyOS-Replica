
# System-Wide Online Status Indicator Implementation

## Overview
Add online status indicators (green dots) to team member profile images throughout the GlobalyOS application. This builds on the existing infrastructure:
- `useOnlineStatus` hook for single employee status
- `useTeamPresence` hook for batch employee status
- The `chat_presence` table with real-time subscriptions

The implementation uses a consistent visual pattern: a small green dot positioned at the bottom-right corner of avatars.

---

## Scope of Changes

Based on codebase analysis, the following locations display team member avatars and should show online status:

### Already Implemented (no changes needed)
| Component | Location | Status |
|-----------|----------|--------|
| `ChatSidebar.tsx` | DM list, Favorites | Has online indicators |
| `FavoritesSection.tsx` | Favorited chats | Has online indicators |
| `Layout.tsx` | User profile button | Has online indicator |
| `PostCard.tsx` | Post author avatar | Uses `useOnlineStatus` |
| `KpiOwnersDisplay.tsx` | Individual KPI owner | Uses `useOnlineStatus` |
| `MessageBubble.tsx` | Message avatars | Has online indicators |
| `EmployeeCard.tsx` | Team directory cards | Has `isOnline` prop |

### Needs Implementation

#### High Priority (Core UX)
1. **Team Directory Page** (`src/pages/Team.tsx`)
   - Cards view already passes `isOnline` to `EmployeeCard`
   - Org chart view needs online status in `OrgEmployeeCard`

2. **Team Member Profile** (`src/pages/TeamMemberProfile.tsx`)
   - Main profile avatar header

3. **Chat Components**
   - `NewChatDialog.tsx` - Employee selection list
   - `AddGroupMembersDialog.tsx` - Group member picker
   - `AddSpaceMembersDialog.tsx` - Space member picker
   - `EditGroupChatDialog.tsx` - Participant list
   - `SpaceMembersDialog.tsx` - Space members list
   - `ChatRightPanelEnhanced.tsx` - Members panel avatars
   - `ThreadView.tsx` - Reply author avatars
   - `QuickSwitcher.tsx` - DM conversation avatars
   - `GlobalChatSearch.tsx` - Employee search results
   - `MentionAutocomplete.tsx` - @mention dropdown
   - `InlineSearchResults.tsx` - Search result avatars

4. **Feed/Social Components**
   - `PostComments.tsx` - Comment author avatars
   - `UnifiedFeed.tsx` - If it shows author avatars
   - `SocialFeedComposer.tsx` - User avatar in composer

5. **Wiki Components**
   - `WikiInviteMember.tsx` - Member selector
   - `WikiShareDialog.tsx` - Share member list

6. **Workflow Components**
   - `WorkflowKanbanCard.tsx` - Employee avatar on cards
   - `WorkflowTaskList.tsx` - Assignee avatars
   - `TaskDetailSheet.tsx` - Assignee/approver avatars
   - `ApplicationCard.tsx` - Employee avatar
   - `WorkflowActivityLog.tsx` - Activity actor avatars
   - `AddTaskToWorkflowDialog.tsx` - Employee selector
   - `KnowledgeTransferList.tsx` - Employee avatars

7. **Home Dashboard**
   - `AllPendingLeavesCard.tsx` - Employee avatars
   - `NotCheckedInCard.tsx` - Employee avatars
   - `MyWorkflowTasks.tsx` - Assignee avatars

8. **Dialogs with Employee Avatars**
   - `QuickInviteDialog.tsx` - Employee selector
   - `InviteTeamMemberDialog.tsx` - If it shows existing members
   - `KPITemplatesDialog.tsx` - Employee selector
   - `EditManagerDialog.tsx` - Manager avatar
   - `EditProjectsDialog.tsx` - If it shows team members

9. **Other Components**
   - `AttendanceSettings.tsx` - Manager selector
   - `ProfileActivityFeed.tsx` - Activity actor avatars
   - `ask-ai/AskAIParticipants.tsx` - Session participant avatars

---

## Implementation Strategy

### Option 1: Create a Reusable Component (Recommended)
Create an `AvatarWithStatus` component that wraps the existing Avatar pattern:

**New File: `src/components/ui/avatar-with-status.tsx`**
```typescript
interface AvatarWithStatusProps {
  src?: string | null;
  fallback: string;
  isOnline?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackClassName?: string;
  employeeId?: string; // For auto-fetching status
}

export function AvatarWithStatus({ 
  src, 
  fallback, 
  isOnline, 
  employeeId,
  size = 'md',
  className,
  fallbackClassName
}: AvatarWithStatusProps) {
  // If employeeId provided and isOnline not explicitly set, auto-fetch
  const { isOnline: fetchedOnline } = useOnlineStatus(
    isOnline === undefined ? employeeId : undefined
  );
  const online = isOnline ?? fetchedOnline;
  
  const sizeClasses = {
    xs: { avatar: 'h-6 w-6', dot: 'h-1.5 w-1.5', text: 'text-[9px]' },
    sm: { avatar: 'h-8 w-8', dot: 'h-2 w-2', text: 'text-[10px]' },
    md: { avatar: 'h-10 w-10', dot: 'h-2.5 w-2.5', text: 'text-xs' },
    lg: { avatar: 'h-12 w-12', dot: 'h-3 w-3', text: 'text-sm' },
    xl: { avatar: 'h-16 w-16', dot: 'h-3.5 w-3.5', text: 'text-base' },
  };
  
  return (
    <div className="relative inline-block">
      <Avatar className={cn(sizeClasses[size].avatar, className)}>
        <AvatarImage src={src || undefined} />
        <AvatarFallback className={cn(sizeClasses[size].text, fallbackClassName)}>
          {fallback}
        </AvatarFallback>
      </Avatar>
      {online && (
        <span className={cn(
          "absolute bottom-0 right-0 rounded-full bg-green-500 border-2 border-background",
          sizeClasses[size].dot
        )} />
      )}
    </div>
  );
}
```

### Option 2: Inline Implementation
For components that already have complex avatar rendering, add the status dot inline following the existing pattern:

```tsx
<div className="relative">
  <Avatar className="h-10 w-10">
    <AvatarImage src={employee.avatar_url} />
    <AvatarFallback>{getInitials(employee.name)}</AvatarFallback>
  </Avatar>
  {isOnline && (
    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
  )}
</div>
```

---

## Technical Details

### Existing Hooks to Use

1. **`useOnlineStatus(employeeId)`** - For single employee status with real-time subscription
   - Best for: Profile pages, individual cards, detail views
   - Returns: `{ isOnline: boolean, lastSeenAt: string | null }`

2. **`useTeamPresence(employeeIds[])`** - For batch employee status lookup
   - Best for: Lists, grids, multiple avatars on one screen
   - Returns: `Record<string, boolean>` mapping employee IDs to online status

### Data Source
The online status comes from the `chat_presence` table:
- `is_online`: Boolean flag
- `last_seen_at`: Timestamp of last activity
- Status considered "stale" if `last_seen_at` is >60 seconds ago

### Performance Considerations
- Use `useTeamPresence` for lists (single query for multiple employees)
- Use `useOnlineStatus` for individual profiles (includes real-time subscription)
- Both hooks have appropriate stale times (30 seconds)

---

## Implementation Order

### Phase 1: Core Chat & Profile (Highest Impact)
1. Create `AvatarWithStatus` component
2. `TeamMemberProfile.tsx` - Profile header avatar
3. `NewChatDialog.tsx` - Employee selector
4. `ChatRightPanelEnhanced.tsx` - Member list
5. `ThreadView.tsx` - Reply avatars

### Phase 2: Dialogs & Selectors
6. `AddGroupMembersDialog.tsx`
7. `AddSpaceMembersDialog.tsx`
8. `SpaceMembersDialog.tsx`
9. `EditGroupChatDialog.tsx`
10. `QuickSwitcher.tsx`
11. `MentionAutocomplete.tsx`
12. `GlobalChatSearch.tsx`

### Phase 3: Team & Directory
13. `Team.tsx` - Org chart view `OrgEmployeeCard`
14. `WikiInviteMember.tsx`
15. `WikiShareDialog.tsx`

### Phase 4: Feed & Comments
16. `PostComments.tsx`
17. `ProfileActivityFeed.tsx`

### Phase 5: Workflows
18. `WorkflowKanbanCard.tsx`
19. `WorkflowTaskList.tsx`
20. `TaskDetailSheet.tsx`
21. `ApplicationCard.tsx`
22. `WorkflowActivityLog.tsx`

### Phase 6: Home & Settings
23. `AllPendingLeavesCard.tsx`
24. `NotCheckedInCard.tsx`
25. `AttendanceSettings.tsx`
26. Remaining dialogs

---

## Visual Consistency

All online status indicators should follow this pattern:
- **Color**: `bg-green-500`
- **Shape**: Fully rounded (`rounded-full`)
- **Border**: 2px border matching background (`border-2 border-background` or `border-card`)
- **Position**: Absolute, bottom-right of avatar (`absolute bottom-0 right-0`)
- **Size**: Proportional to avatar size (typically 20-25% of avatar diameter)

| Avatar Size | Dot Size | Classes |
|-------------|----------|---------|
| h-6 w-6 (xs) | 1.5-2px | `h-1.5 w-1.5` or `h-2 w-2` |
| h-8 w-8 (sm) | 2px | `h-2 w-2` |
| h-9-10 w-9-10 (md) | 2.5-3px | `h-2.5 w-2.5` or `h-3 w-3` |
| h-12+ (lg) | 3px | `h-3 w-3` |
| h-16+ (xl) | 3.5-4px | `h-3.5 w-3.5` or `h-4 w-4` |

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/ui/avatar-with-status.tsx` | **Create** | Reusable avatar component with online status |
| `src/pages/TeamMemberProfile.tsx` | Modify | Add status to profile header avatar |
| `src/pages/Team.tsx` | Modify | Add status to OrgEmployeeCard |
| `src/components/chat/NewChatDialog.tsx` | Modify | Add status to employee list |
| `src/components/chat/ChatRightPanelEnhanced.tsx` | Modify | Add status to member avatars |
| `src/components/chat/ThreadView.tsx` | Modify | Add status to reply avatars |
| `src/components/chat/AddGroupMembersDialog.tsx` | Modify | Add status to member picker |
| `src/components/chat/AddSpaceMembersDialog.tsx` | Modify | Add status to member picker |
| `src/components/chat/SpaceMembersDialog.tsx` | Modify | Add status to member list |
| `src/components/chat/EditGroupChatDialog.tsx` | Modify | Add status to participant list |
| `src/components/chat/QuickSwitcher.tsx` | Modify | Add status to DM avatars |
| `src/components/chat/MentionAutocomplete.tsx` | Modify | Add status to mention dropdown |
| `src/components/chat/GlobalChatSearch.tsx` | Modify | Add status to search results |
| `src/components/chat/InlineSearchResults.tsx` | Modify | Add status to result avatars |
| `src/components/feed/PostComments.tsx` | Modify | Add status to comment avatars |
| `src/components/feed/ProfileActivityFeed.tsx` | Modify | Add status to activity avatars |
| `src/components/wiki/WikiInviteMember.tsx` | Modify | Add status to member selector |
| `src/components/wiki/WikiShareDialog.tsx` | Modify | Add status to share list |
| `src/components/workflows/WorkflowKanbanCard.tsx` | Modify | Add status to employee avatar |
| `src/components/workflows/WorkflowTaskList.tsx` | Modify | Add status to assignee avatars |
| `src/components/workflows/TaskDetailSheet.tsx` | Modify | Add status to assignee avatars |
| `src/components/workflows/ApplicationCard.tsx` | Modify | Add status to employee avatar |
| `src/components/workflows/WorkflowActivityLog.tsx` | Modify | Add status to actor avatars |
| `src/components/home/AllPendingLeavesCard.tsx` | Modify | Add status to employee avatars |
| `src/components/home/NotCheckedInCard.tsx` | Modify | Add status to employee avatars |
| `src/components/AttendanceSettings.tsx` | Modify | Add status to manager selector |
| `src/components/dialogs/QuickInviteDialog.tsx` | Modify | Add status to employee selector |
| `src/components/dialogs/KPITemplatesDialog.tsx` | Modify | Add status to employee selector |
| `src/components/ask-ai/AskAIParticipants.tsx` | Modify | Add status to participant avatars |

**Total: ~30 files to modify + 1 new component**

---

## Summary
This implementation will add consistent online status indicators across the entire GlobalyOS platform, providing users with real-time visibility into who is currently active. The approach leverages existing infrastructure (`useOnlineStatus`, `useTeamPresence`, `chat_presence` table) and follows established visual patterns already used in the chat module.
