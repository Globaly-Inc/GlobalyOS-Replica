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

// Setup wizard form types
export interface SetupWizardFormData {
  scopeType: AccountingScopeType;
  officeIds: string[];
  baseCurrency: string;
  taxInclusive: boolean;
  templateId: string;
}
