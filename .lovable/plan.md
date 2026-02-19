
# CRM Navigation Restructure & Layout Consistency

## Summary of Changes

### What the User Wants
1. **Navigation**: Move "Contacts" and "Companies" into the CRM sub-navigation bar (same pattern as Team's sub-nav: Directory | Team Cal | Leave | Attendance | …)
2. **Layout**: Make the Contacts and Companies list pages match the GlobalyOS standard records layout — page-level header with title + subtitle + action button on the right, followed by a filter/tab bar, then the full-width table. Remove the left CRM sidebar entirely.

---

## Part 1 — Navigation Changes

### Add a CRM Sub-Nav (new `CRMSubNav` component or extend `SubNav.tsx`)

The existing `SubNav.tsx` only activates on Team-related paths. The cleanest approach is to:

- Add a new `CRMSubNav` component (mirroring `SubNav` / `SettingsSubNav` pattern), placed in `Layout.tsx` alongside the two existing sub-navs.
- It shows only when the current path is under `/crm`.

**Sub-nav items for CRM:**

| Label | Route | Icon |
|---|---|---|
| Contacts | `/crm/contacts` | `Users` |
| Companies | `/crm/companies` | `Building2` |
| Settings | `/crm/settings` | `Settings` (admin only) |

Currently the `crm` route renders the combined `CRM` page. We need two dedicated pages:
- `/crm/contacts` → `ContactsPage` (renders `ContactListView`)
- `/crm/companies` → `CompaniesPage` (renders `CompanyListView`)
- `/crm` → redirect to `/crm/contacts`

We also need the contact category filter (`all | enquiries | prospects | clients | archived`) moved from the sidebar into the page itself as tab pills — matching the GlobalyOS pattern.

### Router Changes (`App.tsx`)
```
/crm            → redirect to /crm/contacts
/crm/contacts   → ContactsPage (new)
/crm/companies  → CompaniesPage (new)
/crm/contacts/:id → (unchanged)
/crm/companies/:id → (unchanged)
/crm/settings   → (unchanged)
```

---

## Part 2 — Layout Changes (Leave-style records layout)

### Standard GlobalyOS Page Layout Pattern (from Leave History):

```text
┌──────────────────────────────────────────────────────────┐
│ [Icon] Page Title                    [Action Buttons...] │
│ Subtitle / description                                   │
├──────────────────────────────────────────────────────────┤
│ [Tab Pills: All | Enquiries | Prospects | Clients | Archived]  [Search] [Filters] │
├──────────────────────────────────────────────────────────┤
│                  Full-width Table                        │
│  ☐  Name  Email  Phone  Company  Tags  Rating  Actions   │
│  ──────────────────────────────────────────────────────  │
│  ...rows...                                              │
└──────────────────────────────────────────────────────────┘
```

### ContactsPage Changes:
- Replace the current in-component header (`px-6 py-4` block) with a proper page-level header matching the Leave pattern:
  - Icon (`Users`) + "Contacts" title + subtitle "Manage your contacts and leads"
  - `+ Create New` button top-right
- Move the category tabs (`All Contacts | Enquiries | Prospects | Clients | Archived`) from the left sidebar into a **tab pill bar** below the header (exactly like Leave's `Analytics | Records | Pending` tabs)
- Keep search + tag filter in the same bar as the tabs (right side)
- Remove the left `CRMSidebar` component entirely

### CompaniesPage Changes:
- Same page-level header pattern: `Building2` icon + "Companies" + subtitle
- `+ Add Company` button top-right
- No sub-category tabs needed (companies has only "all")
- Search in the filter bar

---

## Files to Create / Modify

### New files
- `src/components/crm/CRMSubNav.tsx` — sub-nav bar (Contacts | Companies | Settings)
- `src/pages/crm/ContactsPage.tsx` — thin wrapper rendering updated `ContactListView` with the category state
- `src/pages/crm/CompaniesPage.tsx` — thin wrapper rendering updated `CompanyListView`

### Files to Modify
- `src/components/ContactListView.tsx` — add page-level header + category tab pills; accept `category` as URL-param-driven state; remove need for sidebar prop
- `src/components/CompanyListView.tsx` — add page-level header
- `src/components/Layout.tsx` — add `<CRMSubNav />` alongside `<SubNav />` and `<SettingsSubNav />`
- `src/App.tsx` — add routes for `/crm/contacts` and `/crm/companies`; redirect `/crm` → `/crm/contacts`
- `src/pages/CRM.tsx` — simplify or replace with redirect
- `src/components/crm/CRMSidebar.tsx` — no longer used (can be deleted)

---

## Visual Result

**Before**: CRM has a left sidebar with Contacts/Companies toggle + category list.

**After**: CRM has a top sub-nav tab bar (like Team) and the page body follows the standard GlobalyOS records layout with tab pills for categories inline with the search bar — consistent with Leave History, Attendance, Hiring, etc.
