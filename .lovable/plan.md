

## Update Channel Connection Dialogs with Real Setup Instructions

### What this changes

Each channel's "Connect" dialog will include step-by-step instructions on **where to find** the required credentials, with direct links to the official platform portals. For WhatsApp and Messenger/Instagram (which support OAuth-based flows via Meta), we will also note the possibility of a future Embedded Signup integration.

### Channel-by-channel instructions to add

**WhatsApp**
- Link to: `https://developers.facebook.com/apps/` (Meta Developer Portal)
- Steps: Create a Meta App with "Business" type, add WhatsApp product, go to API Setup to find the Phone Number ID, WhatsApp Business Account ID, and generate a temporary Access Token
- Note: For production, a permanent System User token should be generated from Meta Business Suite > Business Settings > System Users

**Telegram**
- Link to: Open Telegram and search for `@BotFather`
- Steps: Send `/newbot` to BotFather, choose a name and username (must end in "bot"), copy the Bot Token provided
- This is the simplest flow -- no developer portal needed

**Messenger (Facebook)**
- Link to: `https://developers.facebook.com/apps/`
- Steps: Create/select Meta App, add Messenger product, go to Messenger Settings, generate a Page Access Token by selecting your Facebook Page, copy the Page ID from your Facebook Page's About section
- Note: App must be in Live mode for public use

**Instagram**
- Link to: `https://developers.facebook.com/apps/`
- Steps: Same Meta App as Messenger, add Instagram product, enable `instagram_manage_messages` permission, use Graph API Explorer to generate Page Access Token, find Instagram Business Account ID via the API or Meta Business Suite
- Prerequisite: Instagram account must be a Business/Professional account linked to a Facebook Page

**TikTok**
- Link to: `https://developers.tiktok.com/`
- Steps: Create a TikTok Developer account, create an app, activate the relevant solution, get Client Key and Client Secret, generate a Client Access Token via the OAuth endpoint
- Note: TikTok messaging API access requires partner approval

**Email (IMAP)**
- Link to: Provider-specific (Gmail example: `https://myaccount.google.com/apppasswords`)
- Steps: For Gmail, enable 2FA then generate an App Password; for other providers, use the IMAP host and email/password credentials
- Note: IMAP host defaults listed (e.g., imap.gmail.com, outlook.office365.com)

### Technical changes

**File: `src/components/inbox/ConnectChannelDialog.tsx`**

1. Add a new `channelInstructions` record mapping each `InboxChannelType` to:
   - `steps`: array of instruction strings (2-4 steps each)
   - `portalUrl`: direct link to the relevant developer portal
   - `portalLabel`: display text for the link (e.g., "Meta Developer Portal")
   - `note`: optional extra guidance (e.g., production token info, prerequisites)

2. Render these instructions as a styled info box (blue/muted background with an `ExternalLink` icon) between the dialog description and the form fields, including:
   - Numbered steps
   - A clickable external link to the portal (opens in new tab)
   - Any relevant notes in a smaller muted text

3. Add `ExternalLink` icon import from `lucide-react`

4. The dialog width will be bumped to `sm:max-w-lg` to accommodate the instructions comfortably

### Regarding OAuth / Embedded Signup

- **WhatsApp**: Meta provides an "Embedded Signup" flow that lets users connect via a popup without manually copying tokens. This requires registering as a Tech Provider / Solution Partner with Meta and embedding their JavaScript SDK. This is a significant integration effort (Meta app review, Facebook Login for Business setup, webhook auto-provisioning). A note will be added to the WhatsApp instructions mentioning this is planned for a future release.

- **Messenger / Instagram**: These also use Meta's OAuth flow with Page permissions. Same dependency on Meta app approval. Will note as future enhancement.

- **Telegram**: No OAuth flow exists -- BotFather token is the only method.

- **TikTok**: OAuth exists but requires partner-level API access approval from TikTok. Will note as future enhancement.

- **Email**: IMAP credentials are the standard approach. OAuth for Gmail/Outlook would require Google/Microsoft app registration. Will note as future option.

For now, all channels will use the manual credential entry approach with clear instructions, and a small "tip" on channels where OAuth is possible noting it as a future improvement.

