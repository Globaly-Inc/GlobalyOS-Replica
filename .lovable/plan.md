

# Twilio Integration: Service Provider Architecture

## Overview
Build a full Twilio telephony integration where GlobalyOS acts as the central service provider. Organizations self-service provision phone numbers from a marketplace, and the platform handles SMS, Voice, and IVR through a single master Twilio account.

---

## Phase 1: Secrets and Database Schema

### 1.1 Store Twilio Credentials
- Add `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` as secure secrets (used by all edge functions)

### 1.2 New Database Tables

**`org_phone_numbers`** — Tracks provisioned Twilio numbers per org
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| organization_id | uuid FK | Tenant isolation |
| phone_number | text | E.164 format |
| twilio_sid | text | Twilio IncomingPhoneNumber SID |
| friendly_name | text | User-chosen label |
| country_code | text | e.g. "US" |
| capabilities | jsonb | `{sms: true, voice: true}` |
| status | text | `active`, `releasing`, `released` |
| monthly_cost | numeric | Cost from Twilio |
| ivr_config | jsonb | IVR menu tree (greetings, menu options, routing) |
| created_at / updated_at | timestamptz | |

**`telephony_usage_logs`** — Per-org usage metering
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| organization_id | uuid FK | |
| phone_number_id | uuid FK | |
| event_type | text | `sms_inbound`, `sms_outbound`, `call_inbound`, `call_outbound` |
| direction | text | `inbound` / `outbound` |
| duration_seconds | integer | For voice calls |
| segments | integer | For SMS |
| from_number / to_number | text | |
| twilio_sid | text | Call/Message SID |
| cost | numeric | Twilio cost |
| metadata | jsonb | |
| created_at | timestamptz | |

RLS policies: All rows scoped by `organization_id` matching the authenticated user's org.

---

## Phase 2: Edge Functions

### 2.1 `twilio-search-numbers`
- Accepts `country`, `area_code`, `contains`, `capabilities` filters
- Calls Twilio AvailablePhoneNumbers API
- Returns matching numbers with pricing

### 2.2 `twilio-provision-number`
- Purchases a number via Twilio IncomingPhoneNumbers API
- Sets SMS/Voice webhook URLs pointing to `twilio-webhook`
- Inserts record into `org_phone_numbers`
- Creates a corresponding `inbox_channels` row (channel_type = 'sms')

### 2.3 `twilio-release-number`
- Releases a number back to Twilio
- Updates `org_phone_numbers` status to `released`
- Deactivates the linked `inbox_channels` record

### 2.4 `twilio-webhook`
- Single endpoint handling both SMS and Voice callbacks from Twilio
- **SMS inbound**: Looks up number in `org_phone_numbers`, upserts contact/conversation in inbox tables, inserts message -- follows the same pattern as `inbox-webhook`
- **Voice inbound**: Responds with TwiML based on org's `ivr_config` (greeting, menu, routing to agents or voicemail)
- **Status callbacks**: Updates delivery status on messages, logs call duration

### 2.5 SMS/Voice dispatch in `inbox-send`
- Add `case "sms"` to the dispatch switch:
  - Sends SMS via Twilio Messages API using the org's provisioned number
  - Logs usage to `telephony_usage_logs`
- Add voice call initiation (optional outbound dialing via Twilio Calls API)

### 2.6 `twilio-ivr-action`
- Handles IVR keypress/speech input webhooks
- Routes to the correct department/agent or plays next menu
- Generates TwiML responses dynamically based on `ivr_config`

---

## Phase 3: Frontend — Number Marketplace

### 3.1 New page: Number Marketplace
- Route: `/org/:orgCode/inbox/numbers` (linked from Inbox sub-nav)
- Search UI: country selector, area code input, keyword filter
- Results grid showing available numbers, capabilities, monthly cost
- "Buy" button triggers `twilio-provision-number`
- List of already-provisioned numbers with status, usage stats, and "Release" action

### 3.2 Update Channels Page
- Remove `comingSoon: true` from the SMS channel entry
- When clicking "Connect" on SMS, redirect to the Number Marketplace instead of showing the credential dialog
- Show provisioned SMS numbers as connected channels

### 3.3 IVR Builder UI
- Per-number settings dialog with:
  - Greeting message (text-to-speech or audio upload)
  - Menu options (press 1 for Sales, 2 for Support, etc.)
  - Routing targets (team members, departments, voicemail)
  - Business hours configuration
- Saves to `org_phone_numbers.ivr_config`

### 3.4 Inbox SMS/Voice Thread
- SMS conversations appear in the unified inbox (already works via `channel_type = 'sms'`)
- Voice calls show as system messages with duration, recording link
- Call log tab showing history per number

---

## Phase 4: Voice and IVR

### 4.1 Inbound call flow
```text
Caller dials org number
  --> Twilio hits twilio-webhook?type=voice
  --> Lookup org_phone_numbers for IVR config
  --> Return TwiML: Play greeting -> Gather digits
  --> Caller presses digit -> twilio-ivr-action
  --> Route to agent (connect via Twilio conference/queue)
     or leave voicemail (record TwiML)
```

### 4.2 Outbound calls
- Agent clicks "Call" on a contact in the inbox
- Invokes edge function that creates a Twilio Call with the org's number as caller ID
- Call status updates via status callback webhook

### 4.3 Call recording and transcription
- Optional per-org setting to record calls
- Store recordings in file storage
- Link recordings to inbox conversation timeline

---

## Implementation Order
1. Add secrets (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`)
2. Create database tables with RLS
3. Build `twilio-search-numbers` and `twilio-provision-number` edge functions
4. Build Number Marketplace UI
5. Build `twilio-webhook` for inbound SMS
6. Add SMS dispatch to `inbox-send`
7. Build `twilio-webhook` voice handling + `twilio-ivr-action`
8. Build IVR Builder UI
9. Add `twilio-release-number` edge function
10. Build usage logging and call history views

