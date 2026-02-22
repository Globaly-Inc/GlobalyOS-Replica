

# Redesign Features Page: All Features Listing with Detail Views

## Overview
Replace the current feature summary cards and organization matrix with a unified, comprehensive feature listing that includes both **Core** and **Feature-Flagged** features. Each feature will be clickable, leading to a Feature Detail page where Super Admins can manage all settings for that feature.

## What will change

### 1. Redesigned Features Page (`SuperAdminFeatures.tsx`)
Replace the current two-section layout (summary cards + org matrix table) with a single, clean feature listing:

- **All Features Grid/List** showing every feature in the system (core + flagged)
- Each feature card displays:
  - Icon, name, description
  - Category badge: "Core" (always-on) or "Flagged" (controllable)
  - For flagged features: org adoption count (e.g., "3/7 orgs")
  - For core features: "All orgs" indicator
- Clicking a feature card navigates to `/super-admin/features/:featureName`

### 2. New Feature Detail Page (`SuperAdminFeatureDetail.tsx`)
A dedicated page for managing a single feature, with sections:

- **Overview**: Feature name, description, category, status
- **Feature Type**: Toggle between Core (always-on) and Flagged (controllable) -- informational display
- **Organization Access** (for flagged features): The existing per-org toggle matrix but scoped to this single feature -- list of all orgs with enable/disable switches, bulk enable/disable
- **Subscription Tier Assignment**: Assign which subscription plans include this feature (informational/future-ready section with plan badges)
- **Release Notes / Changelog**: Simple text area for internal notes about the feature

### 3. New Route
- Add `/super-admin/features/:featureName` route to `App.tsx`

### Files to create/modify

| File | Action |
|------|--------|
| `src/pages/super-admin/SuperAdminFeatures.tsx` | Rewrite -- replace cards + matrix with unified feature listing |
| `src/pages/super-admin/SuperAdminFeatureDetail.tsx` | Create -- new feature detail/management page |
| `src/App.tsx` | Edit -- add new route for feature detail |

### Technical Details

- The `MASTER_FEATURE_REGISTRY` from `FeatureAuditDialog.tsx` will be extracted into a shared constant file (`src/constants/features.ts`) so both the audit dialog, features page, and detail page can reuse it
- The feature detail page will use the same `organization_features` table and upsert pattern for toggling per-org access
- Core features will show as read-only in the detail page (no org toggles needed since they are always on)
- No database changes required -- all data comes from existing `organization_features` table and the hardcoded registry
- The existing Audit System button and dialog remain unchanged
- Navigation uses `react-router-dom` with the feature name as URL param

