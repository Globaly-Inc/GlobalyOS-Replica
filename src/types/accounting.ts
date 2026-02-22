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

// Banking types
export type BankStatementLineStatus = 'unmatched' | 'matched' | 'reconciled' | 'excluded';

export interface BankAccount {
  id: string;
  organization_id: string;
  ledger_id: string;
  office_id: string;
  name: string;
  account_number: string | null;
  bsb: string | null;
  bank_name: string | null;
  currency: string;
  chart_account_id: string;
  current_balance: number;
  is_active: boolean;
  created_at: string;
}

export interface BankStatement {
  id: string;
  bank_account_id: string;
  file_name: string;
  import_date: string;
  start_date: string | null;
  end_date: string | null;
  row_count: number;
  idempotency_key: string | null;
  created_at: string;
}

export interface BankStatementLine {
  id: string;
  statement_id: string;
  date: string;
  description: string;
  amount: number;
  balance: number | null;
  reference: string | null;
  payee: string | null;
  status: BankStatementLineStatus;
  matched_journal_id: string | null;
  matched_invoice_id: string | null;
  matched_bill_id: string | null;
  categorized_account_id: string | null;
  created_at: string;
}

export interface BankRule {
  id: string;
  organization_id: string;
  ledger_id: string;
  office_id: string | null;
  name: string;
  priority: number;
  conditions: Record<string, unknown>[];
  actions: Record<string, unknown>;
  auto_add: boolean;
  is_active: boolean;
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

// ============================================================
// Revised Invoicing System Types
// ============================================================

export type CrmInvoiceType = 'general' | 'commission';
export type CrmInvoiceRecipientType = 'contact' | 'partner';
export type IncomeSharingStatus = 'unpaid' | 'partially_paid' | 'paid';
export type IncomeSharingReceiverType = 'partner' | 'office' | 'team';
export type InvoiceScheduleStatus = 'pending' | 'generated' | 'skipped';
export type InvoiceCommentAuthorType = 'staff' | 'client' | 'partner' | 'system';
export type PaymentOptionType = 'bank_transfer' | 'stripe' | 'other';
export type InvoiceTaxType = 'inclusive' | 'exclusive';

// Extended invoice fields (beyond base AccountingInvoice)
export interface AccountingInvoiceExtended extends AccountingInvoice {
  invoice_type: CrmInvoiceType;
  recipient_type: CrmInvoiceRecipientType;
  crm_contact_id: string | null;
  crm_partner_id: string | null;
  deal_id: string | null;
  billing_address: Record<string, unknown> | null;
  tax_type: InvoiceTaxType;
  payment_option_id: string | null;
  enable_online_payment: boolean;
  public_token: string | null;
  token_expires_at: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  discount_total: number;
  attachments: Record<string, unknown>[];
  // Joined data
  invoice_services?: AccountingInvoiceService[];
  income_sharing?: AccountingInvoiceIncomeSharing[];
  comments?: AccountingInvoiceComment[];
  payment_option?: AccountingPaymentOption | null;
  crm_contact?: { id: string; first_name: string; last_name: string | null; email: string | null } | null;
  crm_partner?: { id: string; name: string; email: string | null } | null;
  deal?: { id: string; name: string } | null;
}

export interface AccountingInvoiceService {
  id: string;
  invoice_id: string;
  organization_id: string;
  service_id: string | null;
  service_name: string;
  provider_name: string | null;
  deal_fee_id: string | null;
  sort_order: number;
  subtotal: number;
  tax_total: number;
  total: number;
  created_at: string;
  // Joined
  lines?: AccountingInvoiceLineExtended[];
}

export interface AccountingInvoiceLineExtended extends AccountingInvoiceLine {
  invoice_service_id: string | null;
  fee_type: string | null;
  account_category: string | null;
  is_discount: boolean;
  instalment_id: string | null;
}

export interface AccountingInvoiceIncomeSharing {
  id: string;
  invoice_id: string;
  organization_id: string;
  invoice_service_id: string | null;
  receiver_type: IncomeSharingReceiverType;
  receiver_id: string;
  receiver_name: string;
  sharing_amount: number;
  tax_mode: InvoiceTaxType;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  status: IncomeSharingStatus;
  amount_paid: number;
  created_at: string;
  // Joined
  payments?: AccountingIncomeSharingPayment[];
}

export interface AccountingIncomeSharingPayment {
  id: string;
  income_sharing_id: string;
  organization_id: string;
  commission_invoice_id: string | null;
  amount: number;
  paid_at: string;
  reference: string | null;
  created_at: string;
}

export interface AccountingInvoiceSchedule {
  id: string;
  organization_id: string;
  deal_id: string;
  deal_fee_id: string;
  instalment_id: string;
  scheduled_date: string;
  invoice_id: string | null;
  status: InvoiceScheduleStatus;
  auto_send: boolean;
  created_at: string;
  // Joined
  deal?: { id: string; name: string } | null;
  invoice?: { id: string; invoice_number: string; status: InvoiceStatus } | null;
}

export interface AccountingInvoiceComment {
  id: string;
  invoice_id: string;
  organization_id: string;
  author_type: InvoiceCommentAuthorType;
  author_name: string | null;
  content: string;
  created_at: string;
}

export interface AccountingPaymentOption {
  id: string;
  organization_id: string;
  name: string;
  type: PaymentOptionType;
  bank_details: {
    account_name?: string;
    bank_name?: string;
    bsb?: string;
    account_number?: string;
    [key: string]: unknown;
  } | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

// Invoice editor form types
export interface InvoiceServiceFormData {
  id?: string;
  service_id?: string;
  service_name: string;
  provider_name?: string;
  deal_fee_id?: string;
  lines: InvoiceLineFormData[];
}

export interface InvoiceLineFormData {
  id?: string;
  description: string;
  fee_type?: string;
  account_category?: string;
  quantity: number;
  unit_price: number;
  amount: number;
  tax_rate_id?: string;
  tax_amount: number;
  is_discount: boolean;
  instalment_id?: string;
  account_id: string;
}

export interface InvoiceFormData {
  invoice_type: CrmInvoiceType;
  recipient_type: CrmInvoiceRecipientType;
  crm_contact_id?: string;
  crm_partner_id?: string;
  contact_id?: string; // legacy accounting contact
  deal_id?: string;
  invoice_number: string;
  reference?: string;
  date: string;
  due_date: string;
  currency: string;
  tax_type: InvoiceTaxType;
  payment_option_id?: string;
  enable_online_payment: boolean;
  notes?: string;
  terms?: string;
  billing_address?: Record<string, unknown>;
  services: InvoiceServiceFormData[];
  attachments: Record<string, unknown>[];
}

// Tax calculation helpers
export interface TaxCalculationResult {
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  amountDue: number;
}

export function calculateLineTax(
  amount: number,
  taxRate: number,
  taxType: InvoiceTaxType
): { taxAmount: number; netAmount: number } {
  if (taxType === 'inclusive') {
    const netAmount = amount / (1 + taxRate / 100);
    return { taxAmount: amount - netAmount, netAmount };
  }
  return { taxAmount: amount * (taxRate / 100), netAmount: amount };
}

export function calculateInvoiceTotals(
  services: InvoiceServiceFormData[],
  amountPaid: number = 0
): TaxCalculationResult {
  let subtotal = 0;
  let taxTotal = 0;
  let discountTotal = 0;

  for (const svc of services) {
    for (const line of svc.lines) {
      if (line.is_discount) {
        discountTotal += Math.abs(line.amount);
      } else {
        subtotal += line.amount;
      }
      taxTotal += line.tax_amount;
    }
  }

  const total = subtotal - discountTotal + taxTotal;
  return { subtotal, taxTotal, discountTotal, total, amountDue: total - amountPaid };
}
