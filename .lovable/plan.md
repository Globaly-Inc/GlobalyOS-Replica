

## Add Online Status Dot to Team Member Profile Avatar

The main profile avatar on `TeamMemberProfile.tsx` (the large h-28 avatar at line 730) does not show an online status indicator, unlike other places in the app (EmployeeCard, WorkflowKanbanCard, PostCard, etc.).

### Change

**File: `src/pages/TeamMemberProfile.tsx`**

1. Import `useOnlineStatus` from `@/hooks/useOnlineStatus`
2. Call `useOnlineStatus(employee?.id)` to get the `isOnline` flag
3. Add a green dot overlay on the avatar (positioned bottom-left or top-right to avoid conflicting with the existing edit button at bottom-right), matching the pattern used elsewhere:
   ```tsx
   <div className="group relative flex items-center">
     <div className="relative">
       <Avatar className="h-28 w-28 border-4 border-primary/10">
         ...
       </Avatar>
       {isOnline && (
         <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-green-500 border-2 border-card" />
       )}
     </div>
     {/* existing edit button */}
   </div>
   ```

This is a small, isolated change — one file, three additions (import, hook call, dot element).

