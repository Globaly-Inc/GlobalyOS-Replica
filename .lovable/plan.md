

# GlobalyOS Accounting Module -- Implementation Plan

## Overview

A full Xero-like, office-aware accounting module built as a new top-level section in GlobalyOS. This is the largest module addition to date and will be implemented in **6 phases** to keep each step testable and mergeable.

---

## Architecture Decisions

**Routing**: `/org/:orgCode/accounting/*` (new top-level nav item, feature-flagged as `accounting`)

**Navigation**: New `AccountingSubNav` component (like CRMSubNav/SubNav pattern) with tabs: Dashboard, Invoices, Bills, Banking, Reports, Settings

**Data**: All tables scoped by `organization_id` + `ledger_id` + `office_id`. RLS enforces org isolation. Office filtering is done at query level.

**No separate backend**: All logic runs as Supabase Edge Functions (for Stripe webhooks, PDF generation) and client-side queries with RLS.

**Existing patterns reused**: `useOrganization`, `useUserRole`, `useFeatureFlags`, `OrgProtectedRoute`, `FeatureProtectedRoute`, `PageHeader`, `Tabs/TabsList`, `OrgLink`

---

## Phase 1: Foundation -- Database Schema + Feature Flag + Setup Wizard

### Database Tables (Migration)

**accounting_setups**
- id (uuid PK), organization_id (FK), scope_type (enum: OFFICE_SINGLE, OFFICE_SET, ORG_WIDE), base_currency (text, default 'AUD'), tax_inclusive (boolean), status (enum: draft, active, archived), created_by (uuid), created_at, updated_at

**accounting_setup_offices** (junction)
- id (uuid PK), setup_id (FK), office_id (FK offices)

**accounting_ledgers**
- id (uuid PK), organization_id (FK), setup_id (FK), name (text), is_active (boolean), created_at

**chart_of_accounts**
- id (uuid PK), ledger_id (FK), code (text), name (text), type (enum: asset, liability, equity, revenue, expense), sub_type (text), description (text), is_system (boolean), is_active (boolean), parent_id (self-ref nullable), sort_order (int), created_at

**tax_rates**
- id (uuid PK), organization_id (FK), name (text), rate (numeric), is_default (boolean), is_active (boolean)

**accounting_contacts**
- id (uuid PK), organization_id (FK), name (text), email (text), phone (text), contact_type (enum: customer, supplier, both), billing_address (jsonb), tax_number (text), is_active (boolean), created_at, updated_at

**accounting_audit_events**
- id (uuid PK), organization_id (FK), ledger_id (FK), office_id (uuid nullable), entity_type (text), entity_id (uuid), action (text), actor_id (uuid), before_data (jsonb), after_data (jsonb), idempotency_key (text unique nullable), created_at

### Feature Flag
- Add `"accounting"` to `FeatureName` type union
- Add to `defaultFlags` as `false`
- Super Admin enables per org

### Frontend: Setup Wizard
- New page: `src/pages/accounting/AccountingSetup.tsx`
- Multi-step wizard:
  1. Choose scope (single office / office set / org-wide) with radio cards
  2. Select offices (multi-select, skip if org-wide)
  3. Currency + tax defaults
  4. COA template selection (Standard Business, Service Business, Retail, Custom)
  5. Review + Activate
- On activate: creates `accounting_setup`, `accounting_ledger`, populates `chart_of_accounts` from template, creates default `tax_rates`

### COA Templates
- Hardcoded JSON templates with ~60 standard accounts per template (Assets, Liabilities, Equity, Revenue, Expenses with sub-accounts)
- Inserted via client-side batch insert on setup activation

---

## Phase 2: Core Accounting Engine -- GL, Journals, COA Management

### Database Tables

**journals**
- id (uuid PK), organization_id, ledger_id, office_id (FK), journal_number (int), date (date), memo (text), status (enum: draft, posted, reversed), source_type (text, e.g. 'manual', 'invoice', 'bill', 'bank'), source_id (uuid nullable), is_adjusting (boolean), created_by (uuid), posted_at (timestamptz), created_at

**journal_lines**
- id (uuid PK), journal_id (FK), account_id (FK chart_of_accounts), description (text), debit (numeric default 0), credit (numeric default 0), tax_rate_id (FK nullable), tax_amount (numeric default 0), contact_id (FK nullable), sort_order (int)

**ledger_entries** (append-only materialized view of posted journals)
- id (uuid PK), organization_id, ledger_id, office_id, journal_id (FK), journal_line_id (FK), account_id (FK), date (date), debit (numeric), credit (numeric), balance_delta (numeric generated), created_at

### Validation trigger
- Before journal posts: SUM(debits) must equal SUM(credits) -- reject unbalanced journals
- office_id must be in the ledger's scope

### Frontend
- **Chart of Accounts page**: Tree view with account codes, drag-to-reorder, add/edit/archive accounts
- **Manual Journal Entry page**: Date, journal number (auto), line items table (Account dropdown, Debit, Credit, Description, Tax), memo, attachments area, balanced indicator, Save Draft / Post buttons
- **General Ledger view**: Filterable by account, date range, office

---

## Phase 3: Sales -- Invoices + Credit Notes

### Database Tables

**invoices**
- id (uuid PK), organization_id, ledger_id, office_id, contact_id (FK), invoice_number (text), reference (text), status (enum: draft, approved, sent, paid, partially_paid, overdue, voided), date (date), due_date (date), subtotal (numeric), tax_total (numeric), total (numeric), amount_paid (numeric default 0), amount_due (numeric generated), currency (text), notes (text), terms (text), is_recurring (boolean default false), recurrence_rule (jsonb nullable), stripe_payment_link_id (text nullable), created_by (uuid), approved_by (uuid nullable), approved_at (timestamptz), created_at, updated_at

**invoice_lines**
- id (uuid PK), invoice_id (FK), description (text), quantity (numeric), unit_price (numeric), amount (numeric), account_id (FK), tax_rate_id (FK nullable), tax_amount (numeric default 0), sort_order (int)

**invoice_payments**
- id (uuid PK), invoice_id (FK), amount (numeric), date (date), method (text), reference (text), stripe_payment_id (text nullable), journal_id (FK nullable), created_at

### Frontend
- **Invoices list**: Tabs (All, Draft, Awaiting Payment, Paid, Overdue), office filter, search, bulk actions
- **Invoice create/edit**: Customer selector, terms, dates, line items table (Description, Qty, Rate, Amount, Account, Tax), subtotal/tax/total summary, discount support, message fields, attachments
- **Invoice detail/PDF**: Preview layout, Send, Record Payment, Void actions
- **Recurring invoices**: Setup recurrence rule, auto-generate

### Business Logic
- Approving invoice posts a journal (Debit: Accounts Receivable, Credit: Revenue + Tax Payable)
- Recording payment posts a journal (Debit: Bank, Credit: Accounts Receivable)

---

## Phase 4: Purchases -- Bills + Credit Notes

### Database Tables

**bills** (mirrors invoices structure)
- id, organization_id, ledger_id, office_id, contact_id, bill_number, status (draft, approved, paid, partially_paid, overdue, voided), date, due_date, subtotal, tax_total, total, amount_paid, amount_due, created_by, approved_by, created_at, updated_at

**bill_lines**
- id, bill_id, description, quantity, unit_price, amount, account_id, tax_rate_id, tax_amount, sort_order

**bill_payments**
- id, bill_id, amount, date, method, reference, journal_id, created_at

### Frontend
- **Bills list**: Same pattern as invoices with status tabs + office filter
- **Bill create/edit**: Supplier selector, line items, account allocation
- **Bill payment recording**

### Business Logic
- Approving bill posts journal (Debit: Expense/Asset accounts, Credit: Accounts Payable + Tax Receivable)
- Recording payment posts journal (Debit: Accounts Payable, Credit: Bank)

---

## Phase 5: Banking -- Accounts, Import, Reconciliation, Rules

### Database Tables

**bank_accounts**
- id (uuid PK), organization_id, ledger_id, office_id, name (text), account_number (text), bsb (text nullable), bank_name (text), currency (text), chart_account_id (FK), current_balance (numeric), is_active (boolean), created_at

**bank_statements**
- id (uuid PK), bank_account_id (FK), file_name (text), import_date (timestamptz), start_date (date), end_date (date), row_count (int), idempotency_key (text unique)

**bank_statement_lines**
- id (uuid PK), statement_id (FK), date (date), description (text), amount (numeric), balance (numeric nullable), reference (text), payee (text nullable), status (enum: unmatched, matched, reconciled), matched_journal_id (FK nullable), matched_invoice_id (FK nullable), matched_bill_id (FK nullable), created_at

**bank_rules**
- id (uuid PK), organization_id, ledger_id, office_id (nullable, null = all offices), name (text), priority (int), conditions (jsonb), actions (jsonb), auto_add (boolean default false), is_active (boolean), created_at

### Frontend
- **Bank accounts list**: Cards showing balance, account info, office badge
- **Bank register**: Transaction list per account with search, date filter
- **Statement import**: CSV/OFX upload, preview, confirm (idempotent by hash)
- **Reconciliation view** (the core UX from the Xero screenshot):
  - Header: bank account selector, balance cards (Bank Balance vs Book Balance)
  - Tabs: For Review, Categorised, Excluded
  - Each line: Date, Bank Detail, Payee, Categorise or Match (account dropdown + auto-suggestions), Spent/Received, Action (Add)
  - Matching: suggest matching invoices/bills by amount, auto-apply bank rules
- **Bank rules manager**: Priority-ordered list, conditions (description contains, amount range), actions (set category, set payee), auto-add toggle, office filter

---

## Phase 6: Reports + Stripe Integration + Dashboard

### Reports Frontend
- **Reports hub page** (matching the Xero screenshots): Grouped sections with favorites
  - Favourites (starred, persisted per user)
  - Business Overview: P&L, Balance Sheet, Cash Flow Statement, Business Snapshot
  - Who Owes You: AR Aging Summary/Detail, Open Invoices, Invoice List
  - What You Owe: AP Aging Summary/Detail, Unpaid Bills
  - For My Accountant: Trial Balance, General Ledger, Journal List, Account List
- Each report: Office filter (single/multi/consolidated), date range, comparison periods
- **P&L report**: Revenue - COGS - Expenses = Net Profit, with monthly columns option
- **Balance Sheet**: Assets = Liabilities + Equity, as of date
- **Cash Flow Statement**: Operating/Investing/Financing sections
- **Trial Balance**: All accounts with debit/credit balances, must balance to zero
- **AR/AP Aging**: Current, 1-30, 31-60, 61-90, 90+ day buckets

### Stripe Integration (Edge Function)
- `create-invoice-payment-link`: Creates Stripe Payment Link with metadata (orgId, ledgerId, officeId, invoiceId)
- Stripe webhook handler (already partially exists): On payment success, record invoice payment + post journal, tagged with correct officeId
- Idempotent by stripe payment intent ID

### Accounting Dashboard
- **P&L summary card**: Net profit, income bar, expense bar with trend
- **Expenses donut chart**: By category, last 30 days
- **Bank accounts sidebar**: List with balances + "needs attention" indicators
- **Cash flow chart**: 12-month line chart
- **Smart suggestions**: Quick links (Sales, Accounts Receivable)
- **Office selector**: Global filter at top of accounting module

---

## Navigation & Access Control

### New Files for Navigation
- `src/components/accounting/AccountingSubNav.tsx` -- Sub-navigation tabs
- Add `accounting` route group in `App.tsx` under `/org/:orgCode/accounting/*`
- Add "Accounting" to `TopNav.tsx` mainNavItems with `Calculator` icon, feature-flagged

### RBAC
- Reuse existing `useUserRole` (owner, admin, hr, member)
- Accounting-specific: owner + admin = full access; hr = read-only reports; member = no access (unless assigned office bookkeeper role in future)

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/accounting/AccountingDashboard.tsx` | Main dashboard |
| `src/pages/accounting/AccountingSetup.tsx` | Setup wizard |
| `src/pages/accounting/ChartOfAccounts.tsx` | COA management |
| `src/pages/accounting/Invoices.tsx` | Invoice list |
| `src/pages/accounting/InvoiceEditor.tsx` | Create/edit invoice |
| `src/pages/accounting/InvoiceDetail.tsx` | View + actions |
| `src/pages/accounting/Bills.tsx` | Bill list |
| `src/pages/accounting/BillEditor.tsx` | Create/edit bill |
| `src/pages/accounting/Banking.tsx` | Bank accounts + reconciliation |
| `src/pages/accounting/BankRules.tsx` | Rules manager |
| `src/pages/accounting/JournalEntry.tsx` | Manual journal |
| `src/pages/accounting/Reports.tsx` | Reports hub |
| `src/pages/accounting/ReportViewer.tsx` | Individual report renderer |
| `src/components/accounting/AccountingSubNav.tsx` | Sub-nav |
| `src/components/accounting/OfficeSelector.tsx` | Office filter for accounting |
| `src/components/accounting/InvoiceLineItems.tsx` | Reusable line items table |
| `src/components/accounting/ReconciliationView.tsx` | Bank reconciliation UI |
| `src/components/accounting/ReportTable.tsx` | Formatted report output |
| `src/components/accounting/COATree.tsx` | Chart of accounts tree |
| `src/hooks/useAccountingSetup.ts` | Setup status + ledger context |
| `src/hooks/useAccountingPermissions.ts` | Office-aware access checks |
| `src/constants/coaTemplates.ts` | COA template data |
| `src/types/accounting.ts` | All accounting type definitions |
| `supabase/functions/create-invoice-payment-link/index.ts` | Stripe payment link |

### Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useFeatureFlags.tsx` | Add `"accounting"` to FeatureName + defaultFlags |
| `src/components/TopNav.tsx` | Add Accounting nav item |
| `src/components/SubNav.tsx` | Add accounting section detection |
| `src/App.tsx` | Add all `/org/:orgCode/accounting/*` routes |
| `src/components/Layout.tsx` | Import AccountingSubNav |

---

## Implementation Order

1. **Phase 1** (Foundation): Schema migration + feature flag + setup wizard + COA templates
2. **Phase 2** (GL Engine): Journals + journal lines + ledger entries + COA page + manual journal UI
3. **Phase 3** (Sales): Invoices + invoice lines + payments + invoice UI
4. **Phase 4** (Purchases): Bills + bill lines + payments + bill UI
5. **Phase 5** (Banking): Bank accounts + statements + reconciliation + rules
6. **Phase 6** (Reports + Dashboard): All reports + Stripe integration + dashboard

Each phase is independently testable. Phase 1 must complete before others. Phases 3-5 can be partially parallelized after Phase 2.

