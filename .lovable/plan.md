

## Plan: Auto-connect Google Calendar from Meet Button + Home Page Connect Card

### Problem
When users click the Google Meet button in the chat composer without having connected Google Calendar, they get a 400 error. There is also no visible prompt to connect Google on the Home page.

### Changes

**1. Create a shared hook: `src/hooks/useGoogleCalendarStatus.ts`**
- Wraps `useIntegrationSettings` to expose a simple `isGoogleConnected` boolean (checks `google_calendar_connected === true`)
- Also re-exports `useGoogleCalendarConnect` for easy access

**2. Update Google Meet button in `src/components/chat/MessageComposer.tsx` (line 694-718)**
- Import `useGoogleCalendarStatus` and `useGoogleCalendarConnect`
- On click: if not connected, call `connectGoogle.mutateAsync()` (triggers OAuth redirect) instead of trying to create a Meet link
- Show appropriate loading state during connection

**3. Add "Connect Google" card to `src/components/home/HomeSidebar.tsx`**
- At the top of the sidebar (before `PendingLeaveApprovals`), render a new card when `isGoogleConnected` is false
- Card shows Google icon, brief text ("Connect your Google account to use Meet, Calendar sync, and Gmail"), and a "Connect Google" button
- Clicking the button triggers `useGoogleCalendarConnect` (same OAuth flow used in Scheduler Integrations)
- Card is dismissible and only shown to users with an employee profile

**4. No database changes required** — uses the existing `scheduler_integration_settings` table and `google-calendar-auth` edge function

