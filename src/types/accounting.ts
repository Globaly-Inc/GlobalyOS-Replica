// ============================================================
// Accounting Module Types
// ============================================================

export type AccountingScopeType = 'OFFICE_SINGLE' | 'OFFICE_SET' | 'ORG_WIDE';
export type AccountingSetupStatus = 'draft' | 'active' | 'archived';
export type AccountingAccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type AccountingContactType = 'customer' | 'supplier' | 'both';

export interface AccountingSetup {
  id: string;
  organization_id: string;
  scope_type: AccountingScopeType;
  base_currency: string;
  tax_inclusive: boolean;
  status: AccountingSetupStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AccountingSetupOffice {
  id: string;
  setup_id: string;
  office_id: string;
}

export interface AccountingLedger {
  id: string;
  organization_id: string;
  setup_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface ChartOfAccount {
  id: string;
  ledger_id: string;
  code: string;
  name: string;
  type: AccountingAccountType;
  sub_type: string | null;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface TaxRate {
  id: string;
  organization_id: string;
  name: string;
  rate: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

export interface AccountingContact {
  id: string;
  organization_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  contact_type: AccountingContactType;
  billing_address: Record<string, unknown> | null;
  tax_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccountingAuditEvent {
  id: string;
  organization_id: string;
  ledger_id: string | null;
  office_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  idempotency_key: string | null;
  created_at: string;
}

// COA Template types
export interface COATemplateAccount {
  code: string;
  name: string;
  type: AccountingAccountType;
  sub_type?: string;
  is_system?: boolean;
  children?: COATemplateAccount[];
}

export interface COATemplate {
  id: string;
  name: string;
  description: string;
  accounts: COATemplateAccount[];
}

// Journal types
export type JournalStatus = 'draft' | 'posted' | 'reversed';

export interface Journal {
  id: string;
  organization_id: string;
  ledger_id: string;
  office_id: string;
  journal_number: number;
  date: string;
  memo: string | null;
  status: JournalStatus;
  source_type: string;
  source_id: string | null;
  is_adjusting: boolean;
  created_by: string;
  posted_at: string | null;
  created_at: string;
}

export interface JournalLine {
  id: string;
  journal_id: string;
  account_id: string;
  description: string | null;
  debit: number;
  credit: number;
  tax_rate_id: string | null;
  tax_amount: number;
  contact_id: string | null;
  sort_order: number;
}

export interface LedgerEntry {
  id: string;
  organization_id: string;
  ledger_id: string;
  office_id: string;
  journal_id: string;
  journal_line_id: string;
  account_id: string;
  date: string;
  debit: number;
  credit: number;
  balance_delta: number;
  created_at: string;
}

// Invoice types
export type InvoiceStatus = 'draft' | 'approved' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'voided';

export interface AccountingInvoice {
  id: string;
  organization_id: string;
  ledger_id: string;
  office_id: string;
  contact_id: string | null;
  invoice_number: string;
  reference: string | null;
  status: InvoiceStatus;
  date: string;
  due_date: string;
  subtotal: number;
  tax_total: number;
  total: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  notes: string | null;
  terms: string | null;
  is_recurring: boolean;
  recurrence_rule: Record<string, unknown> | null;
  stripe_payment_link_id: string | null;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountingInvoiceLine {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  account_id: string;
  tax_rate_id: string | null;
  tax_amount: number;
  sort_order: number;
}

export interface AccountingInvoicePayment {
  id: string;
  invoice_id: string;
  amount: number;
  date: string;
  method: string;
  reference: string | null;
  stripe_payment_id: string | null;
  journal_id: string | null;
  created_at: string;
}

// Bill types
export type BillStatus = 'draft' | 'approved' | 'paid' | 'partially_paid' | 'overdue' | 'voided';

export interface AccountingBill {
  id: string;
  organization_id: string;
  ledger_id: string;
  office_id: string;
  contact_id: string | null;
  bill_number: string;
  reference: string | null;
  status: BillStatus;
  date: string;
  due_date: string;
  subtotal: number;
  tax_total: number;
  total: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  notes: string | null;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountingBillLine {
  id: string;
  bill_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  account_id: string;
  tax_rate_id: string | null;
  tax_amount: number;
  sort_order: number;
}

export interface AccountingBillPayment {
  id: string;
  bill_id: string;
  amount: number;
  date: string;
  method: string;
  reference: string | null;
  journal_id: string | null;
  created_at: string;
}

// Setup wizard form types
export interface SetupWizardFormData {
  scopeType: AccountingScopeType;
  officeIds: string[];
  baseCurrency: string;
  taxInclusive: boolean;
  templateId: string;
}
