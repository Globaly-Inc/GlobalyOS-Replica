
# Settings Page Navigation Refactor: Sidebar Sub-Navigation

## Summary

Transform the Settings page from using a horizontal tab bar at the top to a sidebar-based sub-navigation pattern, consistent with the Team section's navigation. This will create a unified navigation experience across the application.

## Current State

| Aspect | Current Implementation |
|--------|----------------------|
| Settings navigation | Horizontal `TabsList` with 7-8 triggers at the top of the page |
| Team navigation | Horizontal `SubNav` bar with routes like `/team`, `/calendar`, `/leave-history` |
| Settings routes | Single route `/settings` with client-side tabs |
| Page layout | `PageHeader` + `Tabs` component with `TabsContent` sections |

## Proposed Architecture

### Navigation Model

Convert Settings to a route-based sub-navigation model similar to the Team section:

| Old Tab | New Route | Description |
|---------|-----------|-------------|
| Organization | `/settings` (default) | Organization details |
| Offices & Structure | `/settings/offices` | Offices, departments, positions |
| Projects | `/settings/projects` | Project management |
| KPIs | `/settings/kpis` | KPI generation settings |
| Workflows | `/settings/workflows` | Workflow templates (feature flag) |
| Hiring | `/settings/hiring` | Link to hiring settings (feature flag) |
| AI | `/settings/ai` | AI knowledge settings (feature flag) |
| Billing | `/settings/billing` | Subscription and billing |

### UI Layout

```text
+----------------------------------------------------------+
| GlobalyOS    [Org Switcher]    Home Team KPIs Wiki ...   |
+----------------------------------------------------------+
| [Settings icon] Organization | Offices | Projects | KPIs | Workflows | AI | Billing
+----------------------------------------------------------+
|                                                          |
| Organization Details                                     |
| Manage your organization's basic information             |
|                                                          |
|  +-- Card Content ------------------------------+        |
|  |  [Logo] Business Name: GlobalyOS             |        |
|  |  Legal Name: ...                              |        |
|  |  ...                                          |        |
|  +----------------------------------------------+        |
|                                                          |
+----------------------------------------------------------+
```

### Implementation Plan

**Phase 1: Create New Routes**

Update `src/App.tsx` to add nested settings routes:

```text
/org/:orgCode/settings              -> SettingsOrganization (default)
/org/:orgCode/settings/offices      -> SettingsOffices
/org/:orgCode/settings/projects     -> SettingsProjects
/org/:orgCode/settings/kpis         -> SettingsKpis
/org/:orgCode/settings/workflows    -> SettingsWorkflows (feature flag)
/org/:orgCode/settings/ai           -> SettingsAI (feature flag)
/org/:orgCode/settings/billing      -> SettingsBilling
```

**Phase 2: Create SettingsSubNav Component**

Create a new `SettingsSubNav.tsx` component following the same pattern as `SubNav.tsx`:

- Located in `src/components/SettingsSubNav.tsx`
- Uses the same styling as the Team sub-nav (sticky bar, border-b, backdrop-blur)
- Shows a Settings icon before the first nav item to indicate context
- Conditionally shows items based on feature flags
- Highlights the active route

**Phase 3: Create Individual Settings Pages**

Split the current monolithic Settings page into focused sub-pages:

| New Page File | Content |
|---------------|---------|
| `src/pages/settings/SettingsOrganization.tsx` | `OrganizationSettings` component |
| `src/pages/settings/SettingsOffices.tsx` | `OfficesStructureSettings` component |
| `src/pages/settings/SettingsProjects.tsx` | `ProjectsSettings` component |
| `src/pages/settings/SettingsKpis.tsx` | `KpiGenerationSettings` component |
| `src/pages/settings/SettingsWorkflows.tsx` | `WorkflowsSettings` component |
| `src/pages/settings/SettingsAI.tsx` | `AIKnowledgeSettings` component |
| `src/pages/settings/SettingsBilling.tsx` | `BillingSettings` component |

**Phase 4: Update Layout.tsx**

Modify `Layout.tsx` to render `SettingsSubNav` when on settings routes (similar to how `SubNav` is shown for team routes).

**Phase 5: Consistent Page Headers**

Each settings sub-page will have a consistent layout:

```tsx
<PageBody>
  <PageHeader 
    title="Organization" 
    subtitle="Manage your organization's basic information" 
  />
  <OrganizationSettings isOwner={isOwner} />
</PageBody>
```

### Technical Details

**SettingsSubNav Navigation Items**

```typescript
const settingsSubNavItems = [
  { name: 'Organization', href: '/settings', icon: Building2, end: true },
  { name: 'Offices', href: '/settings/offices', icon: Building2 },
  { name: 'Projects', href: '/settings/projects', icon: Briefcase },
  { name: 'KPIs', href: '/settings/kpis', icon: Target },
  { name: 'Workflows', href: '/settings/workflows', icon: ClipboardCheck, featureFlag: 'workflows' },
  { name: 'AI', href: '/settings/ai', icon: Sparkles, featureFlag: 'ask-ai' },
  { name: 'Billing', href: '/settings/billing', icon: CreditCard },
];
```

**Route Matching for SettingsSubNav**

```typescript
const isSettingsSection = 
  location.pathname.startsWith(`${basePath}/settings`);

if (!isSettingsSection) return null;
```

**Active Route Detection**

```typescript
const isActive = item.end 
  ? location.pathname === `${basePath}${item.href}`
  : location.pathname.startsWith(`${basePath}${item.href}`);
```

### Files to Create

| File | Description |
|------|-------------|
| `src/components/SettingsSubNav.tsx` | Settings sub-navigation component |
| `src/pages/settings/SettingsOrganization.tsx` | Organization settings page |
| `src/pages/settings/SettingsOffices.tsx` | Offices & Structure page |
| `src/pages/settings/SettingsProjects.tsx` | Projects settings page |
| `src/pages/settings/SettingsKpis.tsx` | KPI settings page |
| `src/pages/settings/SettingsWorkflows.tsx` | Workflows settings page |
| `src/pages/settings/SettingsAI.tsx` | AI settings page |
| `src/pages/settings/SettingsBilling.tsx` | Billing settings page |

### Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add nested settings routes |
| `src/components/Layout.tsx` | Render SettingsSubNav for settings routes |
| `src/pages/Settings.tsx` | Simplify to redirect to `/settings` or remove entirely |
| `src/components/TopNav.tsx` | Add Settings nav item with gear icon |

### UX Improvements

1. **URL-based Navigation**: Users can bookmark or share links to specific settings sections
2. **Back/Forward Support**: Browser navigation works naturally between settings sections  
3. **Consistent Pattern**: Matches the Team section navigation users are already familiar with
4. **Clear Visual Hierarchy**: Settings icon + section name clearly indicates context
5. **Feature-Gated Items**: Workflows, Hiring, AI only show when enabled

### Migration Notes

- The existing Settings.tsx can be kept as a redirect to `/settings` for backwards compatibility
- All existing component logic remains unchanged - only the navigation wrapper changes
- Links pointing to `/settings` will still work and show the Organization tab by default
