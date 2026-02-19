

# WhatsApp Messaging + Automation Module — Implementation Plan

## Overview

Add an **Engage > WhatsApp** module to GlobalyOS enabling organisations to connect their WhatsApp Business Account (WABA), manage conversations in a live inbox, create/manage message templates, send broadcasts, build automations, and enforce WhatsApp compliance rules (24h service window, opt-in/opt-out, template-only outbound).

This plan covers **Phase 1 (MVP)** only — the minimum viable feature set to go live.

---

## What Exists Today (Reusable)

| Existing Asset | Reuse For |
|---|---|
| Email Campaigns module (`useCampaigns`, `EmailBuilder`, stepper pages) | Broadcast builder UX pattern (Recipients > Content > Review > Schedule) |
| CRM contacts + tags (`useCRM`, `useCRMTags`) | Audience segmentation for broadcasts |
| `FeatureProtectedRoute` + feature flags | Gate the WhatsApp module behind a feature flag |
| `CRMSubNav` pattern | Add "WhatsApp" tab to CRM sub-navigation |
| DnD kit (already installed) | Automation canvas drag-and-drop |
| Role-based access (`useUserRole`) | Admin/Marketer/Agent permission checks |

---

## Phase 1 Scope (MVP)

1. **WABA Connection + Settings** — guided setup wizard
2. **Inbox** — real-time conversation list + chat thread + assignment
3. **Template Manager** — create, sync status, variable preview
4. **Broadcasts** — segment audience, pick template, schedule, report
5. **Basic Automations** — 5 starter templates (welcome, out-of-hours, FAQ keyword, follow-up, lead qualification) with a simple node editor
6. **Consent + Compliance** — opt-in/out enforcement, 24h window tracking, audit log

---

## Milestone 1: Database Schema + Feature Flag

### New Tables

```text
wa_accounts
  id, organization_id, waba_id, phone_number_id, display_phone,
  display_name, status, webhook_secret, business_hours (jsonb),
  connected_at, created_at, updated_at

wa_contacts
  id, organization_id, phone (unique per org), name,
  crm_contact_id (FK nullable to crm_contacts),
  tags (text[]), custom_fields (jsonb),
  opt_in_status (enum: opted_in, opted_out, pending),
  opt_in_source, opt_in_at,
  last_inbound_at, last_outbound_at,
  created_at, updated_at

wa_conversations
  id, organization_id, wa_contact_id,
  status (enum: open, assigned, resolved, closed),
  assigned_to (FK employees), assigned_at,
  window_open_until (timestamptz),
  last_message_at, unread_count,
  tags (text[]), notes (text),
  created_at, updated_at

wa_messages
  id, organization_id, conversation_id,
  direction (enum: inbound, outbound),
  msg_type (enum: text, image, video, document, template, interactive, flow),
  content (jsonb — body, media_url, template_name, buttons, etc.),
  wa_message_id (text, unique — for idempotency),
  template_id (FK nullable),
  status (enum: pending, sent, delivered, read, failed),
  status_updated_at,
  error_code, error_message,
  created_at

wa_templates
  id, organization_id, name, category (enum: marketing, utility, authentication),
  language, components (jsonb — header, body with {{variables}}, footer, buttons),
  status (enum: draft, pending, approved, rejected),
  external_template_id, rejection_reason,
  version, created_at, updated_at

wa_campaigns (broadcasts)
  id, organization_id, name,
  template_id, variable_mapping (jsonb),
  audience_source, audience_filters (jsonb),
  status (enum: draft, scheduled, sending, sent, failed, cancelled),
  scheduled_at, started_at, completed_at,
  stats (jsonb — total, sent, delivered, read, failed, replied),
  throttle_per_second (int default 10),
  created_by, created_at, updated_at

wa_automations
  id, organization_id, name, description,
  trigger_type (enum: message_received, keyword, new_contact, tag_added, flow_submitted),
  trigger_config (jsonb — e.g. keywords list),
  nodes (jsonb — array of action nodes with conditions),
  edges (jsonb),
  status (enum: draft, active, paused),
  version, created_by, created_at, updated_at

wa_audit_log
  id, organization_id, actor_id, action,
  entity_type, entity_id, details (jsonb),
  created_at
```

### RLS Policies
- All tables: org-scoped SELECT/INSERT/UPDATE/DELETE for authenticated users
- `wa_audit_log`: INSERT only (no UPDATE/DELETE), SELECT for admin/owner roles

### Feature Flag
- Add `'whatsapp'` to the `FeatureName` type union
- Default disabled; Super Admin enables per org

---

## Milestone 2: WABA Connection + Webhook Edge Functions

### Edge Functions

1. **`wa-connect`** — Admin provides WABA ID + phone number ID + permanent access token. Validates by calling Meta Graph API (`GET /phone_number_id`), stores encrypted token in secrets, creates `wa_accounts` row, registers webhook subscription.

2. **`wa-webhook`** — Receives all inbound events from Meta:
   - **Messages**: upsert `wa_contacts`, upsert/create `wa_conversations` (set `window_open_until = now + 24h`), insert `wa_messages`
   - **Status updates** (sent/delivered/read/failed): update `wa_messages.status`
   - **Template status**: update `wa_templates.status`
   - Idempotency: dedupe by `wa_message_id` / event ID
   - CORS not needed (server-to-server), but `verify_jwt = false` required

3. **`wa-send`** — Sends outbound messages:
   - Checks `opt_in_status` — blocks if opted out
   - Checks `window_open_until` — if expired, requires template
   - Calls Meta `POST /phone_number_id/messages`
   - Logs to `wa_messages` + `wa_audit_log`
   - Rate limiting: per-org throttle

### Frontend: Settings Page

- **Guided Setup Wizard** (checklist cards with green ticks):
  1. Connect WABA (form: WABA ID, Phone Number ID, Access Token)
  2. Webhook configured (auto — show URL to paste into Meta dashboard)
  3. Connection verified (test ping)
  4. Create first template
  5. Import/add contacts
  6. Send test message

---

## Milestone 3: Inbox

### UI Components

- `WhatsAppInbox.tsx` — two-panel layout:
  - **Left**: conversation list with search, filters (open/assigned/resolved), unread badges, contact name + last message preview + timestamp
  - **Right**: chat thread (message bubbles — inbound left, outbound right), status indicators (sent/delivered/read ticks), media preview, window timer bar ("Window closes in X hours")

- **Profile side-panel**: contact name, phone, tags, opt-in status, notes, CRM link, last inbound time

- **Actions**: assign to agent, add tag, add note, quick reply, send template (when window closed)

### Realtime
- Enable realtime on `wa_conversations` and `wa_messages` for live updates

---

## Milestone 4: Template Manager

### UI
- Template list with status badges (Approved/Pending/Rejected)
- Create/Edit dialog:
  - Category selector (Marketing / Utility / Authentication)
  - Language selector
  - Component editors (Header, Body with `{{1}}` variable slots, Footer, Buttons)
  - Live preview panel
  - Variable sample values for preview
- Sync button to refresh statuses from Meta

### Edge Function
- **`wa-template-sync`** — calls Meta `GET /waba_id/message_templates`, upserts local `wa_templates` rows with current approval status

---

## Milestone 5: Broadcasts

### UI (Mailchimp-style stepper)
1. **Recipients** — audience selector reusing CRM tags/filters pattern, with estimated count (calls `estimate-wa-recipients` edge function)
2. **Content** — pick approved template + fill variable values with preview
3. **Review** — summary card (audience size, template, schedule)
4. **Schedule/Send** — send now or schedule datetime (timezone-aware)

### Edge Function
- **`wa-send-broadcast`** — processes campaign:
  - Resolves audience from filters
  - Filters out opted-out contacts
  - Sends template messages via `wa-send` with throttling
  - Updates `wa_campaigns.stats` as deliveries complete
  - Logs to `wa_audit_log`

### Reporting
- Campaign detail page showing: sent / delivered / read / failed / replied counts + bar chart

---

## Milestone 6: Basic Automations

### UI — Simple Node Editor
- Not a full canvas builder for MVP — use a **step list** (vertical) with add/edit/delete, similar to hiring pipeline stages
- Each automation has:
  - **Trigger**: dropdown (message received, keyword match, new contact, tag added)
  - **Steps**: ordered list of actions (send message/template, assign agent, add tag, wait, condition branch)
- 5 built-in starter templates users can clone and customise

### Edge Function
- **`wa-run-automation`** — called from `wa-webhook` when a trigger matches:
  - Walks the step list
  - Executes actions (send, assign, tag, wait — via scheduled delayed execution)
  - Respects window rules
  - Logs execution to `wa_audit_log`

---

## Milestone 7: Consent + Compliance

### Rules (enforced in `wa-send`)
- If `opt_in_status !== 'opted_in'`, block all outbound and log reason
- If `window_open_until < now`, only allow template messages
- Frequency cap: max N messages per contact per day (configurable in `wa_accounts` settings)
- Every blocked send logged with reason to `wa_audit_log`

### UI
- Contact profile shows opt-in badge + source + timestamp
- Bulk import requires consent column
- Global "Do Not Message" list management in Settings

---

## Navigation + Routing

### CRM SubNav Update
Add "WhatsApp" item: `{ name: 'WhatsApp', href: '/crm/whatsapp', icon: MessageCircle }`

### Routes (under `/org/:orgCode/crm/whatsapp/...`)

```text
/crm/whatsapp           — Overview / Setup wizard
/crm/whatsapp/inbox     — Inbox
/crm/whatsapp/templates — Template manager
/crm/whatsapp/campaigns — Broadcast list
/crm/whatsapp/campaigns/new — Broadcast builder
/crm/whatsapp/campaigns/:id — Broadcast detail/report
/crm/whatsapp/automations — Automation list
/crm/whatsapp/contacts  — WA contacts list
/crm/whatsapp/settings  — Account settings, business hours, consent
```

---

## New Files Summary

### Types
- `src/types/whatsapp.ts` — all WA entity interfaces + enums

### Services
- `src/services/useWhatsApp.ts` — React Query hooks for all WA tables
- `src/services/useWhatsAppRealtime.ts` — realtime subscriptions for inbox

### Pages
- `src/pages/crm/whatsapp/WhatsAppOverviewPage.tsx`
- `src/pages/crm/whatsapp/WhatsAppInboxPage.tsx`
- `src/pages/crm/whatsapp/WhatsAppTemplatesPage.tsx`
- `src/pages/crm/whatsapp/WhatsAppCampaignsPage.tsx`
- `src/pages/crm/whatsapp/WhatsAppCampaignBuilderPage.tsx`
- `src/pages/crm/whatsapp/WhatsAppCampaignReportPage.tsx`
- `src/pages/crm/whatsapp/WhatsAppAutomationsPage.tsx`
- `src/pages/crm/whatsapp/WhatsAppContactsPage.tsx`
- `src/pages/crm/whatsapp/WhatsAppSettingsPage.tsx`

### Components
- `src/components/whatsapp/SetupWizard.tsx`
- `src/components/whatsapp/ConversationList.tsx`
- `src/components/whatsapp/ChatThread.tsx`
- `src/components/whatsapp/ContactProfilePanel.tsx`
- `src/components/whatsapp/TemplateEditor.tsx`
- `src/components/whatsapp/TemplatePreview.tsx`
- `src/components/whatsapp/BroadcastStepper.tsx`
- `src/components/whatsapp/AutomationEditor.tsx`
- `src/components/whatsapp/WindowTimer.tsx`

### Edge Functions
- `supabase/functions/wa-webhook/index.ts`
- `supabase/functions/wa-connect/index.ts`
- `supabase/functions/wa-send/index.ts`
- `supabase/functions/wa-send-broadcast/index.ts`
- `supabase/functions/wa-template-sync/index.ts`
- `supabase/functions/wa-run-automation/index.ts`

---

## Prerequisites Before Implementation

1. **Meta WhatsApp Access Token** — user must create a Meta app, add WhatsApp product, get a permanent System User token
2. **Secrets needed**: `WHATSAPP_ACCESS_TOKEN` (per-org stored in DB, encrypted), `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (project-level secret)
3. **Webhook URL**: `https://rygowmzkvxgnxagqlyxf.supabase.co/functions/v1/wa-webhook` — user configures this in Meta App dashboard

---

## Implementation Order

1. Database migration (all tables + RLS + feature flag)
2. Edge functions: `wa-webhook` + `wa-connect` + `wa-send`
3. Settings page + Setup wizard
4. Inbox (conversations + messages + realtime)
5. Template manager + `wa-template-sync`
6. Broadcasts + `wa-send-broadcast`
7. Basic automations + `wa-run-automation`
8. Consent enforcement + audit log UI

Each milestone will be implemented incrementally with working UI at each step.

