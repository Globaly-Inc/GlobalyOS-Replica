

# Implementation Plan: CRM Services Marketplace + Partners + Agent Portal + Product Fees

## Overview

This is a large-scale expansion of GlobalyOS covering 7 major feature areas. Given the scale, the implementation must be phased carefully. No existing tables for services, partners, or agent portals exist yet -- this is a greenfield build on top of the existing CRM, Client Portal, and Offices infrastructure.

## Existing Infrastructure to Reuse

- **CRM Contacts/Companies**: `crm_contacts`, `crm_companies` tables + UI components
- **Client Portal**: `client_portal_users`, `client_portal_sessions`, `client_cases`, OTP auth (`portal-send-otp`, `portal-verify-otp`, `portal-api`)
- **Offices**: `offices` table with org-scoped data
- **Documents**: `client_documents` table + `client-portal-documents` storage bucket
- **Messaging**: `client_case_threads`, `client_case_messages` tables
- **Tasks**: `client_case_tasks` table
- **Auth/Roles**: `user_roles` table with `has_role()` security definer function
- **Feature Flags**: `useFeatureFlags` hook for gating modules
- **CRM SubNav**: Existing tabbed navigation component

---

## Phase 1: Database Foundation (Migration)

Create all core tables in a single migration:

### 1a. CRM Services Catalog
```
crm_services
  id, organization_id, name, category, short_description, long_description
  service_type: 'direct' | 'represented_provider' | 'internal_only'
  provider_partner_id (FK -> crm_partners, nullable)
  visibility: 'internal' | 'client_portal' | 'agent_portal' | 'both_portals'
  status: 'draft' | 'published' | 'archived'
  tags (text[])
  eligibility_notes (text)
  required_docs_template (jsonb)
  workflow_stages (jsonb)
  sla_target_days (integer)
  created_by, created_at, updated_at

crm_service_offices (service <-> offices junction)
  id, service_id, office_id, organization_id
```

### 1b. Partners
```
crm_partners
  id, organization_id
  type: 'agent' | 'provider' | 'both'
  name, trading_name, website, phone, email
  address_street, address_city, address_state, address_postcode, address_country
  primary_contact_name, primary_contact_email, primary_contact_phone
  contract_status: 'active' | 'inactive'
  tags (text[]), compliance_docs (jsonb)
  notes (text)
  created_by, created_at, updated_at

crm_partner_branches
  id, partner_id, organization_id
  name, city, country
  created_at

partner_users (Agent portal accounts)
  id, organization_id, partner_id
  email, full_name, phone, avatar_url
  status: 'active' | 'suspended' | 'invited'
  last_login_at
  created_at, updated_at

partner_user_sessions (OTP sessions for agents)
  id, partner_user_id, token_hash, expires_at, revoked_at, created_at

partner_user_otp_codes
  id, partner_user_id, code_hash, expires_at, used, created_at

partner_customers (Agent-managed customers)
  id, organization_id, partner_id, partner_user_id
  first_name, last_name, email, phone
  date_of_birth, nationality, country_of_residency
  linked_crm_contact_id (FK -> crm_contacts, nullable)
  notes, custom_fields (jsonb)
  created_at, updated_at
```

### 1c. Service Applications
```
service_applications
  id, organization_id, service_id, office_id
  created_by_type: 'client' | 'agent' | 'staff'
  client_portal_user_id (FK -> client_portal_users, nullable)
  crm_contact_id (FK -> crm_contacts, nullable)
  partner_customer_id (FK -> partner_customers, nullable)
  agent_partner_id (FK -> crm_partners, nullable)
  agent_user_id (FK -> partner_users, nullable)
  provider_partner_id (FK -> crm_partners, nullable)
  status: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'completed'
  priority: 'low' | 'medium' | 'high'
  form_responses (jsonb)
  submitted_at, created_at, updated_at

service_application_status_history
  id, application_id, organization_id
  old_status, new_status, changed_by, notes, is_internal_note
  created_at

service_application_documents
  id, application_id, organization_id
  document_type, file_name, file_url, file_size, file_type
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by, review_notes
  uploaded_by_type: 'client' | 'agent' | 'staff'
  created_at

service_application_tasks
  id, application_id, organization_id
  title, description, assigned_to_type, assigned_to_id
  due_date, status: 'pending' | 'in_progress' | 'completed'
  created_at, updated_at

service_application_messages
  id, application_id, organization_id
  sender_type: 'client' | 'agent' | 'staff'
  sender_id, content, is_internal_note
  created_at
```

### 1d. Product Fees (from uploaded documents)
```
crm_product_fee_types
  id, organization_id
  name (varchar)
  is_system (boolean -- true for 29 predefined types)
  created_at

crm_product_fee_options
  id, organization_id, service_id
  name (varchar, "Default Fees" for default)
  is_default (boolean)
  applicable_partner_branches (jsonb -- array of branch IDs, null = all)
  applicable_client_countries (jsonb -- array of country codes, null = all)
  created_by, created_at, updated_at

crm_product_fee_items
  id, organization_id, fee_option_id
  revenue_type: 'revenue_from_client' | 'commission_from_partner'
  fee_structure_type: 'equal' | 'custom'
  installment_alias: 'full_fee' | 'per_year' | 'per_month' | 'per_week' | 'per_term' | 'per_semester' | 'per_trimester'
  installment_name (varchar, nullable -- for custom installments like "1st Semester")
  installment_order (integer)
  fee_type_id (FK -> crm_product_fee_types)
  description (varchar(120))
  classification: 'income' | 'payable' (for revenue_from_client only, nullable)
  installment_amount (numeric)
  num_installments (integer, for equal only)
  total_fee (numeric)
  claimable_terms (integer, for commission only)
  commission_percentage (numeric, for commission only)
  commission_amount (numeric, for commission only)
  created_at, updated_at

application_fee_overrides
  id, organization_id, application_id
  fee_option_id (FK -> crm_product_fee_options)
  overridden_items (jsonb)
  tax_mode: 'inclusive' | 'exclusive'
  tax_rate_id (uuid, nullable)
  discount_amount (numeric), discount_description (varchar)
  created_by, created_at, updated_at

payment_schedules
  id, organization_id, application_id
  schedule_type: 'manual' | 'auto'
  installment_start_date (date)
  installment_interval (varchar)
  created_by, created_at, updated_at

payment_schedule_items
  id, schedule_id, organization_id
  installment_name (varchar)
  installment_type (varchar)
  is_claimable (boolean)
  installment_date (date)
  invoice_date (date)
  auto_invoicing (boolean)
  invoice_type (varchar)
  amount (numeric)
  commission_amount (numeric)
  discount_amount (numeric)
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  created_at, updated_at
```

### 1e. Partner Promotions
```
partner_promotions
  id, organization_id, partner_id
  title (varchar, mandatory)
  description (text, mandatory)
  start_date (date), end_date (date)
  apply_to_all_products (boolean, default true)
  is_active (boolean, default true)
  attachments (jsonb)
  created_by, created_at, updated_at

partner_promotion_products
  id, promotion_id, service_id, branch_id (nullable)
```

### 1f. Activity Logs
```
product_fee_activity_logs
  id, organization_id, service_id
  user_id, action: 'created' | 'updated' | 'deleted'
  field_name (varchar)
  old_value (text), new_value (text)
  batch_id (uuid)
  created_at
```

### 1g. AI Insights
```
ai_service_insights
  id, organization_id
  insight_type: 'recommendation' | 'doc_check' | 'summary'
  entity_type, entity_id
  input_data (jsonb), output_data (jsonb)
  confidence_score (numeric)
  created_by_type, created_by_id
  created_at
```

### RLS Policies
All tables get strict org_id isolation policies using `auth.uid()` for internal tables and service-role access for edge functions handling portal/agent requests.

### Seed Data
Insert the 29 predefined fee types as system defaults.

---

## Phase 2: CRM Products and Services UI (Internal)

### 2a. CRM Sub-Navigation
- Add "Products" tab to CRMSubNav (between Contacts and Companies)
- Add new route: `/org/:orgCode/crm/products`
- Add new route: `/org/:orgCode/crm/products/:id` (detail page)
- Add new route: `/org/:orgCode/crm/partners`
- Add new route: `/org/:orgCode/crm/partners/:id` (detail page)

### 2b. Products List Page
- Search, filter by category/visibility/status/office
- Card or table view with service name, type badge, visibility icons, status
- "Create Service" button (admin/owner only)

### 2c. Product Detail Page (Tabbed)
- **Overview Tab**: Name, description, type, office availability, workflow stages, required docs editor
- **Fees Tab**: Default fee section + "+Add" for additional fee options (from PRD docs)
  - Revenue From Client section (Equal/Custom installments)
  - Commission From Partner section (Equal/Custom installments)
  - Installment alias dropdown (Full Fee, Per Year, Per Month, Per Week, Per Term, Per Semester, Per Trimester)
  - Up to 20 fee types per installment period
  - 120 char description limit
- **Promotions Tab**: Read-only view of promotions from associated partners
- **Activity Log Tab**: Tracked changes to product fields and fees

### 2d. Product Create/Edit Dialog/Page
- Form with all service fields
- Office multi-select
- Publish toggles (client portal, agent portal)
- Validation: cannot publish without at least one office selected

---

## Phase 3: Partners Management UI (Internal)

### 3a. Partners List Page
- Route: `/org/:orgCode/crm/partners`
- Filter by type (Agent/Provider/Both), status
- Create Partner dialog

### 3b. Partner Detail Page (Tabbed)
- **Overview Tab**: Contact info, branches, contract status
- **Branches Tab**: CRUD partner branches (city, country)
- **Products Tab**: Services associated with this partner (for providers)
- **Agent Users Tab**: List/invite agent portal users (for agent partners)
- **Promotions Tab**: CRUD promotions with:
  - Title, Description, Start/End dates
  - Apply To: All Products or Select Products (multi-select with branches)
  - Card view listing with Active/Inactive status
  - Show Inactive checkbox
  - View, Edit, Make Inactive actions
- **Customers Tab**: For agent partners, list their managed customers

---

## Phase 4: Service Applications (Internal)

### 4a. Applications Dashboard
- Route: `/org/:orgCode/crm/applications`
- Filter by service, office, agent, provider, status
- Table listing with key columns

### 4b. Application Detail Page
- Route: `/org/:orgCode/crm/applications/:id`
- Status timeline (reuse pattern from client portal cases)
- Documents tab with checklist + review (approve/reject)
- Messages tab with internal notes toggle
- Tasks tab
- Fee section showing application-specific fees (with override capability)
- AI Summary button (generates structured summary via edge function)

### 4c. Fee Override in Application
- Drawer UI matching the PRD spec
- Auto-populate from product default fee (matching partner branch + client country)
- Override without changing product defaults
- Tax mode (inclusive/exclusive), discount support
- "Update and Schedule Payment" button

### 4d. Payment Schedule
- Manual schedule: installment-by-installment detail entry
- Auto schedule: start date + intervals
- Invoice scheduling setup within payment schedule

---

## Phase 5: Client Portal Services Marketplace

### 5a. Portal Services Page
- New route within portal layout: `/org/:orgCode/portal/services`
- Search + filters (category, tags)
- Card listing of published services (visibility = 'client_portal' or 'both_portals')
- Service detail view with description, requirements, expected timeline

### 5b. Apply Flow
- Step-based drawer/page:
  1. Confirm personal details (pre-filled from portal profile)
  2. Answer service-specific questions (from service config)
  3. Upload required documents
  4. Review and submit
- Creates service_application record with `created_by_type = 'client'`

### 5c. Portal Dashboard Update
- Show service applications alongside existing cases
- Progress timeline for each application

### 5d. Backend: portal-api Extensions
- New actions: `list-services`, `get-service`, `apply-service`, `list-my-applications`, `get-application`
- Strict scoping: client sees only published services and own applications

---

## Phase 6: Agent Portal (New)

### 6a. Agent Auth Edge Functions
- `agent-send-otp`: Same pattern as portal-send-otp but for partner_users
- `agent-verify-otp`: Validates OTP, creates session in partner_user_sessions
- `agent-api`: Main API function for agent portal operations

### 6b. Agent Frontend
- New routes: `/agent/:orgCode/login`, `/agent/:orgCode/dashboard`, etc.
- `AgentAuthProvider` (same pattern as PortalAuthProvider)
- `AgentProtectedRoute` component
- `AgentLayout` with sidebar navigation

### 6c. Agent Pages
- **Dashboard**: My Applications summary, quick stats
- **Services**: Browse agent-visible catalog, "Apply for Customer" button
- **My Customers**: CRUD customer profiles, upload docs
- **My Applications**: List with status tracking, detail view with timeline/messages
- **Apply Flow**: Select customer (or create new) -> select service -> fill form -> upload docs -> submit
  - Creates service_application with `created_by_type = 'agent'`, `agent_partner_id`, `agent_user_id`

### 6d. Scope Enforcement
- Agent sees only: services visible to agent portal, their own customers, their own applications
- All queries scoped by `partner_id` + `partner_user_id`

---

## Phase 7: AI Features

### 7a. Service Recommender Edge Function
- `ai-service-recommend`: Takes client profile (location, goals) + queries published services
- Returns ranked recommendations with explanations
- Uses Lovable AI (google/gemini-3-flash-preview)
- Available in both Client Portal and Agent Portal

### 7b. Doc Completeness Checker
- `ai-doc-check`: After upload, analyzes document type and quality
- Returns structured result: ok / unclear / wrong doc / missing pages
- Logs result in ai_service_insights table

### 7c. Application Summary for Staff
- `ai-application-summary`: Generates structured summary for staff review
- Client background, submitted docs, risks, recommended next steps
- Available from Application Detail page

### 7d. AI Fee Suggestion
- When creating an application, suggest applicable fee option based on client country + partner branch + active promotions

---

## Phase 8: Testing

### Unit Tests
- Permission boundary checks (client/agent/staff scope)
- Publish visibility logic validation
- Fee calculation (equal installment total = amount x installments)
- Custom installment ordering auto-naming
- Fee type limit enforcement (max 20 per period)
- Description character limit (120)

### Integration Tests
- Client portal apply flow creates application + timeline entry
- Agent portal apply flow creates application with agent linkage
- Staff update status triggers timeline update
- Fee override does not modify product default
- Fee changes only affect new applications

---

## Implementation Progress

- [x] **Phase 1** - Database migration (22 tables, RLS, seed data)
- [x] **Phase 2** - Products & Services internal UI (list, detail, create)
- [x] **Phase 3** - Partners management UI (list, detail, create)
- [x] **Phase 4** - Service Applications internal (list, detail, status management)
- [x] **Phase 5** - Client Portal services marketplace (browse, apply, track applications)
- [ ] **Phase 6** - Agent Portal (auth, dashboard, customers, applications)
- [ ] **Phase 7** - AI features (recommender, doc check, summary)
- [ ] **Phase 8** - Testing

