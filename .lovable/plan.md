

# Quotation Management System - Comprehensive PRD and Implementation Plan

This is a large-scale feature requiring a comprehensive Product Requirements Document (PRD), codebase research, and implementation prompt. The approach is to use the existing "AI Generate PRD" infrastructure to generate a detailed, AI-powered PRD document for the Quotation feature, and then provide a complete structured Lovable implementation prompt.

---

## Phase 1: Generate AI-Powered PRD Document

We will enhance the existing `generate-feature-prd` edge function call by triggering it from the Super Admin Feature Detail page for the "quotation" feature. But first, we need to register the feature in the feature registry and provide comprehensive context to the AI.

### Step 1: Register the Quotation Feature

Add a `quotations` entry to the feature registry so it appears in Super Admin and can have PRD documents generated.

**Database migration:**
- Insert into `feature_registry` with name `quotations`, label `Quotations`, category `flagged`, description covering the full scope

### Step 2: Create a Dedicated PRD Generation Edge Function

Create a new edge function `generate-quotation-prd` that provides the AI with:

1. **Full context from the uploaded reference documents** (Create Automated Quotation, Sending and Approving, Quotation Template, Tax in Quotation)
2. **Existing codebase analysis** including:
   - Current CRM data model (services, deals, fees, instalments, pipelines)
   - Accounting system (invoices, payments, ledgers)
   - Contact and company structures
   - Partner/agent architecture
3. **Industry best practices** researched from CPQ (Configure-Price-Quote) systems:
   - AI-powered quote generation and recommendations
   - Digital signature / e-approval workflows
   - Quote-to-Invoice automation
   - Multi-option quotations (packages)
   - Tax handling (inclusive/exclusive GST)
   - Template management
   - Public shareable quote links with expiry
   - Real-time collaboration and commenting
   - PDF generation and preview
   - Payment tracking with instalment plans

### Step 3: PRD Content Structure

The generated PRD will cover these industry-standard sections with GlobalyOS-specific detail:

```text
1. Executive Summary
2. Problem Statement & Goals
3. User Personas & Use Cases
   - Counselor / Sales Rep
   - Manager / Admin
   - Contact / Client (external)
   - Agent / Partner
4. Functional Requirements
   FR-1: Quotation CRUD (create, edit, duplicate, archive)
   FR-2: Multi-Option Quotations (up to 10 options, 10 services each)
   FR-3: Service & Fee Configuration per Option
   FR-4: Tax Handling (GST inclusive/exclusive)
   FR-5: Instalment Plans (equal/custom, revenue/commission)
   FR-6: Quotation Templates (create, use, manage)
   FR-7: Public Quotation Link (view, approve, comment, download PDF)
   FR-8: Contact Approval Flow (approve option -> auto-process deal)
   FR-9: Quote-to-Invoice Automation
   FR-10: Email Integration (compose with PDF attachment)
   FR-11: PDF Generation & Preview
   FR-12: Status Lifecycle (Draft -> Sent -> Approved -> Processed -> Archived)
   FR-13: Permissions (view/manage quotations of assigned contacts)
   FR-14: Notifications (approval, processing, comments)
   FR-15: Client Portal Integration
   FR-16: AI-Powered Features (smart pricing, auto-fill, recommendations)
5. Non-Functional Requirements
6. Data Model & API Design
7. UI/UX Considerations
8. Success Metrics & KPIs
9. Dependencies & Risks
10. Timeline & Milestones
11. Gap Analysis vs Industry Leaders
12. AI Value-Add Opportunities
```

---

## Phase 2: Data Model Design

Based on codebase research, the following new tables are needed (leveraging existing CRM infrastructure):

```text
+---------------------------+     +---------------------------+
| crm_quotations            |     | crm_quotation_options     |
+---------------------------+     +---------------------------+
| id (uuid PK)              |     | id (uuid PK)              |
| organization_id (FK)      |     | quotation_id (FK)         |
| contact_id (FK)           |     | organization_id (FK)      |
| office_id (FK)            |     | name (text)               |
| assignee_id (FK)          |     | sort_order (int)          |
| quotation_number (text)   |     | is_approved (bool)        |
| status (enum)             |     | created_at                |
| currency (text)           |     +---------------------------+
| due_date (date)           |            |
| payment_details (jsonb)   |            v
| notes (text)              |     +-------------------------------+
| is_template (bool)        |     | crm_quotation_option_services |
| template_name (text)      |     +-------------------------------+
| public_token (text)       |     | id (uuid PK)                  |
| token_expires_at (tstz)   |     | option_id (FK)                |
| approved_at (tstz)        |     | organization_id (FK)          |
| approved_option_id (FK)   |     | service_id (FK)               |
| processed_deal_id (FK)    |     | partner_id (FK)               |
| created_by (FK)           |     | partner_branch_id (FK)        |
| created_at                |     | product_fee_option_id (FK)    |
| updated_at                |     | service_date (date)           |
+---------------------------+     | sort_order (int)              |
                                  +-------------------------------+
                                           |
                                           v
                                  +-------------------------------+
                                  | crm_quotation_service_fees    |
                                  +-------------------------------+
                                  | id (uuid PK)                  |
                                  | option_service_id (FK)        |
                                  | organization_id (FK)          |
                                  | fee_type_id (FK)              |
                                  | revenue_type (enum)           |
                                  | installment_type (enum)       |
                                  | amount (numeric)              |
                                  | tax_type (enum: incl/excl)    |
                                  | tax_rate (numeric)            |
                                  | tax_amount (numeric)          |
                                  | total_amount (numeric)        |
                                  | num_installments (int)        |
                                  | installment_details (jsonb)   |
                                  +-------------------------------+

+---------------------------+
| crm_quotation_comments    |
+---------------------------+
| id (uuid PK)              |
| quotation_id (FK)         |
| author_type (enum)        |
| author_id (uuid)          |
| content (text)            |
| created_at                |
+---------------------------+

+---------------------------+
| crm_quotation_settings    |
+---------------------------+
| id (uuid PK)              |
| organization_id (FK)      |
| auto_process_on_approve   |
| grace_period_days (int)   |
| default_currency (text)   |
| created_at                |
| updated_at                |
+---------------------------+
```

---

## Phase 3: Implementation Prompt (Lovable-Ready)

The implementation will be broken into sub-phases:

### Sub-Phase A: Database & Core Types
- Create all migration files for the tables above
- RLS policies scoped by organization_id
- TypeScript type definitions in `src/types/crm-quotation.ts`

### Sub-Phase B: Service Hooks
- `useCRMQuotations` -- list, create, update, delete
- `useCRMQuotationDetail` -- full quotation with options, services, fees
- `useCRMQuotationTemplates` -- template CRUD
- `useCRMQuotationSettings` -- org settings

### Sub-Phase C: UI Components
- `QuotationListView` -- active quotations list with status filters
- `QuotationDetailPage` -- multi-section editor (client, options, services, fees)
- `QuotationOptionEditor` -- add/remove/reorder options and services
- `AddServiceDrawer` -- workflow/partner/product/date selector
- `QuotationFeeEditor` -- fee type, instalments, tax
- `QuotationTemplateDrawer` -- template list and management
- `QuotationPDFPreview` -- PDF generation and preview
- `QuotationPublicView` -- public page for contact approval

### Sub-Phase D: Edge Functions
- `generate-quotation-pdf` -- server-side PDF generation
- `send-quotation-email` -- email with PDF attachment
- `approve-quotation` -- public API for contact approval
- `ai-quotation-assistant` -- AI pricing recommendations

### Sub-Phase E: Navigation & Integration
- Add "Quotations" to CRM sub-navigation
- Add Quotation tab to Contact profile
- Client Portal integration
- Notification system integration
- Accounting invoice auto-creation on approval

### Sub-Phase F: Refactoring (if needed)
- Extract shared fee/instalment logic from `crm_deal_fees` into reusable utilities
- Unify PDF generation approach across quotations and existing PRD system
- Ensure tax calculation helpers are centralized

### Sub-Phase G: Unit Tests
- Tax calculation tests (inclusive/exclusive GST)
- Instalment splitting logic tests
- Status lifecycle transition validation
- Permission checks for quotation access
- Public token expiry validation

---

## AI Value-Add Features (Industry Gaps Filled)

Based on industry research, these AI-powered features will differentiate GlobalyOS:

1. **AI Smart Pricing** -- Suggest optimal pricing based on contact history, deal size, and market data
2. **AI Quote Generator** -- Auto-populate quotation from deal context with recommended services
3. **AI Follow-Up** -- Suggest follow-up actions when quotation is pending past due date
4. **AI Template Recommendations** -- Suggest best template based on contact profile and service type
5. **AI Negotiation Assistant** -- Provide counter-offer suggestions when contact requests changes

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_create_quotation_tables.sql` | Create | All quotation tables, enums, RLS |
| `src/types/crm-quotation.ts` | Create | TypeScript types for quotation entities |
| `src/services/useCRMQuotations.ts` | Create | React Query hooks for quotation CRUD |
| `src/pages/crm/QuotationsPage.tsx` | Create | Main quotations list page |
| `src/pages/crm/QuotationDetailPage.tsx` | Create | Quotation editor page |
| `src/pages/crm/QuotationPublicPage.tsx` | Create | Public approval page |
| `src/components/crm/quotations/` | Create | UI components directory |
| `supabase/functions/generate-quotation-prd/index.ts` | Create | AI PRD generation with full context |
| `supabase/functions/approve-quotation/index.ts` | Create | Public approval endpoint |
| `src/components/crm/CRMSubNav.tsx` | Modify | Add Quotations nav item |
| `src/services/__tests__/quotation.test.ts` | Create | Unit tests |

---

## Immediate Action

The first step is to generate the comprehensive PRD document using the AI edge function, storing it in the feature-prd-documents bucket. This will produce a downloadable, professional PDF that serves as the single source of truth for the entire Quotation feature implementation.

