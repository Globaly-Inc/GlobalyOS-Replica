
# Email Campaigns Module — GlobalyOS

## Ground Truth: What Was Found in the Codebase

### Already Implemented
- **CRM module**: `crm_contacts`, `crm_companies`, `crm_activity_log` tables with full RBAC and org-scoping via `organization_id`
- **Email infrastructure**: Resend is already configured (`RESEND_API_KEY` used in 29+ edge functions, including `send-bulk-hiring-email` which is the closest pattern to what we need)
- **RBAC**: `useUserRole` hook with owner/admin/hr/member hierarchy; `user_roles` table properly separated
- **Org isolation**: `useOrganization` + `OrgProtectedRoute` + `FeatureProtectedRoute` patterns are mature
- **CRM sub-navigation**: `CRMSubNav.tsx` with Contacts, Companies, Scheduler, Settings tabs — "Campaigns" will be added here
- **Activity timeline**: `crm_activity_log` table and `ActivityTimeline.tsx` component for contact/company timelines — will be extended with campaign event types
- **Routing**: Full lazy-load pattern in `App.tsx` under `/org/:orgCode/crm/...`
- **Jobs/queue pattern**: No dedicated job runner — the existing pattern is edge function invocation (as in hiring's bulk email). We'll follow the same pattern with a `send-campaign` edge function that processes in batches
- **AI**: Lovable AI Gateway is available via `LOVABLE_API_KEY` (already used in `wiki-ask-ai`, `task-ai-helper`, etc.)

### Missing / Net-New
- `email_campaigns`, `campaign_recipients`, `email_templates`, `sender_identities`, `email_suppressions` tables
- Campaigns pages, wizard, builder, analytics
- Campaign-specific activity log event types
- `send-campaign` and `track-campaign-event` edge functions

---

## Architecture Overview

The feature ships under `CRM → Campaigns` (gated by the existing `crm` feature flag). No new feature flag needed.

URL pattern:
```text
/org/:orgCode/crm/campaigns              → Campaigns list + dashboard
/org/:orgCode/crm/campaigns/new          → Create wizard (full page)
/org/:orgCode/crm/campaigns/:id          → Campaign detail (setup/edit)
/org/:orgCode/crm/campaigns/:id/builder  → Full-screen email builder
/org/:orgCode/crm/campaigns/:id/report   → Post-send analytics
/org/:orgCode/crm/campaigns/templates    → Template library
/org/:orgCode/crm/campaigns/settings     → Sender identities + suppressions
```

Public (no auth):
```text
/e/unsub/:token                          → Unsubscribe page (1-click)
/e/track/open/:recipientId               → 1x1 tracking pixel
/e/track/click/:recipientId/:linkIndex   → Click redirect
```

---

## Database Schema (6 new tables)

### Table 1: `email_campaigns`
```sql
CREATE TABLE email_campaigns (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                  text NOT NULL DEFAULT 'Untitled Campaign',
  status                text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','scheduled','sending','sent','failed','archived')),
  subject               text,
  preview_text          text,
  from_name             text,
  from_email            text,
  reply_to              text,
  content_json          jsonb,              -- drag-and-drop builder state
  content_html_cache    text,              -- rendered HTML
  audience_source       text DEFAULT 'crm_contacts'
                        CHECK (audience_source IN ('crm_contacts','crm_companies','manual')),
  audience_filters      jsonb,             -- {tags:[], rating:null, source:null}
  recipient_count       integer DEFAULT 0,
  track_opens           boolean DEFAULT true,
  track_clicks          boolean DEFAULT true,
  schedule_at           timestamptz,
  sent_at               timestamptz,
  created_by            uuid REFERENCES employees(id),
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view campaigns"
  ON email_campaigns FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "admins and hr can manage campaigns"
  ON email_campaigns FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM employees
    WHERE user_id = auth.uid() AND role IN ('owner','admin','hr')
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM employees
    WHERE user_id = auth.uid() AND role IN ('owner','admin','hr')
  ));
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
  status              text NOT NULL DEFAULT 'queued'
                      CHECK (status IN ('queued','sent','delivered','opened','clicked',
                                        'bounced','unsubscribed','complaint','failed')),
  provider_message_id text,
  unsubscribe_token   text UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64url'),
  events              jsonb DEFAULT '[]',   -- [{type,ts,meta}]
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_campaign_recipients_campaign  ON campaign_recipients(organization_id, campaign_id);
CREATE INDEX idx_campaign_recipients_contact   ON campaign_recipients(organization_id, contact_id);
CREATE INDEX idx_campaign_recipients_token     ON campaign_recipients(unsubscribe_token);

ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view campaign recipients"
  ON campaign_recipients FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "admins and hr can manage campaign recipients"
  ON campaign_recipients FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM employees
    WHERE user_id = auth.uid() AND role IN ('owner','admin','hr')
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM employees
    WHERE user_id = auth.uid() AND role IN ('owner','admin','hr')
  ));
```

### Table 3: `email_templates`
```sql
CREATE TABLE email_templates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             text NOT NULL,
  category         text DEFAULT 'custom',
  content_json     jsonb NOT NULL DEFAULT '{"blocks":[]}',
  thumbnail_url    text,
  created_by       uuid REFERENCES employees(id),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view templates"
  ON email_templates FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "admins and hr can manage templates"
  ON email_templates FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM employees
    WHERE user_id = auth.uid() AND role IN ('owner','admin','hr')
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM employees
    WHERE user_id = auth.uid() AND role IN ('owner','admin','hr')
  ));
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

CREATE POLICY "org members can view identities"
  ON sender_identities FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "admins can manage identities"
  ON sender_identities FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM employees
    WHERE user_id = auth.uid() AND role IN ('owner','admin')
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM employees
    WHERE user_id = auth.uid() AND role IN ('owner','admin')
  ));
```

### Table 5: `email_suppressions`
```sql
CREATE TABLE email_suppressions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email            text NOT NULL,
  type             text NOT NULL DEFAULT 'unsubscribed'
                   CHECK (type IN ('unsubscribed','bounced','complaint','manual')),
  reason           text,
  campaign_id      uuid REFERENCES email_campaigns(id) ON DELETE SET NULL,
  created_at       timestamptz DEFAULT now(),
  UNIQUE (organization_id, email)
);

CREATE INDEX idx_email_suppressions_email ON email_suppressions(organization_id, email);

ALTER TABLE email_suppressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view suppressions"
  ON email_suppressions FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "admins can manage suppressions"
  ON email_suppressions FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM employees
    WHERE user_id = auth.uid() AND role IN ('owner','admin','hr')
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM employees
    WHERE user_id = auth.uid() AND role IN ('owner','admin','hr')
  ));
```

---

## Email Builder: JSON Schema

The builder stores content as a JSON array of blocks. Each block has a `type` and `props`:

```json
{
  "blocks": [
    {
      "id": "uuid",
      "type": "header",
      "props": { "logoUrl": "", "backgroundColor": "#1a56db", "textColor": "#ffffff" }
    },
    {
      "id": "uuid",
      "type": "text",
      "props": {
        "content": "<p>Hello {{first_name}},</p>",
        "backgroundColor": "#ffffff",
        "paddingTop": 16, "paddingBottom": 16,
        "paddingLeft": 24, "paddingRight": 24,
        "textAlign": "left"
      }
    },
    {
      "id": "uuid",
      "type": "image",
      "props": { "src": "", "alt": "", "link": "", "width": 600, "align": "center" }
    },
    {
      "id": "uuid",
      "type": "button",
      "props": {
        "label": "Get Started",
        "href": "",
        "backgroundColor": "#1a56db",
        "textColor": "#ffffff",
        "borderRadius": 6,
        "align": "center"
      }
    },
    {
      "id": "uuid",
      "type": "divider",
      "props": { "color": "#e5e7eb", "height": 1, "paddingTop": 16, "paddingBottom": 16 }
    },
    {
      "id": "uuid",
      "type": "spacer",
      "props": { "height": 32 }
    },
    {
      "id": "uuid",
      "type": "columns",
      "props": {
        "columnCount": 2,
        "columns": [
          { "blocks": [] },
          { "blocks": [] }
        ]
      }
    },
    {
      "id": "uuid",
      "type": "social",
      "props": {
        "links": [
          { "platform": "linkedin", "url": "" },
          { "platform": "twitter", "url": "" }
        ],
        "align": "center"
      }
    },
    {
      "id": "uuid",
      "type": "footer",
      "props": {
        "companyName": "{{company_name}}",
        "address": "{{company_address}}",
        "unsubscribeUrl": "{{unsubscribe_url}}",
        "backgroundColor": "#f9fafb",
        "textColor": "#6b7280"
      }
    }
  ],
  "globalStyles": {
    "backgroundColor": "#f3f4f6",
    "fontFamily": "Inter, sans-serif",
    "maxWidth": 600
  }
}
```

HTML is generated from this JSON client-side for preview and server-side (edge function) before sending.

---

## Files to Create

### Pages (lazy-loaded via App.tsx)
| File | Purpose |
|------|---------|
| `src/pages/crm/campaigns/CampaignsPage.tsx` | List view + stats dashboard |
| `src/pages/crm/campaigns/CampaignSetupPage.tsx` | Create/Edit setup page (Mailchimp-style checklist) |
| `src/pages/crm/campaigns/CampaignBuilderPage.tsx` | Full-screen drag-and-drop email builder |
| `src/pages/crm/campaigns/CampaignReportPage.tsx` | Post-send analytics |
| `src/pages/crm/campaigns/TemplatesPage.tsx` | Template library |
| `src/pages/crm/campaigns/CampaignSettingsPage.tsx` | Sender identities + suppressions |
| `src/pages/public/UnsubscribePage.tsx` | Public 1-click unsubscribe |

### Service Layer
| File | Purpose |
|------|---------|
| `src/services/useCampaigns.ts` | React Query hooks for all campaigns CRUD |
| `src/types/campaigns.ts` | TypeScript interfaces |

### Components
| File | Purpose |
|------|---------|
| `src/components/campaigns/EmailBuilder.tsx` | Core drag-and-drop builder canvas |
| `src/components/campaigns/BlockLibrary.tsx` | Left panel: draggable block list |
| `src/components/campaigns/BlockPropertiesPanel.tsx` | Right panel: selected block properties |
| `src/components/campaigns/BlockRenderer.tsx` | Renders a block to JSX (both builder preview and HTML export) |
| `src/components/campaigns/HtmlRenderer.tsx` | Converts JSON schema to email-safe HTML string |
| `src/components/campaigns/AudienceSelector.tsx` | Recipients step: source + filters + count estimate |
| `src/components/campaigns/CampaignStatusBadge.tsx` | Status pill with colors |
| `src/components/campaigns/CampaignAnalyticsCard.tsx` | Metric cards for report page |

### Edge Functions
| File | Purpose |
|------|---------|
| `supabase/functions/send-campaign/index.ts` | Core send engine: resolve recipients, check suppressions, send in batches via Resend, update statuses |
| `supabase/functions/send-test-campaign-email/index.ts` | Send a rendered preview to the logged-in user's email |
| `supabase/functions/track-campaign-event/index.ts` | Handle open pixel + click redirects (public, no auth) |
| `supabase/functions/campaign-unsubscribe/index.ts` | 1-click unsubscribe via token (public, no auth) |
| `supabase/functions/estimate-campaign-recipients/index.ts` | Count contacts matching audience filters (fast DB query, auth required) |
| `supabase/functions/ai-improve-subject/index.ts` | AI subject line improvement using Lovable AI Gateway |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add 7 new lazy imports + 7 route entries + public `/e/unsub/:token` route |
| `src/components/crm/CRMSubNav.tsx` | Add "Campaigns" nav item between Scheduler and Settings |

---

## Campaign Setup Page Design (Mailchimp checklist style)

```text
┌─────────────────────────────────────────────────────────────────────┐
│  ← Campaigns   [Campaign Name — editable inline]      [Draft]       │
│                                                  [Save Draft] [Send]│
├────────────────────────────────┬────────────────────────────────────┤
│                                │                                    │
│  ✅  To                        │   EMAIL PREVIEW                    │
│      CRM Contacts · 84 people  │                                    │
│      [Edit recipients]         │   [Skeleton preview of email]      │
│                                │                                    │
│  ✅  From                      │                                    │
│      Acme Corp · hi@acme.com   │                                    │
│      [Edit from]               │                                    │
│                                │                                    │
│  ○   Subject                   │                                    │
│      What's the subject?       │                                    │
│      [Add subject]             │                                    │
│                                │                                    │
│  ○   Content                   │                                    │
│      Design your email         │                                    │
│      [Design email]            │                                    │
│                                │                                    │
│  ○   Schedule                  │                                    │
│      When to send?             │                                    │
│      [Send now / Schedule]     │                                    │
│                                │                                    │
└────────────────────────────────┴────────────────────────────────────┘
```

---

## Email Builder Design (Klaviyo-style)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Setup     [Campaign name]       [Desktop] [Mobile]   [Save] [Preview]│
├──────────────┬──────────────────────────────────┬───────────────────────┤
│              │                                  │                       │
│  Content     │     EMAIL CANVAS (600px max)     │  PROPERTIES           │
│  ─────────── │                                  │  ─────────────────    │
│  Blocks      │  ┌─── drag blocks here ────────┐ │  (when block         │
│  [Text]      │  │  Logo Place                 │ │   selected)          │
│  [Image]     │  │  ─────────────────────────  │ │                      │
│  [Button]    │  │  [ Hero image / text ]      │ │  Background color    │
│  [Divider]   │  │  ─────────────────────────  │ │  Padding T/B: [16]   │
│  [Spacer]    │  │  Body text block            │ │  Padding L/R: [24]   │
│  [Columns]   │  │  ─────────────────────────  │ │  Text align          │
│  [Social]    │  │  [CTA Button]               │ │  Font size           │
│  [Header]    │  │  ─────────────────────────  │ │  Font weight         │
│  [Footer]    │  │  Footer / Unsubscribe       │ │                      │
│              │  └─────────────────────────────┘ │                      │
│  Layout      │                                  │                      │
│  [Columns]   │                                  │                      │
│  [Section]   │                                  │                      │
│              │                                  │                      │
└──────────────┴──────────────────────────────────┴───────────────────────┘
```

The builder uses `@dnd-kit/core` + `@dnd-kit/sortable` (already installed) for drag-and-drop. No new library needed.

---

## Send Pipeline (Edge Function Flow)

```text
send-campaign edge function:
  1. Auth + role check (admin/hr/owner)
  2. Load campaign + validate: has subject, has content_json, has from_email, has footer block, has unsubscribe token in footer
  3. Resolve recipients from audience_source + audience_filters:
     - Query crm_contacts WHERE organization_id = org_id AND is_archived = false AND NOT IN email_suppressions
     - Apply tag/rating/source filters
  4. Create campaign_recipients rows (status = 'queued')
  5. Update campaign.status = 'sending', campaign.recipient_count = N
  6. Process in batches of 50:
     - For each recipient: render HTML with token substitution, send via Resend
     - On success: update status = 'sent', store provider_message_id
     - On error: update status = 'failed'
  7. After all batches: update campaign.status = 'sent', campaign.sent_at = now()
```

**Token substitution** (`{{first_name}}`, `{{last_name}}`, `{{email}}`, `{{company}}`, `{{unsubscribe_url}}`) is done server-side during the render step.

---

## Tracking & Compliance

### Open Tracking
The `track-campaign-event` function serves a 1×1 transparent GIF at `/e/track/open/:recipientId` and logs the event. The open pixel is injected into the HTML just before `</body>`.

### Click Tracking
All `<a>` hrefs in the rendered HTML are rewritten to `/e/track/click/:recipientId/:encodedUrl` which logs the click and redirects.

### Unsubscribe
Every external campaign email includes a footer with `{{unsubscribe_url}}` = `https://app.globalyos.com/e/unsub/:token`. The `campaign-unsubscribe` function validates the token, inserts into `email_suppressions`, updates `campaign_recipients.status = 'unsubscribed'`, and shows the public `UnsubscribePage.tsx`.

---

## AI Integration (Lovable AI Gateway)

The `ai-improve-subject` edge function uses the existing `LOVABLE_API_KEY` (no new secret needed). It receives the campaign subject + preview text and returns 3 improved variations. This keeps all AI calls server-side, org-scoped.

Client-side "AI improve" button → calls edge function → shows 3 options in a popover → user picks one.

---

## Contact Timeline Integration

Campaign events are appended to `crm_activity_log` using new `type` values:
- `campaign_sent`
- `campaign_opened`
- `campaign_clicked`
- `campaign_bounced`
- `campaign_unsubscribed`

The `ActivityTimeline.tsx` component and its `typeConfig` map will be extended to render these types with a `Mail` icon and appropriate color (`bg-indigo-100 text-indigo-700`).

---

## Implementation Sequence

1. **Database migration** — create all 5 tables with RLS policies
2. **Types & service layer** — `src/types/campaigns.ts` + `src/services/useCampaigns.ts`
3. **CRMSubNav** — add Campaigns link
4. **App.tsx** — add all 8 routes (7 internal + 1 public unsubscribe)
5. **CampaignsPage** — list view with status filters + "New Campaign" button
6. **CampaignSetupPage** — Mailchimp-style checklist layout
7. **AudienceSelector component** — source picker + filters + live count
8. **EmailBuilder + BlockLibrary + BlockPropertiesPanel** — drag-and-drop using @dnd-kit
9. **HtmlRenderer** — JSON → email HTML converter
10. **CampaignBuilderPage** — full-screen page wrapping the builder
11. **TemplatesPage** — gallery of saved templates
12. **CampaignSettingsPage** — sender identities + suppressions management
13. **Edge functions** — send-campaign, send-test-campaign-email, estimate-campaign-recipients, track-campaign-event, campaign-unsubscribe, ai-improve-subject
14. **CampaignReportPage** — post-send analytics with Recharts
15. **ActivityTimeline** — extend with campaign event types
16. **UnsubscribePage** — public page

---

## Technical Notes & Risk Mitigations

- **No new email library**: Resend is already in use. The from-address for MVP will use `hello@globalyos.com` (same as all other system emails). Sender identity verification is a UI-only feature in MVP — the actual Resend domain auth is handled in Resend dashboard settings.
- **Builder drag-and-drop**: `@dnd-kit/core` and `@dnd-kit/sortable` are already installed — no new dependencies.
- **HTML generation**: Done client-side for preview, server-side (edge function) for actual send. Both use the same `HtmlRenderer` logic — on the server side it is inlined as a string template function.
- **Suppression check**: Checked in `send-campaign` edge function before each batch to ensure no newly-unsubscribed contacts are emailed.
- **Slug/token uniqueness**: `unsubscribe_token` uses `encode(gen_random_bytes(24), 'base64url')` — cryptographically random and URL-safe.
- **Campaign compliance gate**: The "Send" button is disabled unless the content JSON contains at least one `footer` block with an unsubscribe link. This is validated both client-side (UI warning) and server-side (edge function rejects if footer block missing).
- **Rate limiting on Resend**: Batches of 50 with a small delay between batches to stay within Resend free tier limits.
- **Mobile builder**: The builder itself is desktop-only (too complex for mobile). A "Mobile preview" toggle renders the canvas at 375px width, simulating mobile rendering.

---

## What Is NOT in MVP (Future Phases)
- Real-time Resend webhook for delivery/bounce events (infrastructure is ready — just needs a webhook endpoint registered in Resend + a `stripe-webhook`-style handler)
- Domain authentication (SPF/DKIM) wizard — instructions only in Settings
- A/B subject line testing
- Multi-step automation flows
- CSV import of external contacts
