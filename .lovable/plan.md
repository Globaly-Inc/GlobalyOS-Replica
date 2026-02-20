

## Move Feature Setup Guide to Right Sidebar

### What Changes
The "Complete Your Setup" guide will be moved from the main content area on the Home page into the right sidebar, positioned just before the "KPI Updates Due" card. It will remain visible only to admins and owners.

### Changes Required

**1. Remove from Home.tsx (main content area)**
- Remove the `FeatureSetupGuide` import and its rendering block (the `{(isAdmin || isOwner) && <FeatureSetupGuide />}` section).

**2. Add to HomeSidebar.tsx (right sidebar)**
- Import `FeatureSetupGuide` and `useUserRole`.
- Render `<FeatureSetupGuide />` wrapped in role checks (`isAdmin || isOwner`) directly before the `<PendingKpiUpdates />` component (line 62).
- The component already handles its own visibility logic (hides when all features are configured or dismissed), so no extra logic is needed in the sidebar.

**3. Enhance FeatureSetupGuide.tsx to cover all features**
- Expand the `FEATURE_CHECKS` array to include **all** feature-flag-gated modules, not just the current 4 (hiring, omnichannel_inbox, telephony, workflows). Add checks for:
  - **CRM** -- check if any contacts or deals exist.
  - **Chat** -- check if any chat channels exist.
  - **Tasks** -- check if any task boards exist.
  - **Payroll** -- check if payroll settings are configured.
  - **Accounting** -- check if a chart of accounts or ledger exists.
  - **Forms** -- check if any form templates exist.
- Each new entry gets an icon, label, description, settings/setup path, and a readiness query.
- The readiness `queryFn` will be extended with additional checks for the new features.
- The card styling will be slightly adjusted (smaller padding) to fit the sidebar width comfortably.

### Technical Details

**Sidebar rendering order (after change):**
1. PendingLeaveApprovals
2. PendingWfhApprovals
3. **FeatureSetupGuide** (new position -- admin/owner only)
4. PendingKpiUpdates
5. NotCheckedInCard
6. ... (rest unchanged)

**New feature readiness checks (inside the existing `queryFn`):**
- `crm`: query `crm_contacts` count > 0
- `chat`: query `chat_channels` count > 0
- `tasks`: query `task_boards` count > 0
- `payroll`: query `payroll_settings` or equivalent count > 0
- `accounting`: query `chart_of_accounts` count > 0
- `forms`: query `form_templates` count > 0

Tables that don't exist yet will be handled gracefully -- the check returns `false` (not configured) so the setup card shows, which is the correct behavior.

**No database changes required.** This is purely a frontend reorganization and enhancement.

