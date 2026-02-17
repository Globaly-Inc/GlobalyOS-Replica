

# Convert CRM Detail Views to Full Pages + Feature Enhancement Suggestions

## Part 1: Contact & Company Detail as Separate Pages

### What Changes

Currently, Contact and Company details open as pop-up Dialogs. This plan converts them into standalone pages at `/crm/contacts/:id` and `/crm/companies/:id`, using the same layout structure as the Team Member Profile page.

### Layout (Mirroring TeamMemberProfile)

Each detail page will have:
- **Back button** at top ("Back to Contacts" / "Back to Companies") using `OrgLink`
- **Top Card**: Avatar/Logo, Name, Job Title/Industry, Rating badge, Email, Phone, Company link (for contacts), Tags
- **Below**: A 3-column grid (1 left + 2 right) with:
  - **Left column**: Info cards (Contact Details, Address, Tags, Source)
  - **Right column (2-col span)**: Tabbed content (Activity, Notes, Deals, and for companies: Linked Contacts)

### Routing Changes (App.tsx)

Add two new routes inside the CRM feature-protected section:
```
/crm/contacts/:id  -->  CRMContactProfile page
/crm/companies/:id -->  CRMCompanyProfile page
```

### Files to Create

1. **`src/pages/CRMContactProfile.tsx`** -- Full-page contact detail
   - Uses `useParams()` to get contact ID
   - Fetches contact via `useCRMContact(id)`
   - Fetches activities via `useCRMActivities(id)`
   - Top card with avatar, name, job title, company link, rating, email
   - Left sidebar cards: Personal Details (editable fields), Address, Tags, Source
   - Right tabs: Activity feed, Notes (with add note form), Deals (future)

2. **`src/pages/CRMCompanyProfile.tsx`** -- Full-page company detail
   - Uses `useParams()` to get company ID
   - Fetches company via `useCRMCompany(id)`
   - Top card with logo, name, industry, rating, website, phone, email
   - Left sidebar cards: Company Details, Address, Source
   - Right tabs: Contacts (linked), Activity feed, Notes

### Files to Modify

3. **`src/App.tsx`** -- Add two new routes:
   - `crm/contacts/:id` pointing to `CRMContactProfile`
   - `crm/companies/:id` pointing to `CRMCompanyProfile`

4. **`src/components/crm/ContactListView.tsx`** -- Change row click from opening a dialog to navigating via `useOrgNavigation()` to `/crm/contacts/:id`. Remove the `ContactDetailDialog` import and usage.

5. **`src/components/crm/CompanyListView.tsx`** -- Same change: navigate to `/crm/companies/:id` on row click. Remove `CompanyDetailDialog` usage.

### Files to Delete (or keep as unused)

6. **`src/components/crm/ContactDetailDialog.tsx`** -- No longer needed (replaced by full page)
7. **`src/components/crm/CompanyDetailDialog.tsx`** -- No longer needed (replaced by full page)

---

## Part 2: Suggested CRM Feature Enhancements

Based on industry-leading CRMs (HubSpot, Salesforce, Pipedrive, Zoho), here are the most impactful features to add:

### High Priority (Core CRM)

| Feature | Description |
|---------|-------------|
| **Deals / Pipeline** | Kanban-style deal pipeline with stages (Lead, Qualified, Proposal, Negotiation, Won, Lost). Link deals to contacts and companies. |
| **Inline Editing on Profile** | Use `EditableField` and `ClickToEdit` components (already in codebase) to make contact/company fields editable directly on the profile page. |
| **Activity Types** | Expand beyond notes: Log calls, emails, meetings, and tasks with dedicated forms and icons. |
| **Contact/Company Merge** | Detect and merge duplicate contacts or companies. |
| **Import/Export (CSV)** | Bulk import contacts/companies from CSV. Export filtered lists. |

### Medium Priority (Productivity)

| Feature | Description |
|---------|-------------|
| **Tasks linked to Contacts** | Create follow-up tasks from a contact's profile, linked to the existing Tasks module. |
| **Email Integration** | Log emails as activities, or send emails directly from contact profile. |
| **Custom Fields** | Let admins define custom fields per organization for contacts and companies. |
| **Tags Management** | Tag-based filtering, bulk tagging, and a tag management settings page. |
| **Contact Timeline** | A unified chronological timeline showing all interactions (notes, calls, deals, emails) on the profile page. |

### Lower Priority (Advanced)

| Feature | Description |
|---------|-------------|
| **Lead Scoring** | Automatic scoring based on activity, rating, and engagement. |
| **Reports & Dashboards** | CRM-specific analytics: deals by stage, conversion rates, activity volume, revenue forecasts. |
| **Web Forms / Lead Capture** | Embeddable forms that create contacts automatically. |
| **Workflow Automation** | Auto-assign contacts, send reminders, change status based on triggers. |
| **Document Attachments** | Attach files (proposals, contracts) to contacts/companies. |

---

## Technical Details

### CRMContactProfile Page Structure

```text
Back to Contacts (button)
+--------------------------------------------------+
| [Avatar]  Name  |  Rating Badge  |  Status       |
|           Job Title - Company (link)              |
|           email@example.com                       |
+--------------------------------------------------+

+----------------+  +------------------------------+
| Contact Info   |  | [Activity] [Notes] [Deals]   |
| - Email        |  |                              |
| - Phone        |  |  Activity feed / Notes list  |
| - Address      |  |  with add note form          |
| - DOB          |  |                              |
+----------------+  +------------------------------+
| Tags           |
| Source          |
+----------------+
```

### Implementation Sequence

1. Create `CRMContactProfile.tsx` and `CRMCompanyProfile.tsx` pages
2. Add routes in `App.tsx`
3. Update `ContactListView` and `CompanyListView` to navigate instead of opening dialogs
4. Remove old dialog components

