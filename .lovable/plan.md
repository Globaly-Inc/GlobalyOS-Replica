
# Scheduler – Full Page Creator + Polish + Google Meet Stub

## Current State Summary

After thorough review, here is what currently exists and what is missing or broken:

### What works:
- Database tables (4): `scheduler_event_types`, `scheduler_event_hosts`, `scheduler_bookings`, `scheduler_integration_settings`
- Internal Scheduler page with tabs (Event Types, Scheduled Events, Integrations)
- `CreateEventTypeWizard` — but lives inside a Dialog (modal), not a dedicated page
- Public booking page at `/s/:orgCode/scheduler/:eventSlug`
- Edge functions: `get-scheduler-slots`, `create-scheduler-booking`, `cancel-scheduler-booking`, `send-scheduler-notification`
- CRM auto-link (find or create contact on booking)
- Email notifications via Resend
- Cancel flow via token

### What is missing / broken / needs improvement:

1. **"New Event Type" should be its own full page** (not a Dialog) — the current modal is cramped for a 6-step wizard. Route: `crm/scheduler/new`; edit route: `crm/scheduler/:id/edit`

2. **Edit route is broken** — `App.tsx` has `crm/scheduler/:eventSlug/edit` but `SchedulerPage.tsx` uses a modal state (`wizardOpen`), not a route-driven page. The edit URL never renders a different page.

3. **Google Calendar + Meet integration** — currently just a "Coming Soon" placeholder in `IntegrationsTab.tsx`. We need to implement a proper Google OAuth connection using the Lovable Google connector or at minimum build a working UI + stored connection flow that guides users through connecting and saving tokens. Since OAuth for Google Calendar requires a Google connector or custom OAuth, we will build the **full UI flow** that stores the connection and shows connected status, while the actual calendar read is stubbed behind a clear "Beta" label with the architecture ready to add real calendar reads.

4. **Public booking page UX gaps:**
   - No `.ics` calendar download on confirmation page
   - `alert()` used for errors (should use toast)
   - Reschedule page (`BookingReschedulePage.tsx`) doesn't actually re-show the booking page with pre-filled data — it calls `cancel-scheduler-booking` action which is wrong
   - Timezone list is a small static array — should be comprehensive

5. **Notifications email** — host notification uses `host_employee.email` but the `employees` table may not store email — it should use `auth.users` email. Need to fix the join/query in the edge function.

6. **Event type cards** — small polish items: "Copy booking link" button on every card is good; "Preview page" opens correctly

7. **Share step in wizard** — shows the link but doesn't properly handle the "Create" action before showing (it shows even before saving). Need to move the "Create" action to a proper save-then-show-link flow.

---

## Changes to Implement

### 1. New dedicated full-page Create/Edit Event Type

**New file:** `src/pages/crm/scheduler/CreateEventTypePage.tsx`
- Takes over the wizard logic from `CreateEventTypeWizard.tsx`
- Uses `PageBody` layout like all CRM pages
- Left column: step progress (vertical, Calendly-style sidebar)
- Right column: step content (full width, not cramped)
- Header: "Create Event Type" with breadcrumb back to Scheduler
- On submit → navigate back to `/org/:orgCode/crm/scheduler`
- For edit: URL param `id` loads existing event type data

**Routes to add in `App.tsx`:**
```
crm/scheduler/new        → CreateEventTypePage (create mode)
crm/scheduler/:id/edit   → CreateEventTypePage (edit mode)
```

**SchedulerPage.tsx** — `New Event Type` button now navigates to `/org/:orgCode/crm/scheduler/new` instead of opening a modal. `EventTypesTab.tsx` `onEdit` callback navigates to `/org/:orgCode/crm/scheduler/:id/edit`.

**Remove** `CreateEventTypeWizard.tsx` (replaced by the full page) and the modal invocation.

### 2. Fix the reschedule page

**`BookingReschedulePage.tsx`** — currently unclear. Needs to:
1. Fetch booking details by token
2. Show the booking page UI (date/time picker) pre-filled with event type
3. On new time selection, call a new `reschedule-scheduler-booking` edge function (or extend `cancel-scheduler-booking`) that updates the booking with the new time

**New edge function:** `supabase/functions/reschedule-scheduler-booking/index.ts`
- Input: `{ token, new_start_at_utc }`
- Validates token, checks slot availability, updates booking, sends reschedule confirmation email

### 3. Google Calendar Integration — Full UI Flow

**IntegrationsTab.tsx improvements:**
- Replace "Coming Soon" button with a real connection UI
- Show connection status (Connected / Not connected)
- When not connected: "Connect Google Calendar" button that explains the OAuth flow is coming
- When connecting: store a preference record in `scheduler_integration_settings` with `is_google_meet_enabled` toggle
- Add a `RESEND_API_KEY` status check — show green/red status so admin knows if email is working
- Show clear "Phase 2 — Google Calendar sync is in beta" badge to set expectations

**`scheduler_integration_settings` table** — the table already exists, we'll use it to store the `is_google_meet_enabled` preference even without a real OAuth token. The toggle will persist per-user and per-org.

**Add service hooks** in `useScheduler.ts`:
- `useIntegrationSettings()` — fetches/upserts the settings row for current user
- `useUpdateIntegrationSettings()` — updates `is_google_meet_enabled`, etc.

### 4. Add `.ics` Calendar Download on Booking Confirmation

In `PublicBookingPage.tsx` confirmation step:
- Add "Add to Calendar" button that generates an `.ics` file client-side and triggers download
- Include: event title, start/end time, location (Google Meet placeholder or address), description with host name

### 5. Fix Error Handling in PublicBookingPage

- Replace `alert()` calls with `toast.error()` (import sonner)
- Add proper error boundary for the booking form submit

### 6. Fix Host Email in Notification Edge Function

In `send-scheduler-notification`:
- The `host_employee.email` field is not available from the `employees` table (which doesn't have email)
- Fix: in `create-scheduler-booking`, fetch host user email via `auth.users` using service role or add email to the employees select from a joined `profiles` table

### 7. Improve Timezone List

In `PublicBookingPage.tsx`:
- Expand `TIMEZONES` array to cover all major world timezones (currently only ~17)
- Add search/filter capability within the timezone select

---

## File-by-File Implementation Plan

### Files to Create
| File | Purpose |
|------|---------|
| `src/pages/crm/scheduler/CreateEventTypePage.tsx` | Full-page wizard replacing the modal |
| `supabase/functions/reschedule-scheduler-booking/index.ts` | Reschedule edge function |

### Files to Modify
| File | Change |
|------|--------|
| `src/App.tsx` | Add `crm/scheduler/new` and `crm/scheduler/:id/edit` routes; import new page |
| `src/pages/crm/scheduler/SchedulerPage.tsx` | Remove modal state; "New Event Type" button uses `navigate` |
| `src/pages/crm/scheduler/EventTypesTab.tsx` | `onEdit` uses `navigate` |
| `src/pages/crm/scheduler/IntegrationsTab.tsx` | Full integration settings UI with toggle persistence |
| `src/pages/scheduler/PublicBookingPage.tsx` | `.ics` download, better error handling, expanded timezones |
| `src/pages/scheduler/BookingReschedulePage.tsx` | Full reschedule flow using the new edge function |
| `src/services/useScheduler.ts` | Add `useIntegrationSettings`, `useUpdateIntegrationSettings` |
| `src/components/crm/scheduler/CreateEventTypeWizard.tsx` | Can be removed (logic moves to page) OR kept as edit-mode only if preferred |
| `supabase/config.toml` | Add `reschedule-scheduler-booking` function config |

### Files NOT Changed
- `supabase/functions/get-scheduler-slots/` — correct as-is
- `supabase/functions/create-scheduler-booking/` — correct, minor fix for host email
- `supabase/functions/cancel-scheduler-booking/` — correct as-is
- `src/types/scheduler.ts` — correct as-is
- `src/components/crm/scheduler/BookingDetailsDrawer.tsx` — correct as-is
- `src/pages/crm/scheduler/ScheduledEventsTab.tsx` — correct as-is

---

## Create Event Type Page — Design (Calendly-style)

```text
┌────────────────────────────────────────────────────────────────┐
│  ← Back to Scheduler       Create Event Type                   │
├──────────────┬─────────────────────────────────────────────────┤
│              │                                                  │
│  STEPS       │   STEP CONTENT (full width, no scroll limit)    │
│              │                                                  │
│  ● 1. Type   │   [4 large type cards with icons + description] │
│  ○ 2. Basics │                                                  │
│  ○ 3. Hosts  │                                                  │
│  ○ 4. Avail. │                                                  │
│  ○ 5. Quest. │                                                  │
│  ○ 6. Share  │                                                  │
│              │                              [Back]  [Next →]   │
└──────────────┴─────────────────────────────────────────────────┘
```

- Left sidebar: vertical step list, completed steps show checkmark, current step highlighted
- Right content: spacious with no max-height constraint
- Footer: Back/Next buttons with clear progress ("Step 2 of 6")
- "Save" on last step → creates event type → shows success + booking link → "Done" navigates to `/crm/scheduler`

---

## Integration Settings UI

```text
┌─────────────────────────────────────────────────────┐
│  📧 Email Notifications                             │
│  Status: ✅ Resend configured                       │
│  Confirmation emails are sent automatically          │
├─────────────────────────────────────────────────────┤
│  📅 Google Calendar                    [Beta]       │
│  Status: ○ Not connected                            │
│  Auto-sync availability from Google Calendar        │
│  [Connect Google Calendar] ← opens info modal       │
│                                                     │
│  ─ Coming in Phase 2 ─                              │
│  ✓ Real-time availability sync                      │
│  ✓ Auto-create Google Meet links                    │
│  ✓ Add bookings directly to your calendar           │
├─────────────────────────────────────────────────────┤
│  ⚙️ Booking Preferences                            │
│  Auto-create Google Meet links  [Toggle — disabled] │
│  (Requires Google Calendar connection)              │
└─────────────────────────────────────────────────────┘
```

---

## Edge Cases & Technical Notes

- **Slug conflict on creation**: the `UNIQUE(organization_id, slug)` constraint will return a DB error. We need to catch this and show "This slug is already in use. Try another name." 
- **Host email for notifications**: use `employees.work_email` if it exists, else the `organizations.email` as fallback — avoid querying `auth.users` from edge functions unless needed
- **`.ics` generation**: pure client-side string generation, no library needed — format is simple text
- **Reschedule token reuse**: when rescheduling, keep the same `cancel_token` so old links still work; just update `start_at_utc` and `end_at_utc`
- **Route conflict**: `crm/scheduler/:id/edit` must be declared BEFORE catch-all; currently the `crm/scheduler/:eventSlug/edit` route exists but renders `SchedulerPage` which is wrong — this will be fixed

---

## Sequence of Implementation

1. Create `CreateEventTypePage.tsx` (full-page wizard)
2. Update `App.tsx` with new routes + imports
3. Update `SchedulerPage.tsx` (remove modal, use navigate)
4. Update `EventTypesTab.tsx` (onEdit uses navigate)
5. Update `IntegrationsTab.tsx` (real integration UI + settings)
6. Add `useIntegrationSettings` to `useScheduler.ts`
7. Fix `PublicBookingPage.tsx` (ICS, error handling, timezones)
8. Build `BookingReschedulePage.tsx` (proper reschedule flow)
9. Create `reschedule-scheduler-booking` edge function
10. Deploy new edge function + update `config.toml`
