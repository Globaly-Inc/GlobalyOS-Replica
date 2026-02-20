
## Add a Phone Dialer Button to the Top Navigation Bar

### What Changes
A new **Phone** icon button will be added to the `DesktopQuickActions` bar (between the Notifications bell and the Settings gear). Clicking it opens a **dialer dialog** where users can type a phone number and place an outbound call via the existing `twilio-outbound-call` edge function. The button is only visible when the `telephony` feature flag is enabled.

### New Component: `QuickDialer.tsx`

A new file `src/components/layout/QuickDialer.tsx` will be created containing:

- A **Dialog** (Radix) triggered by a `Phone` icon button in the quick actions bar.
- A **dial pad UI** inside the dialog:
  - A text input for the phone number (with country code prefix).
  - A 3x4 grid of digit buttons (1-9, *, 0, #) for tap-to-dial entry.
  - A green "Call" button at the bottom.
  - A dropdown to select which org phone number to call from (if the org has multiple numbers), using the existing `useOrgPhoneNumbers` hook.
- On "Call" press:
  - Invokes `supabase.functions.invoke('twilio-outbound-call', { body: { to_number, organization_id, phone_number_id } })`.
  - Shows a success/error toast via `sonner`.
  - Closes the dialog on success.

### Changes to `DesktopQuickActions.tsx`

- Import `QuickDialer` and `useFeatureFlags` (already imported).
- Render `<QuickDialer organizationId={currentOrgId} />` conditionally when `isEnabled('telephony')` is true.
- Position it after the Notifications button and before the Settings button.

### Technical Details

**QuickDialer component structure:**
- Uses `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle` from `@/components/ui/dialog`.
- Uses `useOrgPhoneNumbers()` from `@/hooks/useTelephony` to list available caller IDs.
- Uses `Select` component if multiple org phone numbers exist; auto-selects the first one if only one is available.
- Uses `supabase.functions.invoke('twilio-outbound-call')` -- the existing edge function already handles everything (finding the org's active number, placing the call via Twilio, logging usage).
- Basic phone number validation before allowing the call (must start with + and have at least 10 digits).

**Dial pad layout:**
```text
+------------------+
| +1 555-123-4567  |  (input field)
+------------------+
|  1  |  2  |  3   |
|  4  |  5  |  6   |
|  7  |  8  |  9   |
|  *  |  0  |  #   |
+------------------+
| [Backspace]      |
| [  Call    ]     |  (green button)
+------------------+
```

**No database changes required.** This uses the existing `twilio-outbound-call` edge function and `org_phone_numbers` table.
