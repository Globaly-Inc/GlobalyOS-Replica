

# CRM Enhancement Plan: Inline Editing, Custom Fields, Tags, Merge & Timeline

## Overview
Five major enhancements to the CRM module, building on the existing contact/company profile pages and service hooks.

---

## 1. Inline Editing on Profile Pages

Replace the read-only `InfoItem` components on `CRMContactProfile` and `CRMCompanyProfile` with the existing `EditableField` component (already used in `TeamMemberProfile`).

### Changes
- **`src/pages/CRMContactProfile.tsx`**: Replace all `InfoItem` usages in the left sidebar with `EditableField`. Each field calls `useUpdateCRMContact` on save. The header name and job title become editable via `ClickToEdit`. Rating becomes a clickable dropdown.
- **`src/pages/CRMCompanyProfile.tsx`**: Same pattern -- replace `InfoItem` with `EditableField` for all company fields. Company name and industry editable via `ClickToEdit`.
- No database changes needed -- all fields already exist.

---

## 2. Custom Fields per Organization

Allow admins to define extra fields (text, number, date, dropdown, checkbox) for contacts and/or companies. Values are stored as JSONB.

### Database Migration

**New table: `crm_custom_fields`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| organization_id | uuid FK NOT NULL | |
| entity_type | text NOT NULL | 'contact' or 'company' |
| field_name | text NOT NULL | Display label |
| field_key | text NOT NULL | Slug key for JSONB storage |
| field_type | text NOT NULL | text, number, date, select, checkbox |
| options | jsonb | For select type: list of options |
| is_required | boolean DEFAULT false | |
| sort_order | integer DEFAULT 0 | |
| created_at | timestamptz | |

**Add columns to existing tables:**
- `crm_contacts`: add `custom_fields jsonb default '{}'::jsonb`
- `crm_companies`: add `custom_fields jsonb default '{}'::jsonb`

**RLS**: Same org-scoped pattern as other CRM tables.

### New Files
- **`src/components/crm/CRMCustomFieldsManager.tsx`** -- Admin UI to define custom fields (add/edit/delete/reorder). Accessible from a "Custom Fields" section in CRM settings or a gear icon on the profile page.
- **`src/components/crm/CRMCustomFieldsDisplay.tsx`** -- Renders custom fields on the profile page as editable fields. Reads field definitions, renders appropriate input type, saves to `custom_fields` JSONB.
- **`src/services/useCRMCustomFields.ts`** -- Hooks: `useCRMCustomFields(entityType)`, `useCreateCRMCustomField`, `useUpdateCRMCustomField`, `useDeleteCRMCustomField`.
- **`src/pages/CRMSettings.tsx`** -- Settings page for CRM with tabs: Custom Fields, Tags.

### Routing
- Add `crm/settings` route in `App.tsx` pointing to `CRMSettings`.

---

## 3. Tags Management, Filtering & Bulk Tagging

### New table: `crm_tags`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| organization_id | uuid FK NOT NULL | |
| name | text NOT NULL | |
| color | text | Hex color for badge |
| created_at | timestamptz | |
| UNIQUE(organization_id, name) | | |

This provides a master list of tags. Contacts already have a `tags text[]` column; we'll use the master list for autocomplete and consistency.

### New Files
- **`src/components/crm/CRMTagsManager.tsx`** -- CRUD for org tags (inside CRM Settings page). Add, rename, change color, delete tags.
- **`src/components/crm/TagSelector.tsx`** -- Reusable autocomplete multi-select for adding/removing tags on a contact. Used on the profile page and in bulk actions.
- **`src/services/useCRMTags.ts`** -- Hooks: `useCRMTags()`, `useCreateCRMTag`, `useDeleteCRMTag`.

### Modifications
- **`src/components/crm/ContactListView.tsx`**: Add tag filter dropdown in the filter bar. Add bulk action toolbar (appears when contacts are selected) with "Add Tag" and "Remove Tag" bulk operations using `useUpdateCRMContact` in a loop.
- **`src/pages/CRMContactProfile.tsx`**: Replace static tag badges with interactive `TagSelector` component for inline tag editing.
- **`src/pages/CRMSettings.tsx`**: Add "Tags" tab alongside "Custom Fields".
- **`src/types/crm.ts`**: Add `CRMTag` interface and update `CRMContactFilters` with `tags?: string[]`.
- **`src/services/useCRM.ts`**: Update `useCRMContacts` to support tag-based filtering using `tags.cs.{tagValue}` (Postgres array contains).

---

## 4. Duplicate Detection & Merge

### How it Works
- **Detection**: Query contacts/companies by matching email, phone, or name similarity. Show a "Possible Duplicates" alert on the profile page and a dedicated "Find Duplicates" view.
- **Merge**: Select a primary record, preview combined data, confirm. Activities and linked contacts (for companies) are reassigned to the primary record; the duplicate is deleted.

### New Files
- **`src/components/crm/DuplicateDetector.tsx`** -- Card shown on profile pages when duplicates are found. Shows matching records with a "Merge" button.
- **`src/components/crm/MergeDialog.tsx`** -- Dialog to compare two records side-by-side, pick field values from either, and confirm merge.
- **`src/services/useCRMDuplicates.ts`** -- Hooks:
  - `useCRMDuplicateContacts(contactId)` -- finds contacts with same email/phone/name
  - `useCRMDuplicateCompanies(companyId)` -- finds companies with same name/email
  - `useMergeCRMContacts()` -- mutation that: updates primary with merged fields, reassigns activities, deletes duplicate
  - `useMergeCRMCompanies()` -- same for companies (also reassigns linked contacts)

### Modifications
- **`src/pages/CRMContactProfile.tsx`**: Add `DuplicateDetector` component below the profile header.
- **`src/pages/CRMCompanyProfile.tsx`**: Same.
- No new DB tables needed. Merge logic is client-side using existing update/delete mutations wrapped in a sequence.

---

## 5. Unified Activity Timeline

Replace the current separate "Activity" and "Notes" tabs with a single chronological timeline showing all interaction types with distinct visual treatments.

### Database Changes
- **`crm_activity_log`**: Add columns:
  - `subject text` -- short title/subject line for calls/meetings/emails
  - `duration_minutes integer` -- for calls/meetings
  - `metadata jsonb default '{}'::jsonb` -- flexible extra data (email recipients, meeting attendees, etc.)

### New Files
- **`src/components/crm/ActivityTimeline.tsx`** -- Unified timeline component:
  - Vertical timeline with colored dots per activity type (note=gray, call=green, email=blue, meeting=purple, task=orange)
  - Each item shows: icon, type badge, subject/content, employee name + avatar, timestamp
  - Filter pills at top: All | Notes | Calls | Emails | Meetings | Tasks
  - "Log Activity" dropdown button with type options (Note, Call, Email, Meeting, Task)
- **`src/components/crm/LogActivityDialog.tsx`** -- Dialog to log a new activity with type-specific fields:
  - Note: content textarea
  - Call: subject, content, duration
  - Email: subject, content
  - Meeting: subject, content, duration
  - Task: subject, content

### Modifications
- **`src/pages/CRMContactProfile.tsx`**: Replace the two-tab (Activity + Notes) setup with single `ActivityTimeline` component.
- **`src/pages/CRMCompanyProfile.tsx`**: Same -- replace Activity + Notes tabs with `ActivityTimeline`. Keep the "Contacts" tab.
- **`src/types/crm.ts`**: Update `CRMActivity` interface to include `subject`, `duration_minutes`, `metadata`.
- **`src/services/useCRM.ts`**: Update `useCreateCRMActivity` input type to accept new fields.

---

## Implementation Sequence

1. **Database migration** -- custom_fields columns, crm_custom_fields table, crm_tags table, activity_log new columns. Single migration file.
2. **Inline editing** -- Update both profile pages to use `EditableField` and `ClickToEdit`.
3. **Activity Timeline** -- New components, replace tabs on both profile pages.
4. **Tags system** -- Tags table hooks, TagSelector, tag filtering in list view, bulk tagging.
5. **Custom Fields** -- Custom fields manager, display on profile pages, CRM settings page with routing.
6. **Duplicate detection & merge** -- Detection hooks, DuplicateDetector card, MergeDialog.

---

## Files Summary

### New Files (11)
1. `supabase/migrations/..._crm_enhancements.sql`
2. `src/services/useCRMCustomFields.ts`
3. `src/services/useCRMTags.ts`
4. `src/services/useCRMDuplicates.ts`
5. `src/components/crm/CRMCustomFieldsManager.tsx`
6. `src/components/crm/CRMCustomFieldsDisplay.tsx`
7. `src/components/crm/CRMTagsManager.tsx`
8. `src/components/crm/TagSelector.tsx`
9. `src/components/crm/DuplicateDetector.tsx`
10. `src/components/crm/MergeDialog.tsx`
11. `src/components/crm/ActivityTimeline.tsx`
12. `src/components/crm/LogActivityDialog.tsx`
13. `src/pages/CRMSettings.tsx`

### Modified Files (6)
1. `src/pages/CRMContactProfile.tsx` -- inline editing, timeline, duplicates, custom fields, tags
2. `src/pages/CRMCompanyProfile.tsx` -- inline editing, timeline, duplicates, custom fields
3. `src/components/crm/ContactListView.tsx` -- tag filtering, bulk tagging
4. `src/types/crm.ts` -- new interfaces and updated types
5. `src/services/useCRM.ts` -- tag filter support, activity updates
6. `src/App.tsx` -- add `crm/settings` route

