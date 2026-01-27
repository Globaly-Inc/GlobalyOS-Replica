
# Unread Messages Feature Implementation Plan

## Overview
Add an "Unread" shortcut to the Chat sidebar that displays all unread messages across conversations and spaces. Clicking a message navigates to that specific message and marks it as read. The shortcut includes a pulsing animation when new messages arrive.

---

## Implementation Steps

### 1. Extend Chat Types
**File:** `src/types/chat.ts`

Add 'unread' to the `ChatContextType` union:
```typescript
export type ChatContextType = 'conversation' | 'space' | 'mentions' | 'starred' | 'unread';
```

---

### 2. Add Pulse Animation to Tailwind Config
**File:** `tailwind.config.ts`

Add a pulse keyframe animation for the notification indicator:
```typescript
keyframes: {
  // ... existing keyframes
  "pulse-dot": {
    "0%, 100%": { transform: "scale(1)", opacity: "1" },
    "50%": { transform: "scale(1.2)", opacity: "0.8" },
  },
}
animation: {
  // ... existing animations
  "pulse-dot": "pulse-dot 1.5s ease-in-out infinite",
}
```

---

### 3. Create useUnreadMessages Hook
**File:** `src/services/useChat.ts`

Add a new hook to fetch all unread messages with sender and context details:

```typescript
export const useUnreadMessages = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useQuery({
    queryKey: ['unread-messages', currentOrg?.id, currentEmployee?.id],
    queryFn: async () => {
      if (!currentOrg?.id || !currentEmployee?.id) return [];

      // Step 1: Get all conversation participations with last_read_at
      const { data: participations } = await supabase
        .from('chat_participants')
        .select('conversation_id, last_read_at')
        .eq('employee_id', currentEmployee.id)
        .eq('organization_id', currentOrg.id);

      // Step 2: Get all space memberships with last_read_at  
      const { data: memberships } = await supabase
        .from('chat_space_members')
        .select('space_id, last_read_at')
        .eq('employee_id', currentEmployee.id)
        .eq('organization_id', currentOrg.id);

      const unreadMessages: any[] = [];

      // Step 3: Fetch unread messages from conversations
      for (const p of participations || []) {
        let query = supabase
          .from('chat_messages')
          .select(`
            *,
            employees:sender_id (id, user_id, position, profiles:user_id (full_name, avatar_url)),
            chat_conversations:conversation_id (id, name, is_group)
          `)
          .eq('conversation_id', p.conversation_id)
          .neq('sender_id', currentEmployee.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (p.last_read_at) {
          query = query.gt('created_at', p.last_read_at);
        }

        const { data } = await query;
        if (data) {
          unreadMessages.push(...data.map(msg => ({
            ...msg,
            sender: msg.employees,
            conversation: msg.chat_conversations,
          })));
        }
      }

      // Step 4: Fetch unread messages from spaces
      for (const m of memberships || []) {
        let query = supabase
          .from('chat_messages')
          .select(`
            *,
            employees:sender_id (id, user_id, position, profiles:user_id (full_name, avatar_url)),
            chat_spaces:space_id (id, name, icon_url)
          `)
          .eq('space_id', m.space_id)
          .neq('sender_id', currentEmployee.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (m.last_read_at) {
          query = query.gt('created_at', m.last_read_at);
        }

        const { data } = await query;
        if (data) {
          unreadMessages.push(...data.map(msg => ({
            ...msg,
            sender: msg.employees,
            space: msg.chat_spaces,
          })));
        }
      }

      // Sort by created_at descending (newest first)
      return unreadMessages.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!currentOrg?.id && !!currentEmployee?.id,
    refetchInterval: 30000,
  });
};
```

---

### 4. Create UnreadView Component
**File:** `src/components/chat/UnreadView.tsx` (new file)

Create the main view component following MentionsView/StarredView patterns:

```typescript
import { ArrowLeft, MessageCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUnreadMessages, useMarkAsRead } from "@/services/useChat";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { ActiveChat } from "@/types/chat";
import { useIsMobile } from "@/hooks/use-mobile";

interface UnreadViewProps {
  onNavigateToChat: (chat: ActiveChat, messageId?: string) => void;
  onBack?: () => void;
}

const UnreadView = ({ onNavigateToChat, onBack }: UnreadViewProps) => {
  const { data: messages = [], isLoading } = useUnreadMessages();
  const { mutate: markAsRead } = useMarkAsRead();
  const isMobile = useIsMobile();

  const handleMessageClick = (message: any) => {
    // Mark as read
    if (message.conversation_id) {
      markAsRead({ conversationId: message.conversation_id });
    } else if (message.space_id) {
      markAsRead({ spaceId: message.space_id });
    }

    // Navigate to chat with message highlight
    if (message.conversation_id && message.conversation) {
      onNavigateToChat({
        type: 'conversation',
        id: message.conversation_id,
        name: message.conversation.name || 'Conversation',
        isGroup: message.conversation.is_group
      }, message.id);
    } else if (message.space_id && message.space) {
      onNavigateToChat({
        type: 'space',
        id: message.space_id,
        name: message.space.name
      }, message.id);
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getChatName = (message: any) => {
    if (message.conversation) {
      return message.conversation.name || (message.conversation.is_group ? 'Group Chat' : 'Direct Message');
    }
    if (message.space) {
      return message.space.name;
    }
    return 'Unknown';
  };

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="flex items-center gap-3 px-2 py-4 border-b border-border">
        {isMobile && onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-destructive/10 text-destructive">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Unread</h2>
          <p className="text-sm text-muted-foreground">Messages you haven't read yet</p>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="px-2 py-4 space-y-3">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">Loading...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No unread messages</p>
              <p className="text-sm mt-1">You're all caught up!</p>
            </div>
          ) : (
            messages.map((message: any) => (
              <button
                key={message.id}
                onClick={() => handleMessageClick(message)}
                className={cn(
                  "w-full text-left p-3 rounded-lg border border-border bg-background",
                  "hover:bg-muted transition-colors"
                )}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={message.sender?.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(message.sender?.profiles?.full_name || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {message.sender?.profiles?.full_name || 'Unknown'}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {getChatName(message)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {message.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(message.created_at), 'MMM d, yyyy · h:mm a')}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default UnreadView;
```

---

### 5. Update ChatSidebar
**File:** `src/components/chat/ChatSidebar.tsx`

Add the Unread shortcut button with count badge and pulsing animation:

**Imports to add:**
```typescript
import { MessageCircle } from "lucide-react";
import { useTotalUnreadCount } from "@/services/useChat";
```

**In the Shortcuts section (between line 341-366), add before Mentions:**
```typescript
// Track if we had previous unread to detect new messages
const [prevUnreadCount, setPrevUnreadCount] = useState(0);
const [hasNewMessages, setHasNewMessages] = useState(false);
const totalUnread = useTotalUnreadCount();

// Detect when new messages arrive for pulsing effect
useEffect(() => {
  if (totalUnread > prevUnreadCount && prevUnreadCount > 0) {
    setHasNewMessages(true);
    const timer = setTimeout(() => setHasNewMessages(false), 3000);
    return () => clearTimeout(timer);
  }
  setPrevUnreadCount(totalUnread);
}, [totalUnread, prevUnreadCount]);

// In the shortcuts div:
<button
  onClick={() => onSelectChat({ type: 'unread', id: 'unread', name: 'Unread' })}
  className={cn(
    "flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-sm transition-colors",
    activeChat?.type === 'unread'
      ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
      : "hover:bg-muted/60 text-foreground/80"
  )}
>
  <div className="relative">
    <MessageCircle className="h-4 w-4" />
    {hasNewMessages && totalUnread > 0 && (
      <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive animate-pulse-dot" />
    )}
  </div>
  Unread
  {totalUnread > 0 && (
    <Badge variant="destructive" className="ml-auto h-5 min-w-[20px] px-1.5 text-[10px]">
      {totalUnread > 99 ? '99+' : totalUnread}
    </Badge>
  )}
</button>
```

---

### 6. Update Chat.tsx 
**File:** `src/pages/Chat.tsx`

**Add import:**
```typescript
import UnreadView from "@/components/chat/UnreadView";
```

**Update renderMainContent function:**
```typescript
const renderMainContent = () => {
  if (activeChat?.type === 'unread') {
    return <UnreadView onNavigateToChat={handleSelectChat} />;
  }

  if (activeChat?.type === 'mentions') {
    return <MentionsView onNavigateToChat={handleSelectChat} />;
  }
  // ... rest of existing code
};
```

**Update mobile section (around line 95) to handle 'unread':**
```typescript
} : activeChat.type === 'unread' ? (
  <div className="flex-1 overflow-hidden">
    <UnreadView onNavigateToChat={handleSelectChat} onBack={handleBack} />
  </div>
) : activeChat.type === 'mentions' ? (
```

**Update showRightPanelCondition:**
```typescript
const showRightPanelCondition = activeChat && 
  activeChat.type !== 'mentions' && 
  activeChat.type !== 'starred' && 
  activeChat.type !== 'unread' &&
  !isMobile;
```

---

### 7. Update MobileChatHome
**File:** `src/components/chat/MobileChatHome.tsx`

Add Unread shortcut to mobile home:

**Add imports:**
```typescript
import { MessageCircle } from "lucide-react";
import { useTotalUnreadCount } from "@/services/useChat";
```

**Update the shortcuts section (around line 167-184):**
```typescript
<div className="px-3 py-2 border-b border-border/20">
  <div className="flex gap-2">
    {/* Unread Button */}
    <button
      onClick={() => onSelectChat({ type: 'unread', id: 'unread', name: 'Unread' })}
      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-destructive/10 hover:bg-destructive/15 active:bg-destructive/20 text-destructive text-sm font-medium transition-colors relative"
    >
      <MessageCircle className="h-3.5 w-3.5" />
      Unread
      {totalUnread > 0 && (
        <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-[10px] text-destructive-foreground font-bold flex items-center justify-center">
          {totalUnread > 99 ? '99+' : totalUnread}
        </span>
      )}
    </button>
    {/* Existing Mentions button */}
    <button onClick={() => onSelectChat({ type: 'mentions', id: 'mentions', name: 'Mentions' })} ...>
    {/* Existing Starred button */}
    <button onClick={() => onSelectChat({ type: 'starred', id: 'starred', name: 'Starred' })} ...>
  </div>
</div>
```

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/types/chat.ts` | Modify | Add 'unread' to ChatContextType |
| `tailwind.config.ts` | Modify | Add pulse-dot animation |
| `src/services/useChat.ts` | Modify | Add useUnreadMessages hook |
| `src/components/chat/UnreadView.tsx` | Create | New unread messages view |
| `src/components/chat/ChatSidebar.tsx` | Modify | Add Unread shortcut with badge and pulse |
| `src/pages/Chat.tsx` | Modify | Handle 'unread' view rendering |
| `src/components/chat/MobileChatHome.tsx` | Modify | Add Unread shortcut for mobile |

---

## Technical Details

### Data Flow
1. `useUnreadMessages` fetches messages from all conversations/spaces where `created_at > last_read_at`
2. Messages are sorted by `created_at` descending (newest first)
3. Clicking a message calls `markAsRead` mutation and navigates with `messageId` for highlighting
4. Query invalidation removes the read message from the unread list

### Pulsing Indicator Logic
- Track previous unread count in state
- When new count > previous count, trigger 3-second pulse animation
- Animation is applied to a small dot next to the MessageCircle icon

### Performance Considerations
- Limit each context query to 10 messages to prevent excessive data loading
- Use existing `useTotalUnreadCount` hook for badge count (reuses cached data)
- 30-second refetch interval aligns with existing unread counts polling

### Multi-tenant Isolation
- All queries filter by `organization_id` from current context
- Employee ID from authenticated session, not client input
