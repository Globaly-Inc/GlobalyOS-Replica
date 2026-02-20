

## Channel Improvements: Email Forwarding, SMS & Phone Calls Research

### 1. Add Email Forwarding Option to Email Channel

Currently, the email channel only supports IMAP credential entry. We will add an **alternative "Email Forwarding" method** -- a simpler option where the user just forwards emails to a system-generated inbox address instead of providing IMAP credentials.

**Changes to `ConnectChannelDialog.tsx`:**
- Add a toggle/tabs within the email channel form: **"IMAP Connection"** vs **"Email Forwarding"**
- When "Email Forwarding" is selected, show:
  - A generated forwarding address (e.g., `inbox-{orgCode}@inbound.globalyos.app`) displayed in a copy-to-clipboard field
  - Step-by-step instructions: "Add this address as a forwarding address in your email provider's settings"
  - Links to forwarding setup guides for Gmail (`https://support.google.com/mail/answer/10957`), Outlook (`https://support.microsoft.com/en-us/office/turn-on-automatic-forwarding-10bd5fe2-ec46-4398-a422-87e919d547e0`), and Yahoo
  - A "Verify Forwarding" button that checks if a test email has arrived
- Store the connection method in `credentials.method: 'forwarding' | 'imap'` so the backend knows how to handle it

**Changes to `EditChannelDialog.tsx`:**
- Add the same forwarding instructions for email channels in edit mode
- Show the forwarding address if the channel was set up with forwarding

**Changes to `InboxChannelsPage.tsx`:**
- Update the email channel description to mention both options: "Connect via IMAP or email forwarding"

### 2. SMS Channel -- Not Feasible via Sendbird Calls

**Research finding:** Sendbird offers SMS as part of their **Business Messaging** product (a separate notification/marketing platform), not through the Calls SDK we currently use. Sendbird Business Messaging SMS:
- Is designed for outbound notifications (OTP, alerts, marketing), not conversational inbox
- Requires a separate Sendbird Business Messaging subscription and dashboard setup
- Cannot be integrated via the Calls SDK

**Recommendation:** SMS as a conversational inbox channel would require a dedicated SMS provider like **Twilio**, **MessageBird/Bird**, or **Vonage** -- not Sendbird. We will add an **SMS channel card** to the available channels list with a "Coming Soon" badge and a note explaining it requires a Twilio or similar integration.

**Changes:**
- Add `'sms'` to `InboxChannelType` in `src/types/inbox.ts`
- Add SMS to `CHANNEL_META` with a distinct color
- Show the SMS card on `InboxChannelsPage.tsx` with a "Coming Soon" badge (not clickable)

### 3. Call to Phone Number (PSTN) -- Not Supported by Sendbird Calls

**Research finding:** Sendbird Calls SDK only supports **user-to-user calls** where both parties are authenticated Sendbird users (identified by `userId`). It does **not** support:
- PSTN dial-out (calling phone numbers)
- SIP trunking
- Phone number-based calling

The `SendBirdCall.dial()` method requires a `userId`, not a phone number.

**Recommendation:** PSTN calling would require a provider like **Twilio Voice**, **Vonage**, or **Plivo**. We will add an informational note in the Calls settings or feature description noting this limitation and that phone-number calling is planned as a future integration.

No code changes for this -- just awareness. A small info banner can be added to the calls UI if desired.

---

### Summary of File Changes

| File | Change |
|------|--------|
| `src/types/inbox.ts` | Add `'sms'` to `InboxChannelType`, add SMS to `CHANNEL_META` |
| `src/components/inbox/ConnectChannelDialog.tsx` | Add email forwarding tab/toggle with copy-able address, provider-specific forwarding links, and verify button |
| `src/components/inbox/EditChannelDialog.tsx` | Show forwarding address for email channels using forwarding method |
| `src/pages/crm/inbox/InboxChannelsPage.tsx` | Update email description, add SMS card with "Coming Soon" badge |

### Technical Details

- The forwarding address format will be `inbox-{org_id_short}@inbound.globalyos.app` (placeholder -- actual inbound email processing would need a service like SendGrid Inbound Parse or Mailgun Routes, which can be configured later)
- SMS channel type added to the type system but gated behind "Coming Soon" so no backend work is needed yet
- No database migration required -- the `channel_type` column likely accepts any string value
