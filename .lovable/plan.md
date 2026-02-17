

# CRM Module Implementation Plan

## Overview
Build a full CRM module with **Contact** and **Company** management, following the design from the uploaded reference and mirroring the Team Member Profile layout for detail pages. Companies and Contacts have a one-to-many relationship (one company can have multiple contacts).

---

## Database Schema

### Tables to Create

**`crm_companies`**
- `id` (uuid, PK)
- `organization_id` (uuid, FK to organizations, NOT NULL)
- `name` (text, NOT NULL)
- `industry` (text)
- `website` (text)
- `phone` (text)
- `email` (text)
- `address_street`, `address_city`, `address_state`, `address_postcode`, `address_country` (text)
- `logo_url` (text)
- `notes` (text)
- `rating` (text) -- hot / warm / cold
- `source` (text) -- how the company was added
- `created_by` (uuid, FK to employees)
- `created_at`, `updated_at` (timestamptz)

**`crm_contacts`**
- `id` (uuid, PK)
- `organization_id` (uuid, FK to organizations, NOT NULL)
- `company_id` (uuid, FK to crm_companies, nullable) -- links contact to company
- `first_name` (text, NOT NULL)
- `last_name` (text)
- `email` (text)
- `phone` (text)
- `job_title` (text)
- `avatar_url` (text)
- `address_street`, `address_city`, `address_state`, `address_postcode`, `address_country` (text)
- `notes` (text)
- `rating` (text) -- hot / warm / cold
- `source` (text) -- walk-in-clients, web-form, etc.
- `is_archived` (boolean, default false)
- `tags` (text[])
- `date_of_birth` (date)
- `created_by` (uuid, FK to employees)
- `created_at`, `updated_at` (timestamptz)

**`crm_activity_log`**
- `id` (uuid, PK)
- `organization_id` (uuid, NOT NULL)
- `contact_id` (uuid, FK to crm_contacts, nullable)
- `company_id` (uuid, FK to crm_companies, nullable)
- `employee_id` (uuid, FK to employees) -- who performed it
- `type` (text) -- note, call, email, meeting, task
- `content` (text)
- `created_at` (timestamptz)

### RLS Policies
- All three tables: scoped by `organization_id` matching the user's org membership
- SELECT/INSERT/UPDATE/DELETE policies checking `organization_id IN (SELECT organization_id FROM employees WHERE user_id = auth.uid())`

### Feature Flag
- Enable the existing `crm` feature flag for the user's organization

---

## Routing (in App.tsx)

Add nested CRM routes under the existing `/crm` path:

```text
/crm                    -> CRM landing (contacts list, default)
/crm/contacts           -> Contact listing
/crm/contacts/:id       -> Contact detail (dialog or page)
/crm/companies          -> Company listing
/crm/companies/:id      -> Company detail (dialog or page)
```

Since the reference design shows a left sidebar with categories (All Contacts, Enquiries, Prospects, Clients, Archived), the CRM page will use a layout similar to Tasks: **left sidebar + main content area**.

---

## Components Structure

### Layout
- **`src/pages/CRM.tsx`** -- Main CRM page with inner routing via tabs/state (Contacts vs Companies)
- **`src/components/crm/CRMSidebar.tsx`** -- Left sidebar with:
  - "All Contacts" / "Enquiries" / "Prospects" / "Clients" / "Archived" (filter by rating/status)
  - "Saved Filters" section
  - "Last Opened" section (local state)
  - Switch between Contacts / Companies views
- **`src/components/crm/ContactListView.tsx`** -- Table-style listing matching the reference design
  - Columns: checkbox, Avatar+Name, Email, Actions (3-dot), Phone, Source, Rating
  - Search bar, Filters, Manage Columns toggle, Grid/List view toggle
  - Pagination controls
- **`src/components/crm/CompanyListView.tsx`** -- Similar table for companies
  - Columns: Logo+Name, Industry, Phone, Website, Contacts count, Rating
- **`src/components/crm/ContactDetailDialog.tsx`** -- Profile-style detail in a Dialog (like Task detail)
  - Tabs: Overview, Activity, Notes
  - Overview: avatar, name, job title, company link, contact info, address, tags
  - Styled like TeamMemberProfile with card sections and editable fields
- **`src/components/crm/CompanyDetailDialog.tsx`** -- Company profile in Dialog
  - Overview: logo, company name, industry, website, contact info, address
  - "Contacts" tab showing linked contacts
  - Activity tab
- **`src/components/crm/AddContactDialog.tsx`** -- Create new contact form
- **`src/components/crm/AddCompanyDialog.tsx`** -- Create new company form

### Services
- **`src/services/useCRM.ts`** -- React Query hooks:
  - `useCRMContacts(filters)` / `useCRMContact(id)`
  - `useCreateCRMContact` / `useUpdateCRMContact` / `useDeleteCRMContact`
  - `useCRMCompanies(filters)` / `useCRMCompany(id)`
  - `useCreateCRMCompany` / `useUpdateCRMCompany` / `useDeleteCRMCompany`
  - `useCRMActivities(contactId?, companyId?)`
  - `useCreateCRMActivity`

### Types
- **`src/types/crm.ts`** -- CRMContact, CRMCompany, CRMActivity interfaces

---

## UI Design (Matching Reference)

### Contact Listing
- Header: "Contacts" title with "Import Contacts" and "+ Create New" buttons (top-right)
- Search bar with assignee filter, "Show Archived" toggle, "Filters" button, "Manage Columns"
- Grid/List view toggle icons
- Table with sortable columns: Name (with avatar), Email, Actions, Phone, Source, Rating (with colored icons: Hot=red fire, Warm=orange handshake, Cold=blue snowflake)
- Pagination at bottom: page numbers + "Result per page" dropdown + total count

### Contact/Company Detail
- Opens as a centered Dialog (consistent with Task detail pattern)
- Layout mirrors TeamMemberProfile:
  - Left column: avatar/logo, name, title, company, key info cards
  - Right column: tabs for Activity, Notes
  - Editable fields using the existing `EditableField` and `ClickToEdit` components

---

## Technical Details

### Files to Create
1. `supabase/migrations/..._crm_tables.sql` -- DB migration
2. `src/types/crm.ts` -- Type definitions
3. `src/services/useCRM.ts` -- React Query hooks
4. `src/pages/CRM.tsx` -- Rewrite from ComingSoon to full module
5. `src/components/crm/CRMSidebar.tsx`
6. `src/components/crm/ContactListView.tsx`
7. `src/components/crm/CompanyListView.tsx`
8. `src/components/crm/ContactDetailDialog.tsx`
9. `src/components/crm/CompanyDetailDialog.tsx`
10. `src/components/crm/AddContactDialog.tsx`
11. `src/components/crm/AddCompanyDialog.tsx`

### Files to Modify
1. `src/App.tsx` -- Add CRM sub-routes (`/crm/*`)
2. `src/types/index.ts` -- Export CRM types
3. `src/services/index.ts` -- Export CRM service hooks
4. `src/components/TopNav.tsx` -- Remove `isStatic` and `ownerOnly` from CRM nav item (if not already done)

### Implementation Sequence
1. Database migration (tables + RLS + enable feature flag)
2. Types and service hooks
3. Contact listing with sidebar
4. Company listing
5. Contact detail dialog (profile-style)
6. Company detail dialog (profile-style, with linked contacts)
7. Create/edit dialogs for both
8. Wire routing and navigation

