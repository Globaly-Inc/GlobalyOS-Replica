
# Email Campaigns Module — Full Implementation Plan

## Codebase Reality Check

### What Was Confirmed Exists
- **Resend**: Configured via `RESEND_API_KEY` secret. From-address pattern: `hello@globalyos.com`. Reference pattern: `send-bulk-hiring-email/index.ts`
- **RBAC**: `useUserRole()` in `src/hooks/useUserRole.tsx` — `isOwner`, `isAdmin`, `isHR` booleans. owner/admin/hr can manage; members view-only
- **CRM tables**: `crm_contacts` (has `email`, `first_name`, `last_name`, `tags`, `is_archived`, `organization_id`), `crm_companies`, `crm_activity_log`
- **CRMSubNav**: 4 tabs — Contacts, Companies, Scheduler, Settings. Adding Campaigns between Scheduler and Settings
- **ActivityTimeline**: Renders typed activities from `crm_activity_log`. Currently handles: note, call, email, meeting, task. Needs 5 new campaign event types
- **Routing pattern**: Lazy-loaded under `<FeatureProtectedRoute feature="crm">`, uses `useOrgNavigation` + `OrgLink`
- **Edge function pattern**: `verify_jwt = false` in `config.toml` + manual auth verification with `createClient(url, anonKey, { global: { headers: { authorization: authHeader } } })`
- **Service pattern**: React Query hooks in `src/services/`, types in `src/types/`, follows `useCRM.ts` structure
- **No existing campaign tables** — 5 new tables required

### What Does NOT Exist Yet
- `email_campaigns`, `campaign_recipients`, `email_templates`, `sender_identities`, `email_suppressions` tables
- Any campaigns page, service, or component
- Drag-and-drop email builder (but `@dnd-kit/core` + `@dnd-kit/sortable` already installed)

---

## Implementation Scope

This is a large feature delivered in a focused, complete way. The build follows this priority order:

1. Database migration (5 tables + RLS)
2. TypeScript types
3. Service layer hooks
4. CRMSubNav + App.tsx routing
5. CampaignsPage (list view)
6. CampaignSetupPage (Mailchimp-style checklist)
7. CampaignBuilderPage + Email Builder components
8. Send pipeline edge functions
9. Tracking + unsubscribe edge functions
10. CampaignReportPage
11. TemplatesPage + CampaignSettingsPage
12. ActivityTimeline extension
13. AI subject improvement
14. UnsubscribePage (public)

---

## Database Schema (5 new tables)

### Table 1: `email_campaigns`
```sql
CREATE TABLE email_campaigns (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name               text NOT NULL DEFAULT 'Untitled Campaign',
  status             text NOT NULL DEFAULT 'draft',
  subject            text,
  preview_text       text,
  from_name          text,
  from_email         text,
  reply_to           text,
  content_json       jsonb DEFAULT '{"blocks":[],"globalStyles":{"backgroundColor":"#f3f4f6","fontFamily":"Inter, sans-serif","maxWidth":600}}',
  content_html_cache text,
  audience_source    text DEFAULT 'crm_contacts',
  audience_filters   jsonb DEFAULT '{}',
  recipient_count    integer DEFAULT 0,
  track_opens        boolean DEFAULT true,
  track_clicks       boolean DEFAULT true,
  schedule_at        timestamptz,
  sent_at            timestamptz,
  created_by         uuid REFERENCES employees(id),
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
-- RLS: org members (via employees join) SELECT; owner/admin/hr ALL
```

### Table 2: `campaign_recipients`
```sql
CREATE TABLE campaign_recipients (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id         uuid NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  contact_id          uuid REFERENCES crm_contacts(id) ON DELETE SET NULL,
  email               text NOT NULL,
  full_name           text,
  status              text NOT NULL DEFAULT 'queued',
  provider_message_id text,
  unsubscribe_token   text UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64url'),
  events              jsonb DEFAULT '[]',
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);
CREATE INDEX ON campaign_recipients(organization_id, campaign_id);
CREATE INDEX ON campaign_recipients(organization_id, contact_id);
CREATE INDEX ON campaign_recipients(unsubscribe_token);
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
```

### Table 3: `email_templates`
```sql
CREATE TABLE email_templates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             text NOT NULL,
  category         text DEFAULT 'custom',
  content_json     jsonb NOT NULL DEFAULT '{"blocks":[],"globalStyles":{"backgroundColor":"#f3f4f6","fontFamily":"Inter, sans-serif","maxWidth":600}}',
  thumbnail_url    text,
  created_by       uuid REFERENCES employees(id),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
```

### Table 4: `sender_identities`
```sql
CREATE TABLE sender_identities (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  display_name     text NOT NULL,
  from_email       text NOT NULL,
  reply_to         text,
  is_verified      boolean DEFAULT false,
  is_default       boolean DEFAULT false,
  created_by       uuid REFERENCES employees(id),
  created_at       timestamptz DEFAULT now(),
  UNIQUE (organization_id, from_email)
);
ALTER TABLE sender_identities ENABLE ROW LEVEL SECURITY;
```

### Table 5: `email_suppressions`
```sql
CREATE TABLE email_suppressions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email            text NOT NULL,
  type             text NOT NULL DEFAULT 'unsubscribed',
  reason           text,
  campaign_id      uuid REFERENCES email_campaigns(id) ON DELETE SET NULL,
  created_at       timestamptz DEFAULT now(),
  UNIQUE (organization_id, email)
);
CREATE INDEX ON email_suppressions(organization_id, email);
ALTER TABLE email_suppressions ENABLE ROW LEVEL SECURITY;
```

RLS policies for all 5 tables follow the same pattern as existing CRM tables: org members (verified via `employees.user_id = auth.uid()`) can SELECT; owner/admin/hr can ALL.

---

## New Files to Create

### Types
| File | Description |
|------|-------------|
| `src/types/campaigns.ts` | `EmailCampaign`, `CampaignRecipient`, `EmailTemplate`, `SenderIdentity`, `EmailSuppression`, `EmailBlock`, `EmailBuilderState`, `AudienceFilters`, status union types |

### Service Layer
| File | Description |
|------|-------------|
| `src/services/useCampaigns.ts` | All React Query hooks: `useCampaigns`, `useCampaign`, `useCampaignRecipients`, `useEmailTemplates`, `useSenderIdentities`, `useEmailSuppressions`, and mutations for each |

### Pages (lazy-loaded)
| File | Description |
|------|-------------|
| `src/pages/crm/campaigns/CampaignsPage.tsx` | List + stats dashboard |
| `src/pages/crm/campaigns/CampaignSetupPage.tsx` | Mailchimp-style checklist wizard |
| `src/pages/crm/campaigns/CampaignBuilderPage.tsx` | Full-screen drag-and-drop builder |
| `src/pages/crm/campaigns/CampaignReportPage.tsx` | Post-send analytics (Recharts) |
| `src/pages/crm/campaigns/TemplatesPage.tsx` | Template gallery |
| `src/pages/crm/campaigns/CampaignSettingsPage.tsx` | Sender identities + suppressions |
| `src/pages/public/UnsubscribePage.tsx` | Public 1-click unsubscribe page (no auth) |

### Components
| File | Description |
|------|-------------|
| `src/components/campaigns/EmailBuilder.tsx` | DnD canvas orchestrator (left panel + canvas + right panel) |
| `src/components/campaigns/BlockLibrary.tsx` | Left panel: draggable block palette by category |
| `src/components/campaigns/BlockRenderer.tsx` | Renders individual block types as live JSX preview |
| `src/components/campaigns/BlockPropertiesPanel.tsx` | Right panel: property editors per block type |
| `src/components/campaigns/HtmlRenderer.ts` | Pure TS function: `EmailBuilderState → HTML string` for preview and send |
| `src/components/campaigns/AudienceSelector.tsx` | Recipients source picker + filters + live count |
| `src/components/campaigns/CampaignStatusBadge.tsx` | Status pill (draft/scheduled/sending/sent/failed/archived) |

### Edge Functions
| File | Description |
|------|-------------|
| `supabase/functions/send-campaign/index.ts` | Core send engine: resolve recipients, suppress check, batch-send via Resend, update statuses |
| `supabase/functions/send-test-campaign-email/index.ts` | Test send to logged-in user's email |
| `supabase/functions/estimate-campaign-recipients/index.ts` | Fast count of matching contacts minus suppressions |
| `supabase/functions/track-campaign-event/index.ts` | Public: open pixel + click redirect handler |
| `supabase/functions/campaign-unsubscribe/index.ts` | Public: token-based 1-click unsubscribe |
| `supabase/functions/ai-improve-subject/index.ts` | Uses `LOVABLE_API_KEY` (Gemini 2.5 Flash) to return 3 improved subject lines |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | 7 lazy imports + 8 routes (7 under `crm` feature gate + 1 public `/e/unsub/:token`) |
| `src/components/crm/CRMSubNav.tsx` | Add `{ name: 'Campaigns', href: '/crm/campaigns', icon: Mail }` between Scheduler and Settings |
| `src/components/crm/ActivityTimeline.tsx` | Add 5 campaign event types to `typeConfig` + `filterOptions` |
| `supabase/config.toml` | Add `verify_jwt = false` for 6 new edge functions |

---

## URL Structure

```
/org/:orgCode/crm/campaigns                  → CampaignsPage
/org/:orgCode/crm/campaigns/new              → CampaignSetupPage (create)
/org/:orgCode/crm/campaigns/:id              → CampaignSetupPage (edit)
/org/:orgCode/crm/campaigns/:id/builder      → CampaignBuilderPage (full-screen)
/org/:orgCode/crm/campaigns/:id/report       → CampaignReportPage
/org/:orgCode/crm/campaigns/templates        → TemplatesPage
/org/:orgCode/crm/campaigns/settings         → CampaignSettingsPage (admin/owner only)

/e/unsub/:token                              → UnsubscribePage (public, no auth)
```

---

## Page Designs

### CampaignsPage — List + Dashboard
- Top stat row: Total Campaigns, Total Sent (sum of `recipient_count` where `status = 'sent'`), Avg Open Rate (computed from `campaign_recipients` events), Avg Click Rate
- Filter pills: All | Draft | Scheduled | Sending | Sent | Archived
- Search input
- Campaign table: Name, Status badge, Recipients, Open %, Click %, Created, Actions dropdown (Edit / Duplicate / Archive / Delete)
- Empty state: Mail icon + "Create your first campaign" CTA
- "New Campaign" primary button top-right → navigates to `/crm/campaigns/new`

### CampaignSetupPage — Mailchimp Checklist Style
Two-column layout:
- Left (60%): 5 accordion-style checklist steps
- Right (40%): live mini email preview thumbnail

**Step 1 — Recipients (To)**
- Source selector: CRM Contacts | CRM Companies | Manual
- Filters: tags multi-select, rating, source, date range
- Live count: `AudienceSelector` component calls `estimate-campaign-recipients`
- Shows: "84 contacts selected · 2 missing email address"

**Step 2 — From**
- `sender_identities` select dropdown
- "Add new sender" inline form
- Note: "Emails are sent from hello@globalyos.com infrastructure"

**Step 3 — Subject**
- Subject line input
- Preview text input
- Personalization token list: `{{first_name}}`, `{{last_name}}`, `{{company_name}}`, `{{email}}`
- "✨ Improve with AI" button → calls `ai-improve-subject` → shows 3 alternatives in a popover

**Step 4 — Content**
- Thumbnail of `content_json` state (rendered inline via `HtmlRenderer`)
- "Design Email" button → navigates to `/crm/campaigns/:id/builder`
- "Use Template" button → opens template picker drawer

**Step 5 — Send**
- "Send Test Email" → calls `send-test-campaign-email`
- Schedule radio: "Send Now" | "Schedule for later" (datetime picker)
- Compliance warning shown if no `footer` block detected in `content_json`
- "Send Campaign" primary button — disabled until all steps complete

**Completion indicators**: Each step shows a green checkmark once its required fields are set. Steps 1-4 must all be green to enable the Send button.

### CampaignBuilderPage — Full-Screen 3-Panel
No CRMSubNav (full-screen builder like Notion editor). Header bar: `← Back to [Campaign Name]`, Desktop/Mobile toggle, Save (debounced auto-save + manual), Preview (full modal preview).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Campaign Name         [Desktop][Mobile]          [Save] [Preview]        │
├──────────────┬─────────────────────────────────┬───────────────────────────┤
│  LEFT PANEL  │  CANVAS (600px centered)        │  RIGHT PANEL              │
│  (260px)     │  drag + reorder blocks          │  (280px)                  │
│              │                                 │                            │
│  Content     │  ┌─── email frame ─────────┐    │  [No selection]           │
│  ─────────── │  │  [Header block]         │    │  Click a block to         │
│  [T] Text    │  │  [Text block]           │    │  edit properties           │
│  [🖼] Image  │  │  [Image block]          │    │                            │
│  [◉] Button  │  │  [Button block]         │    │  [When selected:]         │
│  [─] Divider │  │  [Footer block]         │    │  Background color         │
│  [□] Spacer  │  └─────────────────────────┘    │  Padding T/R/B/L          │
│  [⊞] Columns │                                 │  Font size / weight       │
│  [⊕] Social  │                                 │  Text alignment           │
│  [H] Header  │                                 │  Border radius            │
│  [F] Footer  │                                 │  Link URL                 │
│              │                                 │                            │
│  Layouts     │                                 │                            │
│  1-column    │                                 │                            │
│  2-column    │                                 │                            │
└──────────────┴─────────────────────────────────┴───────────────────────────┘
```

**Blocks available** (MVP):
- `header` — logo + background color + org name
- `text` — rich text with padding/alignment controls
- `image` — URL/upload, alt text, link, width, alignment
- `button` — label, href, background color, text color, border radius, alignment
- `divider` — color, thickness, padding
- `spacer` — height
- `columns` — 2-column layout with text-only sub-blocks (full nested DnD is phase 2)
- `social` — link list (LinkedIn, X/Twitter, Instagram, Facebook)
- `footer` — required compliance block with `{{unsubscribe_url}}` and company address

**Mobile preview**: CSS `transform: scale(0.625)` on canvas at 375px width.

**Auto-save**: 1.5s debounced write of `content_json` to campaign — no explicit save needed during editing.

### CampaignReportPage — Analytics
Available once `status = 'sent'`. Shows:
- Stat cards: Sent / Delivered / Open Rate % / Click Rate % / Bounced / Unsubscribed
- Line chart (Recharts, already installed): opens and clicks over time from `events` JSONB array
- Top links clicked: URL + click count (aggregated from `events`)
- Recipient table: paginated, filterable by status, shows name + email + status + last event timestamp

---

## Email Builder JSON Schema

```typescript
interface EmailBuilderState {
  blocks: EmailBlock[];
  globalStyles: {
    backgroundColor: string;   // e.g. "#f3f4f6"
    fontFamily: string;        // e.g. "Inter, sans-serif"
    maxWidth: number;          // 600
  };
}

type EmailBlock =
  | { id: string; type: 'header'; props: HeaderProps }
  | { id: string; type: 'text'; props: TextProps }
  | { id: string; type: 'image'; props: ImageProps }
  | { id: string; type: 'button'; props: ButtonProps }
  | { id: string; type: 'divider'; props: DividerProps }
  | { id: string; type: 'spacer'; props: { height: number } }
  | { id: string; type: 'columns'; props: ColumnsProps }
  | { id: string; type: 'social'; props: SocialProps }
  | { id: string; type: 'footer'; props: FooterProps }
```

Each block type has typed `props` controlling all visual properties. The `HtmlRenderer.ts` function converts this JSON to table-based inline-styled HTML safe for email clients.

---

## Send Pipeline

### `send-campaign` Edge Function Flow
```
1. Verify JWT → get user → check employee.role in ['owner','admin','hr']
2. Load campaign + validate: has subject, has from_email, content_json has ≥1 footer block
3. Resolve recipients:
   SELECT crm_contacts WHERE org_id AND is_archived = false
   Apply audience_filters (tags, rating, source)
   Exclude emails in email_suppressions
4. Insert campaign_recipients (status = 'queued')
5. Update campaign.status = 'sending', recipient_count = N
6. Process batches of 50:
   - Render HTML per recipient (substitute {{tokens}})
   - Inject open-tracking pixel before </body>
   - Rewrite <a href> to click-tracking URL
   - Call Resend API
   - On success: update status = 'sent', store provider_message_id
   - On failure: update status = 'failed'
7. Insert crm_activity_log rows (type='campaign_sent') for all matched contacts
8. Update campaign.status = 'sent', sent_at = now()
```

**Token substitution** (server-side, per recipient):
- `{{first_name}}` → contact.first_name
- `{{last_name}}` → contact.last_name
- `{{email}}` → contact.email
- `{{company_name}}` → joined company.name
- `{{org_name}}` → organization.name
- `{{unsubscribe_url}}` → `https://globalyos.lovable.app/e/unsub/{recipient.unsubscribe_token}`

### `track-campaign-event` Edge Function
Public endpoint (no auth). Two route patterns handled by URL path:
- `GET /track-campaign-event?type=open&rid=:recipientId` → serves 1×1 transparent GIF, appends `{type:'opened',ts}` to events JSONB, updates status to `opened`
- `GET /track-campaign-event?type=click&rid=:recipientId&url=:encodedUrl` → logs click, HTTP 302 redirect to decoded URL

### `campaign-unsubscribe` Edge Function
Public endpoint. Called from unsubscribe link in email footer.
1. Find `campaign_recipients` by `unsubscribe_token`
2. Update status = 'unsubscribed', append event
3. Upsert `email_suppressions` (type = 'unsubscribed', org scoped)
4. Optionally update `crm_contacts.is_archived = false` (just suppress, don't archive)
5. Insert `crm_activity_log` event (type = 'campaign_unsubscribed')
6. Return JSON redirect signal → `UnsubscribePage` shows confirmation

### `ai-improve-subject` Edge Function
Uses `LOVABLE_API_KEY` (Gemini 2.5 Flash — no additional cost to user).
- Input: `{ subject, preview_text, campaign_name, org_id }`
- Prompt: generates 3 alternative subject lines ranked by engagement, staying on-brand
- Output: `{ suggestions: string[] }` — shown in a popover on the setup page

---

## ActivityTimeline Extension

Add to `typeConfig` in `ActivityTimeline.tsx`:
```typescript
campaign_sent:         { icon: Send,        color: 'bg-indigo-100 text-indigo-700',  label: 'Campaign Sent' }
campaign_opened:       { icon: MailOpen,    color: 'bg-blue-100 text-blue-700',      label: 'Email Opened' }
campaign_clicked:      { icon: MousePointer, color: 'bg-green-100 text-green-700',  label: 'Link Clicked' }
campaign_bounced:      { icon: AlertCircle, color: 'bg-red-100 text-red-700',        label: 'Bounced' }
campaign_unsubscribed: { icon: UserMinus,   color: 'bg-orange-100 text-orange-700',  label: 'Unsubscribed' }
```

Add these to `filterOptions` array so users can filter contact timelines by campaign events.

---

## App.tsx Routes to Add

```tsx
// Campaigns pages (lazy imports)
const CampaignsPage = lazy(() => import('./pages/crm/campaigns/CampaignsPage'));
const CampaignSetupPage = lazy(() => import('./pages/crm/campaigns/CampaignSetupPage'));
const CampaignBuilderPage = lazy(() => import('./pages/crm/campaigns/CampaignBuilderPage'));
const CampaignReportPage = lazy(() => import('./pages/crm/campaigns/CampaignReportPage'));
const TemplatesPage = lazy(() => import('./pages/crm/campaigns/TemplatesPage'));
const CampaignSettingsPage = lazy(() => import('./pages/crm/campaigns/CampaignSettingsPage'));
const UnsubscribePage = lazy(() => import('./pages/public/UnsubscribePage'));

// Under /org/:orgCode, inside crm FeatureProtectedRoute:
<Route path="crm/campaigns" element={<OrgProtectedRoute><FeatureProtectedRoute feature="crm"><CampaignsPage /></FeatureProtectedRoute></OrgProtectedRoute>} />
<Route path="crm/campaigns/new" element={<OrgProtectedRoute><FeatureProtectedRoute feature="crm"><CampaignSetupPage /></FeatureProtectedRoute></OrgProtectedRoute>} />
<Route path="crm/campaigns/templates" element={<OrgProtectedRoute><FeatureProtectedRoute feature="crm"><TemplatesPage /></FeatureProtectedRoute></OrgProtectedRoute>} />
<Route path="crm/campaigns/settings" element={<OrgProtectedRoute><FeatureProtectedRoute feature="crm"><CampaignSettingsPage /></FeatureProtectedRoute></OrgProtectedRoute>} />
<Route path="crm/campaigns/:id" element={<OrgProtectedRoute><FeatureProtectedRoute feature="crm"><CampaignSetupPage /></FeatureProtectedRoute></OrgProtectedRoute>} />
<Route path="crm/campaigns/:id/builder" element={<OrgProtectedRoute><FeatureProtectedRoute feature="crm"><CampaignBuilderPage /></FeatureProtectedRoute></OrgProtectedRoute>} />
<Route path="crm/campaigns/:id/report" element={<OrgProtectedRoute><FeatureProtectedRoute feature="crm"><CampaignReportPage /></FeatureProtectedRoute></OrgProtectedRoute>} />

// Public (outside org routes):
<Route path="/e/unsub/:token" element={<UnsubscribePage />} />
```

Note: `crm/campaigns/templates` and `crm/campaigns/settings` must be declared BEFORE `crm/campaigns/:id` to avoid route conflicts.

---

## config.toml Additions

```toml
[functions.send-campaign]
verify_jwt = false

[functions.send-test-campaign-email]
verify_jwt = false

[functions.estimate-campaign-recipients]
verify_jwt = false

[functions.track-campaign-event]
verify_jwt = false

[functions.campaign-unsubscribe]
verify_jwt = false

[functions.ai-improve-subject]
verify_jwt = false
```

---

## Technical Decisions & Trade-offs

- **No new dependencies**: `@dnd-kit` (already installed), `recharts` (already installed), `sonner` (already installed), `LOVABLE_API_KEY` (already available)
- **From address**: All emails sent as `{from_name} <hello@globalyos.com>`. The `sender_identities` table stores the display name and is used in the From header. Actual Resend domain auth is outside MVP scope
- **Batch size**: 50 emails per batch to respect Resend rate limits. Small delay (100ms) between batches
- **Builder mobile**: Builder UI itself is desktop-only (too complex for mobile interaction). A "Mobile Preview" button renders canvas at 375px via CSS scale transform
- **Compliance gate**: "Send" button is disabled client-side AND rejected server-side if no `footer` block exists in `content_json`
- **Columns block**: MVP uses fixed 2-column text-only layout. Full nested DnD for sub-blocks is phase 2
- **Open tracking**: Pixel injected into HTML before `</body>` only when `track_opens = true`. iOS MPP will cause false opens — this is an industry-wide limitation noted in the UI with a small info tooltip
- **Click tracking**: All `<a href>` links in sent HTML are rewritten to tracking redirect URLs server-side in the `send-campaign` function
- **Route ordering**: `templates` and `settings` routes declared before `:id` to prevent conflict

---

## Security Guarantees

- Every DB query in the service layer scoped by `organization_id` derived from `employees.user_id = auth.uid()`, never from request body
- `campaign-unsubscribe` and `track-campaign-event` are public but only accept opaque random tokens — no org IDs exposed
- `email_suppressions` checked on every send batch — contacts that unsubscribe after campaign creation are excluded from ongoing batches
- RLS policies are applied at DB layer as a double-check on all 5 new tables
- AI calls in `ai-improve-subject` are scoped to campaign data only — no cross-org leakage

---

## Future Phases (Out of Scope for MVP)

- Real-time Resend webhook for delivery/bounce confirmation (architecture ready — just needs a webhook endpoint + Resend dashboard configuration)
- Domain authentication wizard (SPF/DKIM instructions)
- A/B subject line testing
- Multi-step email automations / drip campaigns
- Full nested drag-and-drop within Columns blocks
- CSV import of external contacts to `campaign_recipients`
- Dedicated IP warmup tooling
