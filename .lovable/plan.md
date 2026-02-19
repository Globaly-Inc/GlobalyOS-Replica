

# Omni-Channel Inbox + AI Responder -- Full Implementation Plan

## Overview

Replace the existing WhatsApp-only messaging module with a unified Omni-Channel Inbox that supports WhatsApp, Telegram, Messenger, Instagram, TikTok (where APIs permit), and future connectors. Includes an AI Auto-Responder powered by Lovable AI with RAG-based knowledge retrieval from the GlobalyOS Wiki.

The reference screenshot shows a Linear-style three-pane inbox layout (list / thread / details) -- the new Inbox will follow this pattern closely.

---

## Phase Breakdown

Due to the scale of this PRD (dozens of new tables, multiple edge functions, 15+ UI pages, AI integration), the implementation will be split into **6 sequential build phases**. Each phase is self-contained and testable.

---

## Phase 1: Unified Data Model + Migration

### Database Changes

**New tables:**

- `inbox_channels` -- connected channel configurations (type: whatsapp/telegram/messenger/instagram/tiktok, auth credentials as encrypted JSONB, webhook status, team assignments)
- `inbox_contacts` -- unified contact store with multi-channel identifiers (phone, email, handles), consent tracking per channel, CRM link
- `inbox_conversations` -- canonical conversations with channel_type, channel_id, contact_id, status (open/pending/snoozed/closed), priority, tags, assignee, team, SLA fields, channel_thread_ref
- `inbox_messages` -- canonical messages with conversation_id, direction, type (text/media/template/system/note), content JSONB, provider_message_id, delivery_status, created_by (agent/ai/system)
- `inbox_macros` -- quick reply templates with channel compatibility flags and variable placeholders
- `inbox_ai_events` -- AI audit log (event_type, inputs, outputs, confidence, citations, model_version, reviewer_feedback)
- `inbox_webhook_events` -- raw webhook payload storage with idempotency_key, processed flag, for debugging and replay

**New enums:**
- `inbox_channel_type`: whatsapp, telegram, messenger, instagram, tiktok, email
- `inbox_conversation_status`: open, pending, snoozed, closed
- `inbox_message_direction`: inbound, outbound
- `inbox_message_type`: text, image, video, document, audio, template, interactive, system, note
- `inbox_delivery_status`: pending, sent, delivered, read, failed

**Migration from old WhatsApp tables:**
- SQL migration script copies data from `wa_contacts` -> `inbox_contacts`, `wa_conversations` -> `inbox_conversations`, `wa_messages` -> `inbox_messages`
- Old `wa_*` tables are kept read-only (not dropped) for safety
- `wa_accounts` data maps into `inbox_channels` with type='whatsapp'

**Feature flags:**
- Add `omnichannel_inbox` and `ai_responder` to the `FeatureName` type and `organization_features`
- Add `whatsapp_old_inbox_disabled` flag (defaults to true for new orgs)

**RLS policies:** All new tables get organization_id-scoped RLS policies.

### Routing Changes
- Old `/crm/whatsapp/inbox` route redirects to `/crm/inbox?channel=whatsapp`
- Old WhatsApp sub-routes (templates, campaigns, automations, flows, contacts, settings) remain accessible but are re-mounted under the new Inbox settings area where applicable

---

## Phase 2: Connector Framework + WhatsApp Connector

### Backend (Edge Functions)

**Connector interface pattern** (implemented as a shared module in `supabase/functions/_shared/connectors/`):

```text
BaseConnector
  |-- verifyWebhook(req) -> boolean
  |-- handleInboundEvent(payload) -> CanonicalMessage[]
  |-- sendMessage(conversation, message) -> ProviderResult
  |-- mapToCanonical(providerMsg) -> CanonicalMessage
```

**Edge functions:**
- `inbox-webhook` -- unified webhook endpoint; routes to correct connector by channel type; stores raw event in `inbox_webhook_events` with idempotency key; processes into canonical format
- `inbox-send` -- unified send endpoint; looks up channel connector; applies compliance rules (WhatsApp 24h window, opt-in, frequency cap); calls connector's `sendMessage()`; stores outbound message with delivery status

**WhatsApp connector:**
- Migrates logic from existing `wa-webhook` and `wa-send` into the new connector pattern
- Preserves all compliance checks (24h window, template requirement, opt-in, frequency cap, audit logging)

### Channel Admin API
- `inbox-channel-connect` -- validates credentials, stores encrypted config, sets up webhook URL
- `inbox-channel-health` -- returns last webhook event timestamp, error count, connection status

---

## Phase 3: Inbox UI (Core)

### Layout (three-pane, inspired by reference screenshot)

```text
+------------------+---------------------------+------------------+
| Conversation     |   Conversation Thread     |  Contact Profile |
| List (320px)     |   (flex-1)                |  Panel (300px)   |
|                  |                           |                  |
| - Search         |  - Header (contact info,  |  - Avatar/Name   |
| - Filter tabs    |    channel badge, SLA)    |  - Identifiers   |
|   (All/Open/     |  - Message bubbles        |  - Tags          |
|    Pending/      |  - System events          |  - Consent       |
|    Snoozed)      |  - Internal notes         |  - Activity log  |
| - Channel filter |  - Typing indicator       |  - CRM link      |
| - Assignee       |  - Composer:              |  - Timeline      |
|   filter         |    text + attachments +   |  - Actions       |
| - Conv cards     |    templates + AI draft + |    (assign,      |
|   with channel   |    schedule send          |     resolve,     |
|   icon + badge   |                           |     snooze)      |
+------------------+---------------------------+------------------+
```

### New Components
- `src/pages/crm/inbox/InboxPage.tsx` -- main page
- `src/components/inbox/InboxConversationList.tsx` -- left panel with filters, saved views
- `src/components/inbox/InboxThread.tsx` -- center panel, message thread
- `src/components/inbox/InboxContactPanel.tsx` -- right panel, contact details
- `src/components/inbox/InboxComposer.tsx` -- message composer with AI draft button
- `src/components/inbox/InboxSubNav.tsx` -- Inbox sub-navigation (Inbox, Channels, Templates, Analytics)
- `src/components/inbox/ChannelBadge.tsx` -- channel type icon/badge component
- `src/components/inbox/ConversationCard.tsx` -- conversation list item
- `src/components/inbox/InternalNote.tsx` -- internal note display/entry
- `src/components/inbox/CollisionIndicator.tsx` -- "agent is viewing/typing" indicator

### Hooks
- `src/hooks/useInbox.ts` -- conversations query, messages query, send mutation, assignment, resolve, snooze
- `src/hooks/useInboxRealtime.ts` -- Supabase realtime subscriptions for conversations + messages

### Routing
- `/crm/inbox` -- main inbox
- `/crm/inbox/channels` -- channel management
- `/crm/inbox/templates` -- unified templates
- `/crm/inbox/analytics` -- reporting (Phase 5)

### CRM SubNav Update
- Replace "WhatsApp" link with "Inbox" in CRMSubNav
- Feature-flag gated by `omnichannel_inbox`

---

## Phase 4: Additional Connectors (Scaffolded)

### Telegram Bot Connector
- Edge function: `inbox-telegram-webhook` (or handled by unified `inbox-webhook`)
- Bot API integration: receive messages via webhook, send via Bot API
- Channel setup UI: enter Bot token, verify webhook

### Messenger Connector (Scaffolded)
- Meta Page Messaging API integration
- OAuth flow for page access token
- Webhook subscription for page messages

### Instagram DM Connector (Scaffolded)
- Instagram Messaging API (requires Meta app review)
- Same webhook infrastructure as Messenger

### TikTok Comments (Scaffolded)
- TikTok Business API for comment retrieval
- Polling-based (no webhook available for most use cases)

All scaffolded connectors include:
- UI for connecting/disconnecting
- Placeholder webhook handlers with TODO markers
- Safe failure modes (clear error messages when credentials missing)

---

## Phase 5: AI Auto-Responder

### Edge Function: `inbox-ai-respond`
- Uses Lovable AI (gateway at `https://ai.gateway.lovable.dev/v1/chat/completions`)
- Model: `google/gemini-3-flash-preview` (default)
- RAG pipeline:
  1. Query `wiki_pages` and any indexed knowledge for the org
  2. Build context from conversation history + retrieved docs
  3. Generate response with tone/policy rules
  4. Return with confidence score and citations

### Features
- **"AI Draft" button** in composer: generates suggested reply, agent edits and sends
- **"Auto Reply" toggle** per inbox/channel:
  - Only for safe intents (FAQ, hours, pricing, booking link)
  - Configurable confidence threshold (default 0.85)
  - Blocklist topics (billing disputes, legal, refunds) always route to human
  - Auto-handoff on negative sentiment or explicit "human" request
- **Audit logging**: every AI event stored in `inbox_ai_events` with model version, prompt, sources, confidence, feedback
- **"Stop AI" button**: one click, immediate, disables auto-reply for that conversation
- **Admin review page**: `/crm/inbox/ai-review` -- browse AI conversations, add feedback labels (helpful/not helpful/corrected), export training dataset

### AI Guardrails
- Channel compliance: AI never sends when WhatsApp window is closed (falls back to template suggestion)
- Confidence threshold with fallback
- Safe intent allowlist
- Blocklist topics -> require human
- Full audit trail

---

## Phase 6: V1 + V2 Features

### V1
- **Routing rules**: auto-assign by channel, keyword, language, business hours, VIP tags
- **SLA policies**: first response SLA, resolution SLA, breach alerts (background job via edge function)
- **Macro actions**: tag + assign + close + send template in one action
- **Identity resolution**: merge contact profiles across channels (phone/email/handle matching)
- **Analytics dashboard**: response time, resolution time, volume by channel, agent leaderboard, AI assist rate

### V2
- **Workflow automation builder**: trigger -> action visual builder (simplified Manychat-style)
- **WhatsApp Flows**: interactive forms (already partially built, migrated from old module)
- **Template A/B testing**: variant management with performance tracking
- **Advanced AI**: auto-triage, auto-summarize, auto-fill CRM fields, suggested next best action
- **AI improvement loop**: feedback labels -> curated dataset export -> admin review page -> prompt/retrieval refinement (not live self-modifying)

---

## Technical Details

### Files to Create (Phase 1-5, approximately)

**Database migrations:**
- New enums, tables, RLS policies, indexes
- Data migration from `wa_*` tables
- Feature flag entries

**Edge functions (6 new):**
- `inbox-webhook/index.ts`
- `inbox-send/index.ts`
- `inbox-channel-connect/index.ts`
- `inbox-channel-health/index.ts`
- `inbox-ai-respond/index.ts`
- `inbox-sla-check/index.ts` (scheduled)

**Shared connector code:**
- `supabase/functions/_shared/connectors/base.ts`
- `supabase/functions/_shared/connectors/whatsapp.ts`
- `supabase/functions/_shared/connectors/telegram.ts`
- `supabase/functions/_shared/connectors/messenger.ts`
- `supabase/functions/_shared/connectors/instagram.ts`

**Frontend (20+ new files):**
- Pages: `InboxPage`, `InboxChannelsPage`, `InboxTemplatesPage`, `InboxAnalyticsPage`, `InboxAIReviewPage`
- Components: ~15 inbox components
- Hooks: `useInbox.ts`, `useInboxRealtime.ts`, `useInboxAI.ts`, `useInboxChannels.ts`
- Types: `src/types/inbox.ts`

**Files to Modify:**
- `src/App.tsx` -- add inbox routes, redirect old WhatsApp routes
- `src/components/crm/CRMSubNav.tsx` -- replace WhatsApp with Inbox
- `src/hooks/useFeatureFlags.tsx` -- add `omnichannel_inbox` and `ai_responder` flags
- `supabase/config.toml` -- add new edge function configs

**Files eventually deprecated (not deleted immediately):**
- All `src/pages/crm/whatsapp/*` pages (redirected)
- All `src/components/whatsapp/*` components
- `src/hooks/useWhatsAppInbox.ts` and related hooks
- Old `wa-*` edge functions (kept but deprecated)

### Security
- All tables have organization_id-scoped RLS
- Edge functions validate auth + org membership
- Webhook signature verification per connector
- API tokens encrypted at rest in JSONB (using Supabase vault where possible)
- No PII in logs; access tokens never logged
- Rate limiting on send endpoints

### Realtime
- `inbox_conversations` and `inbox_messages` added to `supabase_realtime` publication
- Client subscribes filtered by organization_id
- Typing/viewing indicators via Supabase Presence channels

---

## Implementation Order

Given the size, I recommend implementing in this order across multiple prompts:

1. **Phase 1**: Database schema + migration + feature flags + types
2. **Phase 3 (partial)**: Inbox UI shell (page, layout, components) with mock data
3. **Phase 2**: Connector framework + WhatsApp connector + hooks wired to real data
4. **Phase 3 (complete)**: Full UI with realtime, composer, notes, assignment, collision prevention
5. **Phase 5**: AI Auto-Responder
6. **Phase 4**: Additional connector scaffolding
7. **Phase 6**: V1/V2 features incrementally

Each step will be a separate prompt to keep changes manageable.

