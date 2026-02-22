
# Super Admin Features Page

## Overview
Add a new "Features" nav item and page to the Super Admin portal. This page will provide a centralized view of all feature flags across all organizations, allowing Super Admins to control feature access and visibility from one place.

## What will be built

### 1. New navigation item
- Add "Features" to the Super Admin top nav bar (between "Templates" and "Subscription")
- Route: `/super-admin/features`
- Icon: Flag (from lucide-react)

### 2. New SuperAdminFeatures page
A comprehensive features management page with:

**Features Master List (top section)**
- Grid of all available feature flags (chat, tasks, CRM, workflows, payroll, ask-ai, hiring, whatsapp, calls, omnichannel_inbox, ai_responder, telephony, forms, accounting, client_portal)
- Each card shows: icon, name, description, and how many organizations have it enabled (e.g., "12/45 orgs")

**Organization Feature Matrix (main section)**
- A searchable table listing all organizations
- Columns: Organization name, then one column per feature with toggle switches
- Search/filter by organization name
- Bulk actions: "Enable All" / "Disable All" per feature column
- Quick view of which orgs have which features enabled

### 3. Files to create/modify

| File | Action |
|------|--------|
| `src/pages/super-admin/SuperAdminFeatures.tsx` | Create - new page component |
| `src/components/super-admin/SuperAdminLayout.tsx` | Edit - add "Features" nav item |
| `src/App.tsx` | Edit - add route + lazy import |

## Technical Details

- Queries `organization_features` table joined with `organizations` to build the matrix
- Reuses the same `AVAILABLE_FEATURES` definition from `OrganizationFeaturesManager.tsx` (will extract to a shared constant)
- Uses existing `supabase.from("organization_features").upsert()` pattern for toggling
- Existing per-org feature manager on the org detail page remains unchanged
- No database changes needed -- uses the existing `organization_features` table
