

## Add "Integrate Directly" Button for OAuth-Capable Channels

### Overview

Add an "Integrate" button to the left side of the dialog footer that launches a dedicated OAuth/embedded connection flow. This button only appears for channels that support direct integration (WhatsApp, Messenger, Instagram, TikTok) and is hidden for Telegram and Email (which only support manual token entry).

### Which channels get the button

| Channel | Direct Integration | Reason |
|---------|-------------------|--------|
| WhatsApp | Yes | Meta Embedded Signup |
| Messenger | Yes | Meta OAuth (Page permissions) |
| Instagram | Yes | Meta OAuth (IG permissions) |
| TikTok | Yes | TikTok OAuth |
| Telegram | No | BotFather token only |
| Email | No | IMAP credentials only |

### UX Flow

1. User clicks "Connect" on a channel card (e.g., WhatsApp)
2. The dialog opens with the existing manual credential form
3. For supported channels, an "Integrate Directly" button appears on the **left side** of the footer, visually separated from Cancel/Connect
4. Clicking it opens a **second dialog** explaining the OAuth process with a step-by-step guide and a "Start Integration" button that opens the platform's OAuth URL in a new tab
5. The second dialog also shows a "Waiting for authorization..." state with a note to return after completing the flow

### Technical Changes

**File: `src/components/inbox/ConnectChannelDialog.tsx`**

1. Add a `channelsWithOAuth` set: `new Set(['whatsapp', 'messenger', 'instagram', 'tiktok'])`
2. Add OAuth-specific metadata per channel (OAuth URL pattern, scopes description, what happens after auth)
3. Add state `showOAuthDialog` to toggle the integration sub-dialog
4. Render the "Integrate Directly" button in `DialogFooter` on the left (using `flex justify-between`) -- only when `channelsWithOAuth.has(channelType)`
5. The button uses a distinct style (e.g., `variant="secondary"` with a `Zap` or `Link2` icon) to differentiate from the manual "Connect"
6. Create an inner `Dialog` (or replace content) for the OAuth flow with:
   - Channel-specific integration steps
   - "Start Integration" button linking to the OAuth URL (new tab)
   - A note explaining this is a future feature / requires platform approval where applicable
   - Back button to return to manual entry

### Footer Layout

```text
+-------------------------------------------------------+
| [Integrate Directly]         [Cancel]  [Connect]      |
+-------------------------------------------------------+
```

- Left-aligned: "Integrate Directly" (secondary style, icon)
- Right-aligned: Cancel + Connect (existing)
- When channel doesn't support OAuth, footer stays as-is (Cancel + Connect only)

