

# Add "Audit Features" Button to Super Admin Features Page

## Overview
Add an "Audit System" button to the Super Admin Features page that scans the codebase's routes, navigation items, and feature flags to identify any features that exist in the system but are missing from the AVAILABLE_FEATURES list. The audit will cover HR features, home page features, and all implemented modules.

## What will be built

### Audit Button and Dialog
- Add a "Audit System" button next to the page header
- When clicked, it runs a local audit comparing:
  - The current `AVAILABLE_FEATURES` list (15 feature flags)
  - A comprehensive master registry of ALL implemented features in the system
- Displays results in a dialog showing:
  - **Registered features** -- already in the feature flags list (with status indicator)
  - **Missing features** -- implemented in the system but not in the feature flags list
  - **Core features** -- always-on features that don't need flags (Home, Team, Wiki, etc.)
- Each missing feature will have a quick "Add to Feature Flags" button that inserts it into `organization_features`

### Master Feature Registry
A complete inventory of all implemented features, categorized:

**Core HRMS (always-on, no flag needed):**
- Home / Dashboard
- Team Directory
- Team Calendar
- Leave Management
- Attendance Tracking
- KPIs / OKRs
- Wiki / Knowledge Base
- Performance Reviews
- Org Chart
- Growth
- Notifications
- Settings

**Feature-Flagged (currently registered):**
- Chat, Tasks, CRM, Workflows, Payroll, Ask AI, Hiring, WhatsApp, Calls, Omnichannel Inbox, AI Responder, Telephony, Forms, Accounting, Client Portal

**Potentially Missing (the audit will surface these):**
- Any new modules added to routes/navigation but not yet added to AVAILABLE_FEATURES
- Sub-features within CRM (Campaigns, Scheduler, Products, Partners, etc.) that could be independently controlled

### Files to modify

| File | Action |
|------|--------|
| `src/pages/super-admin/SuperAdminFeatures.tsx` | Edit -- add Audit button, dialog, and master feature registry |

No database changes needed. The audit is purely a UI-side comparison tool that helps Super Admins verify completeness.

## Technical Details

- The master feature registry will be a hardcoded constant listing all known features with their category (core vs flagged), route paths, and descriptions
- The audit compares this registry against `AVAILABLE_FEATURES` to find gaps
- Results are shown in a `Dialog` with three tabs/sections: Core Features, Registered Flags, and Missing/Unregistered
- Missing features can be added to `AVAILABLE_FEATURES` (code-level) or flagged for developer action
- The audit also checks the `FeatureName` type in `useFeatureFlags.tsx` and the `OrganizationFeaturesManager.tsx` to surface any sync issues between these three sources of truth

