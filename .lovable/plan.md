

## Make Telephony Independently Gatable and More Discoverable

### Problem
The Twilio-based SMS and calling features are hidden inside the Omni-Channel Inbox with no dedicated feature flag or clear navigation entry point. Super Admins cannot independently enable/disable telephony, and org admins may not realize the features exist.

### Changes

#### 1. Add a "Telephony (SMS & Calls)" Feature Flag

**File: `src/components/super-admin/OrganizationFeaturesManager.tsx`**
- Add a new entry to `AVAILABLE_FEATURES`:
  - name: `telephony`
  - label: "Telephony (SMS & Calls)"
  - description: "Twilio-powered SMS messaging, outbound calling, IVR, and number provisioning"
  - icon: Phone

**File: `src/hooks/useFeatureFlags.tsx`**
- Add `"telephony"` to the `FeatureName` union type
- Add `telephony: false` to the `defaultFlags` and `FeatureFlags` interface

#### 2. Gate Telephony Routes and UI Behind the New Flag

**File: `src/App.tsx`**
- Wrap the `/crm/inbox/numbers` and `/crm/inbox/usage` routes with an additional `FeatureProtectedRoute feature="telephony"` check (still also requires `crm`)

**File: `src/components/inbox/InboxSubNav.tsx`**
- Conditionally show the "Numbers" and "Usage" tabs only when the `telephony` feature flag is enabled
- Import and use `useFeatureFlags` to check `isEnabled('telephony')`

**File: `src/pages/crm/inbox/InboxChannelsPage.tsx`**
- Conditionally show the SMS channel card only when `telephony` is enabled

**File: `src/components/inbox/InboxContactPanel.tsx`**
- Conditionally show the "Call" button only when `telephony` is enabled

#### 3. Add Telephony Quick-Access to CRM Sub-Navigation

**File: `src/components/crm/CRMSubNav.tsx`**
- No changes needed -- telephony is accessed via Inbox sub-tabs, which is the correct UX hierarchy

### Technical Details

- The database table `organization_features` already supports arbitrary feature names via upsert, so no migration is needed
- The `telephony` flag is independent of `omnichannel_inbox` -- an org could have the full inbox without telephony, or telephony could require `omnichannel_inbox` as a prerequisite (recommended: require both `crm` and `omnichannel_inbox` to be enabled for telephony to appear)
- All route-level gating uses the existing `FeatureProtectedRoute` component pattern

### Summary of Files Changed
| File | Change |
|------|--------|
| `OrganizationFeaturesManager.tsx` | Add "telephony" to AVAILABLE_FEATURES |
| `useFeatureFlags.tsx` | Add "telephony" to FeatureName type and defaults |
| `App.tsx` | Add telephony gate on numbers/usage routes |
| `InboxSubNav.tsx` | Conditionally render Numbers/Usage tabs |
| `InboxChannelsPage.tsx` | Conditionally render SMS channel card |
| `InboxContactPanel.tsx` | Conditionally render Call button |

