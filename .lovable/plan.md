
# Chat Performance Optimization Plan

## Overview

This plan addresses multiple performance bottlenecks causing slow chat page loading and delayed updates. The optimizations focus on reducing database queries, improving caching, consolidating realtime subscriptions, and implementing efficient delta updates.

---

## Critical Issues Identified

| Issue | Impact | Current State | After Optimization |
|-------|--------|---------------|-------------------|
| N+1 queries in useConversations | 21+ DB calls | Sequential async loops | Single optimized query |
| No staleTime configuration | Constant refetching | 0ms stale | 30s-5min based on data type |
| Multiple realtime channels | Memory + CPU overhead | 5-7 channels per view | 1-2 consolidated channels |
| Aggressive query invalidation | Full refetches on every action | invalidateQueries everywhere | Delta cache updates |
| Typing indicator polling | 3s interval queries | Polling fallback | Realtime-only |

---

## Implementation Plan

### Part 1: Fix N+1 Query Problem in useConversations

**File:** `src/services/useChat.ts`

Replace the current implementation with a single optimized query that fetches all data at once:

```typescript
export const useConversations = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useQuery({
    queryKey: ['chat-conversations', currentOrg?.id, currentEmployee?.id],
    queryFn: async () => {
      if (!currentOrg?.id || !currentEmployee?.id) return [];

      // Single query with all needed joins
      const { data, error } = await supabase
        .from('chat_participants')
        .select(`
          conversation_id,
          last_read_at,
          is_muted,
          chat_conversations:conversation_id (
            id,
            organization_id,
            name,
            icon_url,
            is_group,
            created_by,
            created_at,
            updated_at,
            chat_participants (
              id,
              employee_id,
              role,
              employees:employee_id (
                id,
                user_id,
                position,
                profiles:user_id (
                  full_name,
                  avatar_url,
                  email
                )
              )
            )
          )
        `)
        .eq('employee_id', currentEmployee.id)
        .eq('organization_id', currentOrg.id);

      if (error) throw error;

      // Transform and get last messages in a single batch query
      const conversationIds = (data || [])
        .map((item: any) => item.chat_conversations?.id)
        .filter(Boolean);

      // Batch fetch last messages using database function (create if needed)
      const { data: lastMessages } = await supabase
        .rpc('get_last_messages_batch', { 
          conversation_ids: conversationIds 
        });

      const lastMessageMap = new Map(
        (lastMessages || []).map((m: any) => [m.conversation_id, m])
      );

      return (data || []).map((item: any) => {
        const conv = item.chat_conversations;
        return {
          ...conv,
          participants: conv.chat_participants?.map((p: any) => ({
            ...p,
            employee: p.employees
          })),
          last_message: lastMessageMap.get(conv.id),
          last_read_at: item.last_read_at,
          is_muted: item.is_muted
        } as ChatConversation;
      });
    },
    enabled: !!currentOrg?.id && !!currentEmployee?.id,
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
};
```

**Database Function (SQL Migration):**
```sql
CREATE OR REPLACE FUNCTION get_last_messages_batch(conversation_ids uuid[])
RETURNS TABLE (
  conversation_id uuid,
  id uuid,
  content text,
  content_type text,
  created_at timestamptz,
  sender_id uuid
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (cm.conversation_id)
    cm.conversation_id,
    cm.id,
    cm.content,
    cm.content_type,
    cm.created_at,
    cm.sender_id
  FROM chat_messages cm
  WHERE cm.conversation_id = ANY(conversation_ids)
  ORDER BY cm.conversation_id, cm.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

### Part 2: Add Optimal staleTime and gcTime Configuration

**File:** `src/services/useChat.ts`

Add caching configuration to all major queries:

| Query | staleTime | gcTime | Rationale |
|-------|-----------|--------|-----------|
| chat-conversations | 30s | 5min | Updates via realtime |
| chat-spaces | 60s | 5min | Less frequent changes |
| chat-messages | 0 | 5min | Must be fresh, realtime handles updates |
| unread-counts | 10s | 2min | Realtime updates, fallback polling |
| chat-favorites | 60s | 5min | User-initiated changes only |
| typing-users | 0 | 30s | Ephemeral data |

```typescript
// Example for useSpaces
return useQuery({
  queryKey: ['chat-spaces', ...],
  queryFn: async () => { ... },
  staleTime: 60000, // 1 minute
  gcTime: 5 * 60 * 1000, // 5 minutes
});
```

---

### Part 3: Consolidate Realtime Channels

**File:** `src/hooks/useChatRealtime.ts` (New)

Create a single consolidated realtime hook that components share:

```typescript
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';

export const useChatRealtime = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!currentOrg?.id || !currentEmployee?.id) return;

    // Single consolidated channel for all chat-related tables
    const channel = supabase
      .channel(`chat-realtime-${currentOrg.id}`)
      // Messages - delta updates
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `organization_id=eq.${currentOrg.id}`
      }, (payload) => {
        const msg = payload.new;
        // Delta update for specific conversation/space
        queryClient.setQueryData(
          ['chat-messages', msg.conversation_id, msg.space_id],
          (old: any[]) => old ? [...old, msg] : [msg]
        );
        // Update last_message in conversations list
        queryClient.setQueryData(['chat-conversations', currentOrg.id, currentEmployee.id],
          (old: any[]) => old?.map(c => 
            c.id === msg.conversation_id 
              ? { ...c, last_message: msg } 
              : c
          )
        );
        // Increment unread count for others
        if (msg.sender_id !== currentEmployee.id) {
          queryClient.setQueryData(['unread-counts', currentOrg.id], (old: any) => ({
            ...old,
            conversations: {
              ...old?.conversations,
              [msg.conversation_id]: (old?.conversations?.[msg.conversation_id] || 0) + 1
            }
          }));
        }
      })
      // Presence updates
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_presence',
        filter: `organization_id=eq.${currentOrg.id}`
      }, (payload) => {
        queryClient.setQueryData(['online-presence', currentOrg.id], (old: any[]) => {
          if (!old) return [payload.new];
          const filtered = old.filter(p => p.employee_id !== payload.new?.employee_id);
          return payload.eventType === 'DELETE' ? filtered : [...filtered, payload.new];
        });
        queryClient.invalidateQueries({ queryKey: ['typing-users'] });
      })
      // Reactions - delta updates
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_message_reactions',
        filter: `organization_id=eq.${currentOrg.id}`
      }, () => {
        // Reactions are complex, invalidate is acceptable
        queryClient.invalidateQueries({ queryKey: ['chat-reactions'] });
      })
      // Spaces and members
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_spaces',
        filter: `organization_id=eq.${currentOrg.id}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['chat-spaces'] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_space_members',
        filter: `organization_id=eq.${currentOrg.id}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['chat-space-members'] });
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrg?.id, currentEmployee?.id, queryClient]);
};
```

**Update Chat.tsx to use consolidated realtime:**
```typescript
const Chat = () => {
  useChatRealtime(); // Single hook for all realtime
  // ... rest of component
};
```

**Remove redundant channel subscriptions from:**
- `ChatSidebar.tsx` (lines 136-243)
- `ConversationView.tsx` (lines 298-564)
- `ChatHeader.tsx` (lines 464-487)

---

### Part 4: Replace Invalidations with Delta Updates

**File:** `src/services/useChat.ts`

Update mutation hooks to use optimistic/delta updates instead of full invalidations:

```typescript
// useSendMessage - remove invalidation, rely on realtime
onSettled: (data, error, variables) => {
  if (data && !error) {
    // Replace temp message with real one in cache
    queryClient.setQueryData<ChatMessage[]>(
      ['chat-messages', variables.conversationId, variables.spaceId],
      (old) => old?.map(m => 
        m.id.startsWith('temp-') && m.content === variables.content 
          ? { ...m, id: data.id } 
          : m
      ) || []
    );
    // DO NOT invalidate conversations/spaces - realtime handles it
  }
}

// useMarkAsRead - already has optimistic update, remove onSettled invalidation
onSettled: () => {
  // Remove these - optimistic update already handled
  // queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
  // queryClient.invalidateQueries({ queryKey: ['chat-spaces'] });
}
```

---

### Part 5: Remove Typing Indicator Polling

**File:** `src/services/useChat.ts`

Remove the 3-second polling interval from `useTypingUsers`:

```typescript
export const useTypingUsers = (...) => {
  return useQuery({
    queryKey: ['typing-users', conversationId, spaceId],
    queryFn: async () => { ... },
    enabled: (!!conversationId || !!spaceId) && !!currentEmployee?.id,
    // REMOVE: refetchInterval: 3000,
    staleTime: 5000, // Rely on realtime, allow 5s stale
  });
};
```

---

### Part 6: Lazy Load Right Panel and Thread View

**File:** `src/pages/Chat.tsx`

Use React.lazy for less critical components:

```typescript
import { lazy, Suspense } from 'react';

const ChatRightPanelEnhanced = lazy(() => import('@/components/chat/ChatRightPanelEnhanced'));
const ThreadView = lazy(() => import('@/components/chat/ThreadView'));

// In render:
{showRightPanelCondition && (
  <Suspense fallback={<div className="w-80 animate-pulse bg-muted" />}>
    {activeThreadMessage ? (
      <ThreadView ... />
    ) : (
      <ChatRightPanelEnhanced ... />
    )}
  </Suspense>
)}
```

---

### Part 7: Add Loading Skeletons for Perceived Performance

**File:** `src/components/chat/ChatSidebar.tsx`

Improve loading skeleton to match actual content layout:

```typescript
{loadingConversations ? (
  <div className="space-y-1 px-2">
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} className="flex items-center gap-2.5 py-1.5">
        <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
        <div className="flex-1 h-4 bg-muted rounded animate-pulse" />
      </div>
    ))}
  </div>
) : ...}
```

---

## Summary of Changes

| File | Type | Description |
|------|------|-------------|
| `src/services/useChat.ts` | Modify | Fix N+1 query, add staleTime, remove polling, delta updates |
| `src/hooks/useChatRealtime.ts` | Create | Consolidated realtime subscription hook |
| `src/pages/Chat.tsx` | Modify | Use consolidated realtime, lazy load panels |
| `src/components/chat/ChatSidebar.tsx` | Modify | Remove redundant channels, improve skeletons |
| `src/components/chat/ConversationView.tsx` | Modify | Remove redundant channels |
| `src/components/chat/ChatHeader.tsx` | Modify | Remove redundant channels |
| SQL Migration | Create | Add `get_last_messages_batch` function |

---

## Expected Performance Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Initial load DB calls | 21+ | 2-3 | ~90% reduction |
| Realtime channels | 5-7 | 1-2 | ~80% reduction |
| Cache hit rate | Low | High | Fewer refetches |
| Time to interactive | 2-3s | <500ms | ~80% faster |
| Message send latency | Visible delay | Instant | Optimistic updates |

---

## Technical Notes

- **React Query staleTime:** Data considered fresh for X ms; prevents refetches
- **gcTime (garbage collection):** How long inactive data stays in cache
- **Delta updates:** Modify cache directly instead of refetching entire dataset
- **Consolidated channels:** Supabase recommends 1-2 channels per client for performance
- **Lazy loading:** Reduces initial bundle size and parse time
