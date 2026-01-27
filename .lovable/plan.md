
# Add System Event Logs in Chat Conversations

## Overview

Add activity logs that appear inline with chat messages, showing events like member additions, removals, role changes, and departures. These will display as centered, styled system messages similar to date separators.

---

## Visual Design

```text
+------------------------------------------------------------------+
| ─────────────── Today ─────────────────                          |
|                                                                  |
| [Avatar] Amit:  Hello everyone!                    10:30 AM      |
|                                                                  |
|          ⚙️ Sarah Smith was added by Amit Ranjitkar              |
|                                                                  |
| [Avatar] Sarah: Thanks for adding me!              10:35 AM      |
|                                                                  |
|          👑 Sarah Smith was made an admin                         |
|                                                                  |
|          🚪 John Doe left the group                               |
|                                                                  |
|          ❌ Mike was removed by Amit Ranjitkar                    |
|                                                                  |
+------------------------------------------------------------------+
```

**Event Types:**
- `member_added` - "Sarah Smith was added by Amit Ranjitkar"
- `member_removed` - "John Doe was removed by Amit Ranjitkar"
- `member_left` - "John Doe left the group"
- `admin_added` - "Sarah Smith was made an admin"
- `admin_removed` - "Sarah Smith is no longer an admin"

---

## Database Schema Changes

### 1. Add `system_event` content type to chat_messages

The `content_type` column already exists - we'll add a new value `'system_event'`.

### 2. Add `system_event_data` JSONB column for event metadata

```sql
ALTER TABLE chat_messages 
ADD COLUMN system_event_data JSONB DEFAULT NULL;
```

**Event Data Structure:**
```typescript
interface SystemEventData {
  event_type: 'member_added' | 'member_removed' | 'member_left' | 'admin_added' | 'admin_removed';
  target_employee_id: string;
  target_name: string;
  actor_employee_id?: string;  // Who performed the action
  actor_name?: string;
}
```

---

## TypeScript Type Updates

### File: `src/types/chat.ts`

```typescript
// Add new event data type
export interface SystemEventData {
  event_type: 'member_added' | 'member_removed' | 'member_left' | 'admin_added' | 'admin_removed';
  target_employee_id: string;
  target_name: string;
  actor_employee_id?: string;
  actor_name?: string;
}

// Update ChatMessage interface
export interface ChatMessage {
  // ... existing fields
  content_type: 'text' | 'file' | 'image' | 'call_log' | 'system_event';  // Add system_event
  system_event_data?: SystemEventData;  // Add new field
}
```

---

## New Component: SystemEventMessage

### File: `src/components/chat/SystemEventMessage.tsx`

A centered, styled component that displays system events:

```typescript
interface SystemEventMessageProps {
  eventData: SystemEventData;
  timestamp: string;
}

const SystemEventMessage = ({ eventData, timestamp }: SystemEventMessageProps) => {
  // Returns centered message with appropriate icon
  // - UserPlus for member_added
  // - UserMinus for member_removed
  // - LogOut for member_left
  // - Crown for admin_added/removed
};
```

**Styling:**
- Centered text with muted styling
- Small icon prefix matching event type
- Subtle background (similar to date separators)
- Timestamp on hover or inline

---

## Service Hook Updates

### File: `src/services/useChat.ts`

Update mutation hooks to insert system event messages after performing their actions:

### 1. `useAddGroupMembers` - Insert "member_added" event

```typescript
// After inserting members, create system event message
for (const empId of employeeIds) {
  const { data: emp } = await supabase
    .from('employees')
    .select('profiles:user_id(full_name)')
    .eq('id', empId)
    .single();

  await supabase.from('chat_messages').insert({
    organization_id: currentOrg.id,
    conversation_id: conversationId,
    sender_id: currentEmployee.id,
    content: `${emp?.profiles?.full_name} was added`,
    content_type: 'system_event',
    system_event_data: {
      event_type: 'member_added',
      target_employee_id: empId,
      target_name: emp?.profiles?.full_name || 'Unknown',
      actor_employee_id: currentEmployee.id,
      actor_name: currentEmployee.profiles?.full_name
    }
  });
}
```

### 2. `useRemoveGroupMember` - Insert "member_removed" event

### 3. `useLeaveConversation` - Insert "member_left" event

### 4. `useUpdateGroupMemberRole` - Insert "admin_added" or "admin_removed" event

---

## UI Updates

### File: `src/components/chat/ConversationView.tsx`

Update message rendering to handle system events:

```typescript
{dateMessages.map((message, index) => {
  // Check if this is a system event
  if (message.content_type === 'system_event') {
    return (
      <SystemEventMessage
        key={message.id}
        eventData={message.system_event_data!}
        timestamp={message.created_at}
      />
    );
  }

  // Regular message rendering...
  return (
    <MessageBubble ... />
  );
})}
```

### Update `shouldGroupMessages` function

System events should break message grouping:

```typescript
const shouldGroupMessages = (currentMsg: ChatMessage, prevMsg: ChatMessage | null): boolean => {
  if (!prevMsg) return false;
  if (currentMsg.content_type === 'system_event' || prevMsg.content_type === 'system_event') return false;
  // ... rest of logic
};
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| Database migration | Create | Add `system_event_data` JSONB column |
| `src/types/chat.ts` | Modify | Add `SystemEventData` interface, update `content_type` |
| `src/components/chat/SystemEventMessage.tsx` | Create | New component for rendering events |
| `src/services/useChat.ts` | Modify | Add event logging to member management hooks |
| `src/components/chat/ConversationView.tsx` | Modify | Handle `system_event` content type in rendering |

---

## Technical Details

### Event Icons Mapping
```typescript
const eventIcons = {
  member_added: UserPlus,
  member_removed: UserMinus,
  member_left: LogOut,
  admin_added: Crown,
  admin_removed: ShieldOff,
};
```

### Message Text Templates
```typescript
const getEventText = (data: SystemEventData) => {
  switch (data.event_type) {
    case 'member_added':
      return `${data.target_name} was added by ${data.actor_name}`;
    case 'member_removed':
      return `${data.target_name} was removed by ${data.actor_name}`;
    case 'member_left':
      return `${data.target_name} left the group`;
    case 'admin_added':
      return `${data.target_name} was made an admin`;
    case 'admin_removed':
      return `${data.target_name} is no longer an admin`;
  }
};
```

---

## Security Considerations

1. **RLS Policies**: System event messages follow the same RLS as regular messages - only conversation participants can see them

2. **Sender ID**: System events use the actor (person performing action) as `sender_id` to maintain data integrity

3. **No Editing/Deletion**: System events should not be editable or deletable - handled in MessageBubble by checking `content_type`
