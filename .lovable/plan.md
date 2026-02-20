

# Gmail Integration + Google Meet Links

## Overview
This plan adds three features:
1. **Gmail as an inbox channel** -- full two-way sync (read, send, reply) using the Google Gmail API
2. **Google Meet link button in the Inbox composer** -- generates a Meet link and inserts it into the message
3. **Google Meet link button in Team Chat composer** -- generates a Meet link, sends it in the chat, and opens Meet in a new tab. Meet links render as rich cards.

---

## Phase 1: Google OAuth Scope Expansion + Gmail Channel Card

### What changes
- **Extend the existing Google Calendar OAuth flow** (`google-calendar-auth` edge function) to request additional Gmail scopes (`gmail.readonly`, `gmail.send`, `gmail.modify`) alongside the existing Calendar scopes. This avoids making the user connect a second Google account.
- **Add "Gmail" to the Channels page** as a new available channel type alongside the existing ones (WhatsApp, Telegram, etc.). Instead of credential fields, the Connect button triggers the expanded Google OAuth flow.
- **Update `InboxChannelType`** to include `'gmail'` and add Gmail to `CHANNEL_META`.

### Files affected
- `src/types/inbox.ts` -- add `'gmail'` to `InboxChannelType`, add to `CHANNEL_META`
- `src/components/inbox/ChannelBadge.tsx` -- add Gmail icon mapping
- `src/pages/crm/inbox/InboxChannelsPage.tsx` -- add Gmail to `availableChannels`, wire Connect button to Google OAuth
- `supabase/functions/google-calendar-auth/index.ts` -- expand `SCOPES` to include Gmail scopes
- `src/components/inbox/ConnectChannelDialog.tsx` -- add Gmail-specific OAuth flow (reuse Google Calendar OAuth initiate)

---

## Phase 2: Google Meet Link Button in Inbox Composer

### What changes
- **Add a "Meet" button** to the Inbox composer toolbar (next to the AI Draft and Attach buttons).
- Clicking it calls the existing `google-calendar-proxy` edge function to create a Google Calendar event with `conferenceData` (Google Meet), then extracts the Meet link and inserts it into the message text.
- **New edge function action** `create-meet` added to `google-calendar-proxy` that creates a quick event with auto-generated conferenceData and returns the Meet link.

### Files affected
- `supabase/functions/google-calendar-proxy/index.ts` -- add `create-meet` action that creates a Calendar event with conferenceDataVersion=1
- `src/components/inbox/InboxComposer.tsx` -- add Meet button, call edge function, insert link into text
- `src/hooks/useInbox.ts` -- add `useCreateMeetLink` mutation hook

---

## Phase 3: Google Meet in Team Chat Composer

### What changes
- **Add a "Meet" button** to the Team Chat `MessageComposer` bottom action bar (in the attachments popover or as a standalone icon).
- Clicking it:
  1. Calls the same `create-meet` action on `google-calendar-proxy`
  2. Inserts the Meet link as a message
  3. Opens the Meet link in a new tab
- **Rich Meet card rendering**: In `MessageBubble` / `RichTextMessage`, detect Google Meet URLs (`meet.google.com/xxx-xxx-xxx`) and render them as a styled card with a "Join Meeting" button, the meeting link, and a video icon.

### Files affected
- `src/components/chat/MessageComposer.tsx` -- add Meet button to bottom action bar
- `src/components/chat/MessageBubble.tsx` or `src/components/chat/RichTextMessage.tsx` -- add Meet link card renderer
- `src/hooks/useGoogleMeet.ts` (new) -- shared hook for creating Meet links, used by both Inbox and Chat composers

---

## Phase 4: Gmail Two-Way Sync (Backend)

### What changes
- **New database tables** via migration:
  - `inbox_gmail_threads` -- maps Gmail thread IDs to inbox conversations
  - Extend `inbox_messages` to store Gmail message IDs for reply threading
- **New edge function** `gmail-sync` that:
  - Pulls recent emails from Gmail API using the stored OAuth tokens
  - Creates/updates `inbox_conversations` and `inbox_messages`
  - Handles incremental sync via Gmail history ID
- **New edge function** `gmail-send` that:
  - Sends emails via Gmail API (compose new or reply to thread)
  - Updates delivery status
- **Wire `inbox-send`** to route Gmail channel messages through `gmail-send`
- **Cron job** for periodic Gmail sync (every 2 minutes)

### Database migration
```text
inbox_gmail_sync_state
  - id (uuid, PK)
  - organization_id (uuid, FK)
  - user_id (uuid)
  - gmail_history_id (text)
  - last_synced_at (timestamptz)
  - created_at / updated_at

inbox_gmail_thread_map
  - id (uuid, PK)
  - organization_id (uuid, FK)
  - conversation_id (uuid, FK -> inbox_conversations)
  - gmail_thread_id (text)
  - gmail_message_ids (text[])
```

### Files affected
- Database migration (new tables + RLS policies)
- `supabase/functions/gmail-sync/index.ts` (new)
- `supabase/functions/gmail-send/index.ts` (new)
- `supabase/functions/inbox-send/index.ts` -- add Gmail routing
- `supabase/config.toml` -- add new function entries with `verify_jwt = false`

---

## Phase 5: Gmail Conversation UI

### What changes
- Gmail conversations appear in the existing `InboxConversationList` with a Gmail badge
- The `InboxThread` component renders email messages with subject, from/to headers, and HTML body
- Reply/compose in the `InboxComposer` sends via the `gmail-send` edge function
- Contact panel shows the Gmail contact's email and links to CRM contact if matched

### Files affected
- `src/components/inbox/InboxThread.tsx` -- add email message rendering (subject line, HTML body)
- `src/components/inbox/ConversationCard.tsx` -- handle Gmail conversations display
- `src/components/inbox/InboxContactPanel.tsx` -- show email-specific contact info

---

## Technical Notes

- **No new secrets needed**: Gmail uses the same `GOOGLE_CALENDAR_CLIENT_ID` and `GOOGLE_CALENDAR_CLIENT_SECRET` already configured. The OAuth scopes just expand.
- **Token storage**: Gmail tokens are stored in the existing `scheduler_integration_settings` table (same row as Calendar tokens, since it's the same Google account).
- **Tenant isolation**: All Gmail data is scoped by `organization_id` with RLS policies. Gmail sync only processes emails for the authenticated user's org.
- **Rate limits**: Gmail API allows ~250 quota units/second. The sync function batches requests and uses incremental history sync to stay within limits.

---

## Implementation Order
1. Phase 1 (OAuth + Channel card) -- foundation
2. Phase 2 (Meet in Inbox) -- quick win, uses existing infra
3. Phase 3 (Meet in Chat) -- extends Phase 2 hook
4. Phase 4 (Gmail backend) -- heaviest work
5. Phase 5 (Gmail UI) -- renders the synced data

