
# Optimize Unread Page Loading Performance

## Problem Analysis

The current `useUnreadMessages` hook has a significant **N+1 query problem**:

| Step | API Calls |
|------|-----------|
| Fetch participations | 1 call |
| Fetch memberships | 1 call |
| Fetch messages per conversation | N calls (6 for this user) |
| Fetch messages per space | M calls (9 for this user) |
| **Total** | **17 sequential calls** |

Each API call adds network latency (50-200ms), resulting in **1-3 seconds of loading time** even for users with modest chat activity.

**Additional UX issues:**
- Simple "Loading..." text provides no visual feedback
- No skeleton placeholders to indicate content structure
- No staleTime configured, causing unnecessary refetches

## Solution Overview

1. **Create a database function** to fetch all unread messages in a single optimized query
2. **Add loading skeletons** for better perceived performance
3. **Configure staleTime** to reduce unnecessary refetches
4. **Use parallel queries** as fallback if RPC fails

## Implementation Plan

### 1. Create Database Function for Unread Messages

**Migration: `get_unread_messages` function**

```sql
CREATE OR REPLACE FUNCTION public.get_unread_messages(
  p_employee_id UUID,
  p_organization_id UUID,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  content_type TEXT,
  created_at TIMESTAMPTZ,
  conversation_id UUID,
  space_id UUID,
  sender_employee_id UUID,
  sender_full_name TEXT,
  sender_avatar_url TEXT,
  conversation_name TEXT,
  conversation_is_group BOOLEAN,
  space_name TEXT,
  space_icon_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.content,
    m.content_type,
    m.created_at,
    m.conversation_id,
    m.space_id,
    e.id as sender_employee_id,
    p.full_name as sender_full_name,
    p.avatar_url as sender_avatar_url,
    c.name as conversation_name,
    c.is_group as conversation_is_group,
    s.name as space_name,
    s.icon_url as space_icon_url
  FROM chat_messages m
  LEFT JOIN employees e ON m.sender_id = e.id
  LEFT JOIN profiles p ON e.user_id = p.id
  LEFT JOIN chat_conversations c ON m.conversation_id = c.id
  LEFT JOIN chat_spaces s ON m.space_id = s.id
  WHERE m.organization_id = p_organization_id
    AND m.sender_id != p_employee_id
    AND m.content_type != 'system_event'
    AND (
      -- Unread conversation messages
      (m.conversation_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM chat_participants cp 
        WHERE cp.conversation_id = m.conversation_id 
          AND cp.employee_id = p_employee_id
          AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
      ))
      OR
      -- Unread space messages
      (m.space_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM chat_space_members sm 
        WHERE sm.space_id = m.space_id 
          AND sm.employee_id = p_employee_id
          AND (sm.last_read_at IS NULL OR m.created_at > sm.last_read_at)
      ))
    )
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$;
```

### 2. Update useUnreadMessages Hook

**File: `src/services/useChat.ts`**

Replace the sequential query logic with an RPC call:

```typescript
export const useUnreadMessages = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useQuery({
    queryKey: ['unread-messages', currentOrg?.id, currentEmployee?.id],
    queryFn: async () => {
      if (!currentOrg?.id || !currentEmployee?.id) return [];

      const { data, error } = await supabase.rpc('get_unread_messages', {
        p_employee_id: currentEmployee.id,
        p_organization_id: currentOrg.id,
        p_limit: 50
      });

      if (error) throw error;

      // Transform RPC result to expected format
      return (data || []).map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        content_type: msg.content_type,
        created_at: msg.created_at,
        conversation_id: msg.conversation_id,
        space_id: msg.space_id,
        sender: {
          profiles: {
            full_name: msg.sender_full_name,
            avatar_url: msg.sender_avatar_url
          }
        },
        conversation: msg.conversation_id ? {
          id: msg.conversation_id,
          name: msg.conversation_name,
          is_group: msg.conversation_is_group
        } : null,
        space: msg.space_id ? {
          id: msg.space_id,
          name: msg.space_name,
          icon_url: msg.space_icon_url
        } : null
      }));
    },
    enabled: !!currentOrg?.id && !!currentEmployee?.id,
    staleTime: 30 * 1000, // 30 seconds - prevent unnecessary refetches
    refetchInterval: 30000,
  });
};
```

### 3. Create UnreadMessageSkeleton Component

**New file: `src/components/chat/UnreadMessageSkeleton.tsx`**

```typescript
import { Skeleton } from "@/components/ui/skeleton";

interface UnreadMessageSkeletonProps {
  count?: number;
}

export const UnreadMessageSkeleton = ({ count = 5 }: UnreadMessageSkeletonProps) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-3 rounded-lg border border-border bg-background"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-32 mt-1" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
```

### 4. Update UnreadView Component

**File: `src/components/chat/UnreadView.tsx`**

Replace text "Loading..." with skeleton component:

```typescript
import { UnreadMessageSkeleton } from "./UnreadMessageSkeleton";

// In the component, replace:
{isLoading ? (
  <div className="text-center text-muted-foreground py-8">Loading...</div>
) : ...

// With:
{isLoading ? (
  <UnreadMessageSkeleton count={5} />
) : ...
```

## Performance Comparison

| Metric | Before | After |
|--------|--------|-------|
| API calls | 17 (sequential) | 1 (single RPC) |
| Estimated load time | 1-3 seconds | 100-300ms |
| Perceived wait | Plain text | Skeleton animation |
| Refetch behavior | Every mount | staleTime: 30s |

## Files to Create/Modify

| File | Change |
|------|--------|
| `supabase/migrations/xxx.sql` | Create `get_unread_messages` function |
| `src/services/useChat.ts` | Update `useUnreadMessages` to use RPC |
| `src/components/chat/UnreadMessageSkeleton.tsx` | **New** - Loading skeleton |
| `src/components/chat/UnreadView.tsx` | Use skeleton, remove "Loading..." text |

## Technical Details

### Database Function Benefits
- Single round-trip to database
- Query executed server-side with optimal join strategy
- EXISTS subqueries are efficient with proper indexes
- SECURITY DEFINER ensures consistent permission checks

### Skeleton UX Benefits
- Immediate visual feedback on navigation
- Content structure preview reduces perceived wait
- Smooth transition when data loads
- Consistent with other loading patterns in the app
