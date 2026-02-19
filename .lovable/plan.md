
# Scheduler Module — Calendly-style Booking Inside GlobalyOS CRM

## Current State Analysis

- **No existing Scheduler** — there are no `scheduler_*` tables, no booking flows, no public booking pages.
- **Existing CRM** — `crm_contacts`, `crm_companies`, `crm_activity_log`, `crm_tags`, `crm_custom_fields` tables exist. The CRM sub-nav already has Contacts | Companies | Settings.
- **Email** — Resend (`RESEND_API_KEY`) is configured and working; edge functions like `send-hiring-notification` provide the pattern to follow.
- **Auth/org isolation** — RLS via `has_crm_access(organization_id)` / `organization_id` pattern is well-established.
- **Employees** — the `employees` table provides host data; `user_id` links to auth users.
- **Routes** — all internal routes follow `/org/:orgCode/crm/...`; public routes follow patterns like `/careers/:orgCode/:jobSlug`.
- **Feature flags** — the `crm` feature flag already controls CRM access.

---

## Architecture Decisions

### Phase 1 Scope (what we build now)
This is a very large feature. We will implement a fully working Phase 1 that includes:
1. Database schema (4 new tables + RLS)
2. Internal Scheduler UI under CRM sub-nav (Event Types + Scheduled Events tabs)
3. Public booking pages (`/s/:orgCode/scheduler/:eventSlug`)
4. CRM auto-link on booking (find or create contact)
5. Confirmation + cancellation/reschedule pages
6. Email notifications (confirmation to host + invitee via existing Resend)

### Google Calendar — deferred to Phase 2
Google OAuth requires a Connector or custom OAuth flow. For now, availability will be driven by **manual working hours** configured per event type (the `config_json` availability rules). A clear "Connect Google Calendar" button will be shown in the Integrations tab as a placeholder that indicates it's coming soon. This makes Phase 1 shippable without a Google API key dependency.

---

## Database Schema (4 new tables)

### Table 1: `scheduler_event_types`
```
id uuid PK
organization_id uuid FK → organizations
creator_user_id uuid (auth user)
type text CHECK IN ('one_on_one','group','collective','round_robin')
name text NOT NULL
slug text NOT NULL  -- unique per org
description text
duration_minutes int DEFAULT 30
location_type text DEFAULT 'google_meet' CHECK IN ('google_meet','in_person','custom','phone')
location_value text  -- address or custom URL or phone
is_active boolean DEFAULT true
config_json jsonb  -- availability, buffers, questions, reminders
created_at timestamptz DEFAULT now()
updated_at timestamptz DEFAULT now()
UNIQUE(organization_id, slug)
```

### Table 2: `scheduler_event_hosts`
```
id uuid PK
event_type_id uuid FK → scheduler_event_types
employee_id uuid FK → employees
routing_weight int DEFAULT 1  -- for round-robin
is_primary boolean DEFAULT false
created_at timestamptz
```

### Table 3: `scheduler_bookings`
```
id uuid PK
organization_id uuid FK
event_type_id uuid FK → scheduler_event_types
host_employee_id uuid FK → employees
invitee_contact_id uuid FK → crm_contacts (nullable, linked after creation)
invitee_name text NOT NULL
invitee_email text NOT NULL
invitee_timezone text NOT NULL
answers_json jsonb  -- custom question responses
start_at_utc timestamptz NOT NULL
end_at_utc timestamptz NOT NULL
status text DEFAULT 'scheduled' CHECK IN ('scheduled','completed','no_show','canceled')
cancel_token text UNIQUE  -- opaque token for cancel/reschedule links
google_event_id text  -- future Google Calendar integration
google_meet_link text  -- future
notes text
created_at timestamptz DEFAULT now()
updated_at timestamptz DEFAULT now()
```

### Table 4: `scheduler_integration_settings` (stub for Phase 2)
```
id uuid PK
organization_id uuid FK
user_id uuid
provider text DEFAULT 'google'
is_google_meet_enabled boolean DEFAULT false
primary_calendar_id text
availability_calendar_ids text[]
created_at timestamptz
updated_at timestamptz
```

### RLS Policies
- `scheduler_event_types`: org members can SELECT active ones; org admin/owner/member can INSERT/UPDATE/DELETE their own.
- `scheduler_event_hosts`: same org isolation.
- `scheduler_bookings`: org members can read all bookings; INSERT is allowed from anon (public booking); UPDATE restricted to org members.
- Public read of active event_types by org slug is needed for the booking page — handled via a public edge function (no RLS bypass needed if we use service role in the edge function).

---

## Files to Create / Modify

### New Database Migration
- `supabase/migrations/..._scheduler_tables.sql`

### New Types
- `src/types/scheduler.ts` — TypeScript types for all scheduler entities

### New Service Hooks
- `src/services/useScheduler.ts` — React Query hooks for CRUD on event types, bookings, hosts

### New Edge Functions
- `supabase/functions/create-scheduler-booking/index.ts` — public endpoint (no auth required); creates booking, links/creates CRM contact, sends confirmation emails
- `supabase/functions/send-scheduler-notification/index.ts` — sends host + invitee confirmation and reminder emails via Resend
- `supabase/functions/cancel-scheduler-booking/index.ts` — cancel by token (no auth required)

### New Internal Pages
- `src/pages/crm/scheduler/SchedulerPage.tsx` — main scheduler with sub-tabs
- `src/pages/crm/scheduler/EventTypesTab.tsx` — list of event types
- `src/pages/crm/scheduler/ScheduledEventsTab.tsx` — list of bookings
- `src/pages/crm/scheduler/IntegrationsTab.tsx` — Google Cal placeholder
- `src/components/crm/scheduler/CreateEventTypeWizard.tsx` — 6-step create/edit dialog
- `src/components/crm/scheduler/EventTypeCard.tsx` — card in the list
- `src/components/crm/scheduler/BookingDetailsDrawer.tsx` — booking details side panel

### New Public Pages (no auth required)
- `src/pages/scheduler/PublicBookingPage.tsx` — `/s/:orgCode/scheduler/:eventSlug`
- `src/pages/scheduler/BookingConfirmationPage.tsx` — shown after successful booking
- `src/pages/scheduler/BookingCancelPage.tsx` — cancel via token
- `src/pages/scheduler/BookingReschedulePage.tsx` — reschedule via token

### Modified Files
- `src/components/crm/CRMSubNav.tsx` — add "Scheduler" nav item
- `src/App.tsx` — add internal + public routes for scheduler
- `src/types/crm.ts` — extend CRMActivity type to include `meeting` already exists

---

## Internal Scheduler UI Structure

```text
CRM Sub-Nav:  Contacts | Companies | Scheduler | Settings

/crm/scheduler  →  SchedulerPage
  ┌──────────────────────────────────────────────────────┐
  │  🗓 Scheduler                          [+ New Event]  │
  │  Create and manage your booking pages                 │
  ├──────────────────────────────────────────────────────┤
  │  [Event Types] [Scheduled Events] [Integrations]     │
  ├──────────────────────────────────────────────────────┤
  │                                                      │
  │  Event Types tab — grid of cards:                    │
  │  ┌─────────────┐ ┌─────────────┐                    │
  │  │ 30-min Call │ │ Weekly Sync │                    │
  │  │ One-on-one  │ │ Group 45min │                    │
  │  │ [Link][...] │ │ [Link][...] │                    │
  │  └─────────────┘ └─────────────┘                    │
  │                                                      │
  │  Scheduled Events tab — table:                       │
  │  [Upcoming][Past][Cancelled]  [Filter by type] ...   │
  │  Date | Time | Host | Invitee | Event | Status       │
  │                                                      │
  └──────────────────────────────────────────────────────┘
```

### Create Event Type Wizard (6 steps, Dialog/Drawer):
1. **Type** — 4 cards: One-on-One, Group, Collective, Round Robin
2. **Basics** — name (auto-generates slug), description, duration, location type
3. **Hosts** — select employees from org; set capacity for Group; set routing for Round Robin
4. **Availability** — working hours per day (Mon–Sun toggles + time pickers), buffer before/after, min notice (hours), max days in advance
5. **Questions** — name+email locked; add custom questions (text, textarea, radio)
6. **Share** — show generated link with Copy button

---

## Public Booking Page Flow

```text
URL: /s/{orgCode}/scheduler/{eventSlug}

Step 1 — Date & Time
  Left panel: event info (name, host, duration, location, description)
  Center: month calendar (available days highlighted)
  Right: time slots for selected day (30-min intervals within working hours)
  Bottom: Timezone detector + dropdown

Step 2 — Details (click a time slot)
  Left: event info + selected time
  Right: form — Name*, Email*, custom questions
  CTA: "Schedule Event"

Step 3 — Confirmation ("You are scheduled")
  Centered card with: event name, host, date/time, timezone, location
  "Add to Calendar" button (generates .ics download)
  Cancel / Reschedule links (token-based)
```

---

## Availability Calculation (no Google Calendar in Phase 1)

When the booking page loads, it calls the `create-scheduler-booking` edge function's GET endpoint (or a separate `get-scheduler-availability` edge function) with `?orgCode=X&slug=Y&date=YYYY-MM-DD`. This:

1. Loads the event type's `config_json` working hours.
2. Generates 30-min slots within those hours.
3. Subtracts already-booked slots (from `scheduler_bookings` table).
4. Applies buffer times.
5. Applies min-notice (can't book slots < N hours from now).
6. Returns available slots for that date.

This is done server-side via a new edge function: `supabase/functions/get-scheduler-slots/index.ts`

---

## Email Notifications (via Resend, existing pattern)

Two templates sent on booking confirmation:
1. **Host email** — "New booking: {invitee_name} booked a {event_name} on {date/time}"
2. **Invitee email** — "You are scheduled! Here are your details: {event_name}, {host_name}, {date/time}, {meet_link}"

Both emails include Cancel and Reschedule links using the `cancel_token` stored in the booking.

Pattern reused from `send-hiring-notification` using Resend's `emails.send()` with HTML templates inline.

---

## CRM Integration

On booking creation in the edge function:
1. Look up `crm_contacts` where `email = invitee_email AND organization_id = org_id`.
2. If found → set `invitee_contact_id`.
3. If not found → create a new `crm_contacts` record with `first_name`, `email`, source = `'scheduler'`.
4. Insert a record into `crm_activity_log` with `type = 'meeting'`, linking host employee + contact + metadata (event name, time, meet link).

This makes the meeting appear in the Contact timeline automatically.

---

## Route Summary

| Type | Path |
|------|------|
| Internal | `/org/:orgCode/crm/scheduler` |
| Internal | `/org/:orgCode/crm/scheduler/:eventSlug/edit` |
| Public (booking) | `/s/:orgCode/scheduler/:eventSlug` |
| Public (confirm) | `/s/:orgCode/scheduler/:eventSlug/confirmed` |
| Public (cancel) | `/s/:orgCode/scheduler/cancel/:token` |
| Public (reschedule) | `/s/:orgCode/scheduler/reschedule/:token` |

---

## Implementation Order

1. **Database migration** — 4 tables + RLS
2. **Types** (`src/types/scheduler.ts`)
3. **Edge functions** — `get-scheduler-slots`, `create-scheduler-booking`, `cancel-scheduler-booking`, `send-scheduler-notification`
4. **Service hooks** (`src/services/useScheduler.ts`)
5. **Internal UI** — SchedulerPage → EventTypesTab → CreateEventTypeWizard
6. **Internal UI** — ScheduledEventsTab + BookingDetailsDrawer
7. **Public pages** — PublicBookingPage → BookingConfirmationPage → Cancel/Reschedule pages
8. **Nav + routing** — CRMSubNav update + App.tsx routes

---

## Key Design Decisions / Trade-offs

| Decision | Rationale |
|---|---|
| Google Calendar deferred | Requires OAuth Connector setup; Phase 1 uses manual availability config which ships faster |
| Availability via edge function | Server-side slot calc avoids exposing business logic or booking data to client |
| Cancel via opaque token | Never exposes booking ID or org ID in the URL — matches GlobalyOS URL security rules |
| `crm` feature flag reused | Scheduler lives under CRM; no new feature flag needed |
| Resend for emails | Already configured and tested; consistent with hiring notifications |
| Slugs are org-unique | `UNIQUE(organization_id, slug)` prevents collision; changing name regenerates slug |

---

## What is NOT included in this phase
- Google Calendar OAuth & availability sync
- Google Meet auto-link creation
- Reschedule email reminders (cron)
- Embed widget code
- CRM Contact → "Schedule Meeting" shortcut (can be added in a follow-up)
- Round-robin load balancing algorithm (UI present, basic assignment in Phase 1)
