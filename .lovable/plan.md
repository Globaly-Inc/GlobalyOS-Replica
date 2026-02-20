
## Add Missing Feature Settings to Org Settings + Setup Guidance on Homepage

### Problem
1. Several enabled features (Hiring, Telephony, Omni-Channel Inbox, WhatsApp, Chat) have no corresponding entry in the Organization Settings sub-nav -- admins cannot discover or configure them from a central place.
2. There is no guidance on the homepage telling Owners/Admins which enabled features still need configuration (e.g., no phone numbers provisioned, no inbox channels connected, no hiring pipeline set up).

---

### Part 1: Add Missing Feature Settings to Org Settings Sub-Nav

**File: `src/components/SettingsSubNav.tsx`**

Add the following entries to `settingsSubNavItems` (after existing items, before Billing):

| Name | href | Icon | Feature Flag | Notes |
|------|------|------|-------------|-------|
| Hiring | `/settings/hiring` | UserPlus | `hiring` | Links to existing HiringSettings page content |
| Inbox | `/settings/inbox` | Inbox | `omnichannel_inbox` | Channel management, templates |
| Telephony | `/settings/telephony` | Phone | `telephony` | Number provisioning, IVR, usage |

**New Settings Pages to Create:**

1. **`src/pages/settings/SettingsHiring.tsx`**
   - Mirrors existing `/hiring/settings` content
   - Uses standard `PageHeader` + Card layout
   - Links/redirects to the existing HiringSettings component or embeds its tab content (pipeline, assignments, emails)

2. **`src/pages/settings/SettingsInbox.tsx`**
   - Standard `PageHeader` + Card layout
   - Tabs: Channels, Templates, Analytics
   - Each tab links to or embeds the existing inbox settings pages

3. **`src/pages/settings/SettingsTelephony.tsx`**
   - Standard `PageHeader` + Card layout
   - Tabs: Phone Numbers, IVR, Usage
   - Links to or embeds the existing telephony pages

**File: `src/App.tsx`**
- Register routes: `settings/hiring`, `settings/inbox`, `settings/telephony`
- Each wrapped with `OrgProtectedRoute` and relevant `FeatureProtectedRoute`

**Alternative (simpler approach -- recommended):**
Instead of duplicating page content, create lightweight settings pages that show a description card with a button linking to the feature's dedicated settings area. This matches the existing pattern used for Hiring in `Settings.tsx` ("Open Hiring Settings" button). This avoids maintaining two copies of the same UI.

---

### Part 2: Homepage Setup Guidance Banner for Owners/Admins

**New Component: `src/components/home/FeatureSetupGuide.tsx`**

A card/banner shown only to users with `isOwner` or `isAdmin` role that checks which features are enabled but not yet configured, and displays actionable setup steps.

**Logic:**
- Query enabled feature flags via `useFeatureFlags()`
- For each enabled feature, check a "readiness" condition:

| Feature | Check | "Not configured" condition |
|---------|-------|--------------------------|
| Hiring | Query `hiring_pipelines` table | No pipeline stages exist |
| Omni-Channel Inbox | Query `inbox_channels` table | No channels connected |
| Telephony | Query `org_phone_numbers` table | No phone numbers provisioned |
| CRM | Query `crm_custom_fields` table | No custom fields (optional, low priority) |
| Workflows | Query `workflow_templates` table | No templates exist |

- Each incomplete item renders as a compact card with:
  - Feature icon and name
  - Brief description of what needs to be done ("Connect your first messaging channel")
  - "Set up" button linking to the relevant settings page
  - Dismiss option (stored in localStorage per feature)

**UI Design:**
- Appears below the hero section, above the employee profile prompt
- Uses an amber/warning Card style consistent with existing admin prompts
- Title: "Complete Your Setup" with a checklist icon
- Shows a progress indicator (e.g., "3 of 5 features configured")
- Collapsible -- can be minimized but not permanently hidden (unless all features are configured)

**File: `src/pages/Home.tsx`**
- Import and render `FeatureSetupGuide` after `AdminSetup` and before `HomeHeroSection`
- Only rendered when `isAdmin || isOwner` is true

---

### Technical Details

**New files:**
| File | Purpose |
|------|---------|
| `src/pages/settings/SettingsHiring.tsx` | Hiring settings entry in org settings |
| `src/pages/settings/SettingsInbox.tsx` | Inbox/channels settings entry |
| `src/pages/settings/SettingsTelephony.tsx` | Telephony settings entry |
| `src/components/home/FeatureSetupGuide.tsx` | Homepage setup guidance for admins |

**Modified files:**
| File | Change |
|------|--------|
| `src/components/SettingsSubNav.tsx` | Add Hiring, Inbox, Telephony nav items |
| `src/App.tsx` | Register 3 new settings routes |
| `src/pages/Home.tsx` | Render `FeatureSetupGuide` for admins/owners |

**Database queries (read-only, no migrations needed):**
- `hiring_pipelines` -- check if any rows exist for org
- `inbox_channels` -- check if any rows exist for org
- `org_phone_numbers` -- check if any active rows exist for org
- `workflow_templates` -- check if any rows exist for org

**Permissions:**
- Setup guide visible only to owner/admin roles
- Settings pages follow existing role-based access patterns
- All queries scoped by `organization_id` from session context
