
# Chat & System Notification System - Audit Report & Improvement Plan

## Audit Summary

I conducted a comprehensive review of the Chat and System Notification features covering:

### Components Audited
- **Chat**: ConversationView.tsx (1,251 lines), ChatSidebar.tsx (656 lines), MessageComposer.tsx (776 lines), UnreadView.tsx
- **Notifications**: Notifications.tsx (550 lines), useNotifications.ts, useNotificationPreferences.tsx, useChatNotificationPreferences.tsx
- **Push Notifications**: usePushNotifications.tsx, send-push-notification edge function, send-chat-push-notification edge function
- **Services**: useChat.ts (2,456 lines), useNotificationSound.tsx
- **Testing**: useChat.test.ts, useNotifications.test.ts

---

## What's Working Well

| Feature | Status | Notes |
|---------|--------|-------|
| Real-time messaging | Working | Delta sync with optimistic UI updates |
| Push notifications (system + chat) | Working | RFC 8291/8292 compliant VAPID keys, auto-cleanup of expired subscriptions |
| Message reactions & pinning | Working | Participants can pin messages via proper RLS |
| Typing indicators | Working | Real-time presence updates |
| Unread tracking | Working | Optimized RPC function `get_unread_messages` |
| Mentions (@user, @everyone) | Working | Properly disabled in DMs |
| Notification sound preferences | Working | 10 sound types, quiet hours, volume control |
| Multi-tenant isolation | Working | All chat tables use organization_id scoping |
| File attachments | Working | 50MB limit, proper type validation |
| Message search | Working | Global search with inline dropdown |
| Favorites with drag-and-drop | Working | Persisted sort_order in database |

---

## Issues Found

### Critical Issues

| Issue | Impact | Component |
|-------|--------|-----------|
| **No unit tests for notification hooks** | Low test coverage for usePushNotifications, useChatNotificationPreferences | Missing test files |
| **RLS "Always True" policies detected** | 6 policies flagged by linter | Database security |

### Medium Priority Issues

| Issue | Impact | Component |
|-------|--------|-----------|
| **useNotifications service lacks optimistic UI** | Slight delay when marking as read | useNotifications.ts |
| **No skeleton loading in ConversationView header** | Shows nothing while loading participant info | ConversationView.tsx |
| **Missing error boundary in chat components** | Chat crashes could break entire page | Chat components |
| **Notification preferences stored only in localStorage** | Preferences lost when switching devices | useNotificationPreferences.tsx |

### Low Priority / UX Improvements

| Issue | Impact | Component |
|-------|--------|-----------|
| No keyboard shortcuts in notification list | Slower workflow | Notifications.tsx |
| Missing "connection lost" indicator | User confusion during offline | Chat components |
| Test notification could show better feedback | UX polish | Notifications.tsx |

---

## Implementation Plan

### Phase 1: Add Unit Tests for Notification Hooks

Create test file: `src/test/hooks/useNotificationPreferences.test.ts`

Tests to cover:
- Sound preference storage and retrieval
- Quiet hours calculation (including overnight)
- Notification type enable/disable logic
- Reset to defaults functionality

Create test file: `src/test/hooks/usePushNotifications.test.ts`

Tests to cover:
- VAPID key fetching
- Subscription state management
- Base64 URL conversion utilities

### Phase 2: Add Optimistic UI to Notifications

Update `src/services/useNotifications.ts`:
- Add optimistic update to `useMarkNotificationRead` mutation
- Add optimistic update to `useMarkAllNotificationsRead` mutation
- This provides instant feedback when marking notifications as read

### Phase 3: Add Keyboard Shortcuts to Notifications Page

Update `src/pages/Notifications.tsx`:
- Add arrow key navigation (j/k or ↑/↓) to move between notifications
- Add Enter key to open/navigate to the notification's reference
- Add 'm' key to mark focused notification as read
- Add visual focus ring indicator

### Phase 4: Add Connection Status Indicator

Create `src/components/chat/ConnectionStatus.tsx`:
- Monitor Supabase realtime connection status
- Show subtle indicator when disconnected
- Auto-reconnect with retry logic

Update chat components to show connection status.

---

## Files to Create/Modify

| File | Action | Priority | Changes |
|------|--------|----------|---------|
| `src/test/hooks/useNotificationPreferences.test.ts` | Create | High | Add unit tests for preferences hook |
| `src/test/hooks/usePushNotifications.test.ts` | Create | High | Add unit tests for push notifications |
| `src/services/useNotifications.ts` | Modify | Medium | Add optimistic UI for mark as read |
| `src/pages/Notifications.tsx` | Modify | Low | Add keyboard navigation |
| `src/components/chat/ConnectionStatus.tsx` | Create | Low | Network status indicator |

---

## Security Observations

### RLS Policies - Properly Configured

Chat tables have comprehensive RLS policies:
- `chat_messages`: Scoped to conversation/space participants, sender can edit/delete own messages
- `chat_participants`: Group admins can manage, users can leave
- `chat_spaces`: Admin management with membership checks
- `notifications`: Users can only view/update/delete their own

### Edge Functions - Secure

- `send-push-notification`: Uses service role key, validates user_id
- `send-chat-push-notification`: Respects mute settings, filters recipients properly
- Both handle expired subscriptions automatically

### Linter Warnings

The 6 "Always True" RLS policies flagged by the linter appear to be on tables outside the core chat/notification system. These should be reviewed separately.

---

## Technical Notes

### Current Architecture

```text
User sends message
       │
       ▼
MessageComposer (optimistic UI)
       │
       ▼
Supabase INSERT (with RLS check)
       │
       ▼
Realtime broadcasts to participants
       │
       ├─► ConversationView (delta sync into cache)
       │
       └─► send-chat-push-notification (for offline users)
               │
               ▼
           Push to all subscribed devices
```

### Query Performance

- Conversations use batch fetching for last messages via RPC
- Messages use pagination (50 per page) with infinite scroll
- Unread counts cached with 30-second staleTime
- Presence updates optimized to only track visible users

---

## Expected Outcome

After implementing these improvements:
1. Notification hooks have comprehensive unit test coverage
2. Marking notifications as read feels instant with optimistic UI
3. Power users can navigate notifications faster with keyboard shortcuts
4. Users are aware when their connection is unstable
5. Overall system reliability and maintainability improved
