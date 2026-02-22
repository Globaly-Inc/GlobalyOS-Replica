

# Revised Invoicing System - Comprehensive PRD and Implementation Plan

## 1. Executive Summary

This plan overhauls the existing basic accounting invoicing system into a CRM-integrated invoicing platform that supports:

- **General Invoices** to contacts/clients with multiple services grouped by service blocks (not just line items)
- **Commission Invoices** to partners/providers the organization represents
- **Auto-generated invoices** from deal fee instalment schedules
- **Public invoice viewing and online payment** (Stripe + bank transfer)
- **Income sharing** (revenue splitting with partners/offices)
- **Payment application** with per-fee/per-instalment allocation
- **PDF generation** and **email delivery**
- **AI-powered features** (smart descriptions, payment reminders, anomaly detection)

---

## 2. Problem Statement

The current `accounting_invoices` system is a basic Xero-like ledger-invoice with generic line items (description, qty, unit_price, account). It lacks:

- CRM integration (no link to deals, services, fees, contacts, partners)
- Service-grouped invoice lines (the designs show services as sections with fee rows underneath)
- Commission invoicing to partners
- Instalment-based auto-invoice generation from deal fees
- Public invoice view page with payment options
- Income sharing / revenue splitting
- Per-fee payment application
- Discount handling
- Deposit adjustment

---

## 3. Current Architecture Analysis

### Existing Tables Used
- `accounting_invoices` -- basic invoice with ledger_id, office_id, contact_id (accounting_contacts only)
- `accounting_invoice_lines` -- flat line items (description, qty, unit_price, account_id, tax)
- `accounting_invoice_payments` -- payment records
- `accounting_contacts` -- separate from CRM contacts

### CRM Tables Available
- `crm_contacts` -- CRM contacts with addresses, emails, phones
- `crm_partners` -- partner/agent organizations
- `crm_deals` -- deals with pipeline stages
- `crm_deal_fees` -- fees on deals (amount, currency, fee_name, status, tax_amount, discount_amount)
- `crm_deal_fee_instalments` -- instalment records (amount, due_date, status: pending/paid/overdue)
- `crm_services` -- services catalog with provider partners

### Key Gap
The accounting invoicing and CRM deal/fee systems are completely disconnected. The new system must bridge them.

---

## 4. Data Model Design

### Strategy: Extend `accounting_invoices`, Replace Line Items with Service Blocks

Rather than creating entirely new tables, we extend the existing accounting invoice system with CRM awareness.

### 4.1 Schema Changes

**Alter `accounting_invoices`** -- add new columns:

```text
invoice_type           enum('general','commission')  DEFAULT 'general'
recipient_type         enum('contact','partner')     DEFAULT 'contact'
crm_contact_id         uuid FK -> crm_contacts(id)   NULLABLE
crm_partner_id         uuid FK -> crm_partners(id)   NULLABLE
deal_id                uuid FK -> crm_deals(id)      NULLABLE
billing_address        jsonb                         NULLABLE
tax_type               enum('inclusive','exclusive')  DEFAULT 'exclusive'
payment_option_id      uuid FK -> payment_options     NULLABLE
enable_online_payment  boolean DEFAULT false
public_token           text UNIQUE NULLABLE
token_expires_at       timestamptz NULLABLE
sent_at                timestamptz NULLABLE
viewed_at              timestamptz NULLABLE
discount_total         numeric DEFAULT 0
attachments            jsonb DEFAULT '[]'
```

**New table: `accounting_invoice_services`** -- groups line items by service:

```text
id                     uuid PK
invoice_id             uuid FK -> accounting_invoices
organization_id        uuid FK
service_id             uuid FK -> crm_services NULLABLE
service_name           text NOT NULL
provider_name          text NULLABLE
deal_fee_id            uuid FK -> crm_deal_fees NULLABLE
sort_order             int DEFAULT 0
subtotal               numeric DEFAULT 0
tax_total              numeric DEFAULT 0
total                  numeric DEFAULT 0
created_at             timestamptz
```

**Alter `accounting_invoice_lines`** -- add:

```text
invoice_service_id     uuid FK -> accounting_invoice_services NULLABLE
fee_type               text NULLABLE
account_category       text NULLABLE
is_discount            boolean DEFAULT false
instalment_id          uuid FK -> crm_deal_fee_instalments NULLABLE
```

**New table: `accounting_invoice_income_sharing`** -- revenue sharing:

```text
id                     uuid PK
invoice_id             uuid FK -> accounting_invoices
organization_id        uuid FK
invoice_service_id     uuid FK -> accounting_invoice_services NULLABLE
receiver_type          enum('partner','office','team')
receiver_id            uuid NOT NULL
receiver_name          text NOT NULL
sharing_amount         numeric DEFAULT 0
tax_mode               enum('inclusive','exclusive') DEFAULT 'inclusive'
tax_rate               numeric DEFAULT 10
tax_amount             numeric DEFAULT 0
total_amount           numeric DEFAULT 0
status                 enum('unpaid','partially_paid','paid') DEFAULT 'unpaid'
amount_paid            numeric DEFAULT 0
created_at             timestamptz
```

**New table: `accounting_income_sharing_payments`**:

```text
id                     uuid PK
income_sharing_id      uuid FK
organization_id        uuid FK
commission_invoice_id  uuid FK -> accounting_invoices NULLABLE
amount                 numeric
paid_at                timestamptz
reference              text NULLABLE
created_at             timestamptz
```

**New table: `accounting_invoice_schedules`** -- auto-invoice from instalments:

```text
id                     uuid PK
organization_id        uuid FK
deal_id                uuid FK -> crm_deals
deal_fee_id            uuid FK -> crm_deal_fees
instalment_id          uuid FK -> crm_deal_fee_instalments
scheduled_date         date NOT NULL
invoice_id             uuid FK -> accounting_invoices NULLABLE  (null until generated)
status                 enum('pending','generated','skipped') DEFAULT 'pending'
auto_send              boolean DEFAULT false
created_at             timestamptz
```

**New table: `accounting_invoice_comments`** -- for public invoice conversation:

```text
id                     uuid PK
invoice_id             uuid FK -> accounting_invoices
organization_id        uuid FK
author_type            enum('staff','client','partner','system')
author_name            text NULLABLE
content                text NOT NULL
created_at             timestamptz
```

**New table: `accounting_payment_options`** -- org payment methods:

```text
id                     uuid PK
organization_id        uuid FK
name                   text NOT NULL (e.g. "Nepal Investment Bank Limited")
type                   enum('bank_transfer','stripe','other')
bank_details           jsonb NULLABLE  (account_name, bank_name, bsb, account_number)
is_default             boolean DEFAULT false
is_active              boolean DEFAULT true
created_at             timestamptz
```

### 4.2 Enum Additions

```sql
CREATE TYPE crm_invoice_type AS ENUM ('general', 'commission');
CREATE TYPE crm_invoice_recipient_type AS ENUM ('contact', 'partner');
CREATE TYPE income_sharing_status AS ENUM ('unpaid', 'partially_paid', 'paid');
CREATE TYPE income_sharing_receiver_type AS ENUM ('partner', 'office', 'team');
CREATE TYPE invoice_schedule_status AS ENUM ('pending', 'generated', 'skipped');
CREATE TYPE invoice_comment_author_type AS ENUM ('staff', 'client', 'partner', 'system');
CREATE TYPE payment_option_type AS ENUM ('bank_transfer', 'stripe', 'other');
```

---

## 5. Feature Specifications

### 5.1 General Invoice (to Contact/Client)

Based on the design images, a general invoice has:
- **Header**: Recipient (contact), invoice number, date, due date, currency, branch/office, tax type (inclusive/exclusive), payment option
- **Service blocks**: Each service (e.g. "Bachelors Of IT", "Student Visa 500") with provider info, grouped fee rows
- **Fee rows**: Description, fee type, account category, amount, tax type, tax amount, total amount
- **Discount rows**: Shown as negative amounts (e.g. "Cash Back Offer" with negative amount)
- **Footer sections**: Attachments, Customer Deposit, Payments, Invoice Summary, Invoice Notes, Financial Summary, Income Sharing

### 5.2 Commission Invoice (to Partner/Provider)

From the commission PDF (Net Claim / Gross Claim patterns):
- Invoice TO a partner rather than a contact
- Lists services the partner provides with commission amounts
- Can be "net claim" (deduct commission, pay remainder) or "gross claim" (full amount, separate commission)
- Linked to income sharing records

### 5.3 Invoice Schedule (Auto-generation from Deal Fees)

- When a deal has fees with instalments, the system generates `invoice_schedules`
- A cron/manual trigger checks pending schedules and auto-creates invoices
- Each schedule entry maps to one instalment of one deal fee
- Multiple instalments due on the same date for the same contact can be grouped into one invoice

### 5.4 Public Invoice View

Based on the uploaded design images:
- **Left panel**: Total due, payment method toggle (Bank Transfer / Online Payment), bank details or Stripe pay button, upload payment receipt area, disclaimer, comments thread
- **Right panel**: Full invoice PDF preview with org branding, service blocks, payment received history
- **Features**: Download PDF, add comment, upload receipt, make online payment

### 5.5 Income Sharing

Based on the design images:
- Add income sharing from service table rows or summary module
- Select service, receiver (partner/office/team member), amount, tax mode
- Track sharing payment status (Unpaid -> Partially Paid -> Paid)
- Link sharing payments to commission invoices

### 5.6 Payment Application

Based on the "Apply Payment" design:
- When receiving a payment, apply it across multiple services/fees
- Shows each service with fee-level due amounts
- User enters amount paid per fee
- Supports deposit adjustment (use client deposit balance)

---

## 6. AI-Powered Features

1. **AI Invoice Description Generator** -- Auto-generate professional fee descriptions from service/deal context
2. **AI Payment Reminder** -- Smart follow-up suggestions based on overdue invoices, contact communication history
3. **AI Anomaly Detection** -- Flag unusual amounts, duplicate invoices, missing fees vs deal
4. **AI Financial Summary** -- Generate plain-English summary of invoice financial position
5. **AI Tax Compliance Check** -- Verify tax calculations match configured rates

---

## 7. Implementation Phases

### Phase 1: Database Schema and Types
- Create migration with all new tables, columns, enums, indexes, RLS policies
- Update TypeScript types in `src/types/accounting.ts`
- Add payment options table and seed default

### Phase 2: Refactor Invoice Editor
- Replace current flat `InvoiceEditor` with service-block-based editor matching the design
- Add recipient type toggle (Contact / Partner)
- Add CRM contact/partner selector (linked to `crm_contacts` / `crm_partners`)
- Add service blocks with fee rows (linked to `crm_services`, `crm_deal_fees`)
- Add discount row support
- Add income sharing section
- Add attachments section
- Add payment option selector
- Add "enable online payment" toggle
- Financial summary and net income calculation

### Phase 3: Invoice Detail Page Enhancement
- Enhance `InvoiceDetail` with service-block display
- Add payment application dialog (per-fee allocation)
- Add income sharing management
- Add activity/comments section
- Add "Copy Link" and "Send Invoice" actions

### Phase 4: Public Invoice Page
- Create `/invoice/:token` public route
- Two-panel layout matching the designs
- Bank transfer details display
- Online payment via Stripe
- Upload payment receipt
- Comment thread
- PDF download

### Phase 5: Invoice Schedules
- Create schedule generator from deal fee instalments
- Schedule list view in accounting
- Auto-generate invoices from pending schedules
- Edge function for scheduled invoice generation

### Phase 6: Commission Invoices
- Partner-targeted invoice creation flow
- Net/Gross claim calculation
- Link to income sharing records
- Commission invoice list/filter

### Phase 7: Edge Functions
- `generate-invoice-pdf` -- HTML-to-PDF with org branding, service blocks, payment history
- `send-invoice-email` -- Email with PDF attachment and "View Invoice" link
- `public-invoice-api` -- Public endpoints for viewing, commenting, uploading receipts
- `process-invoice-schedules` -- Auto-generate invoices from schedules

### Phase 8: AI Features
- Edge function for AI description generation using Lovable AI
- Payment reminder suggestions
- Anomaly detection on save

### Phase 9: Unit Tests
- Tax calculation tests (inclusive/exclusive)
- Payment application allocation tests
- Income sharing calculation tests
- Schedule generation logic tests
- Invoice number generation tests

---

## 8. File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_revise_invoicing_system.sql` | Create | All schema changes, enums, RLS, indexes |
| `src/types/accounting.ts` | Modify | Add new types for service blocks, income sharing, schedules, etc. |
| `src/pages/accounting/InvoiceEditor.tsx` | Rewrite | Service-block-based editor with CRM integration |
| `src/pages/accounting/InvoiceDetail.tsx` | Enhance | Service blocks, payment application, income sharing |
| `src/pages/accounting/InvoicePublicPage.tsx` | Create | Public invoice view with payment |
| `src/pages/accounting/InvoiceSchedules.tsx` | Create | Schedule management page |
| `src/components/accounting/InvoiceServiceBlock.tsx` | Create | Service block editor component |
| `src/components/accounting/IncomeSharingDialog.tsx` | Create | Add/manage income sharing |
| `src/components/accounting/PaymentApplicationDialog.tsx` | Create | Apply payment per fee |
| `src/components/accounting/PaymentOptionsManager.tsx` | Create | Payment option CRUD |
| `src/components/accounting/InvoiceComments.tsx` | Create | Comment thread component |
| `src/services/useAccountingInvoices.ts` | Create | React Query hooks for enhanced invoicing |
| `supabase/functions/generate-invoice-pdf/index.ts` | Create | PDF generation |
| `supabase/functions/send-invoice-email/index.ts` | Create | Email sending |
| `supabase/functions/public-invoice-api/index.ts` | Create | Public invoice endpoints |
| `supabase/functions/process-invoice-schedules/index.ts` | Create | Auto-generate from schedules |
| `supabase/functions/ai-invoice-assistant/index.ts` | Create | AI features |
| `src/App.tsx` | Modify | Add public invoice route |
| `src/services/__tests__/accounting-invoice.test.ts` | Create | Unit tests |

---

## 9. Technical Considerations

### Refactoring Required
- The current `InvoiceEditor` uses flat line items only -- needs complete rewrite to support service blocks
- The `accounting_contacts` are separate from `crm_contacts` -- new invoices will support both via `recipient_type` + `crm_contact_id` / existing `contact_id`
- Existing invoices and data remain backward compatible (new columns are nullable, `invoice_type` defaults to 'general')

### Security
- All new tables get RLS policies scoped by `organization_id`
- Public invoice page uses token-based access (no auth required)
- Public API edge functions verify token validity and expiry
- Income sharing amounts validated against invoice totals

### Performance
- Indexes on `invoice_type`, `recipient_type`, `deal_id`, `public_token`
- Invoice schedules queried by `status` and `scheduled_date`
- Service blocks limited to reasonable count per invoice

