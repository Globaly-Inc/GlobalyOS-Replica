/**
 * CRM Quotation Management Type Definitions
 */

export type QuotationStatus = 'draft' | 'sent' | 'viewed' | 'approved' | 'rejected' | 'expired' | 'processed' | 'archived';

export type QuotationCommentAuthorType = 'staff' | 'client' | 'agent' | 'system';

export type QuotationInstallmentType = 'equal' | 'custom';

export type FeeRevenueType = 'revenue_from_client' | 'commission_from_partner';

export type TaxMode = 'inclusive' | 'exclusive';

export interface InstallmentDetail {
  index: number;
  amount: number;
  due_date: string;
  label?: string;
}

export interface CRMQuotation {
  id: string;
  organization_id: string;
  contact_id: string | null;
  company_id: string | null;
  office_id: string | null;
  assignee_id: string | null;
  quotation_number: string;
  status: QuotationStatus;
  currency: string;
  valid_until: string | null;
  payment_details: Record<string, any>;
  notes: string | null;
  cover_letter: string | null;
  discount_amount: number;
  discount_description: string | null;
  subtotal: number;
  tax_total: number;
  grand_total: number;
  is_template: boolean;
  template_name: string | null;
  public_token: string | null;
  token_expires_at: string | null;
  approved_at: string | null;
  approved_option_id: string | null;
  approved_by_name: string | null;
  approved_by_email: string | null;
  processed_deal_id: string | null;
  processed_invoice_id: string | null;
  version: number;
  parent_quotation_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  viewed_at: string | null;
  // Joined data
  contact?: { id: string; first_name: string; last_name: string | null; email: string | null } | null;
  company?: { id: string; name: string } | null;
  assignee?: { id: string; profiles: { full_name: string; avatar_url: string | null } } | null;
  options?: CRMQuotationOption[];
}

export interface CRMQuotationOption {
  id: string;
  quotation_id: string;
  organization_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  subtotal: number;
  tax_total: number;
  total: number;
  is_approved: boolean;
  created_at: string;
  // Joined data
  services?: CRMQuotationOptionService[];
}

export interface CRMQuotationOptionService {
  id: string;
  option_id: string;
  organization_id: string;
  service_id: string | null;
  service_name: string;
  partner_id: string | null;
  partner_branch_id: string | null;
  product_fee_option_id: string | null;
  service_date: string | null;
  sort_order: number;
  created_at: string;
  // Joined data
  service?: { id: string; name: string } | null;
  partner?: { id: string; name: string } | null;
  fees?: CRMQuotationServiceFee[];
}

export interface CRMQuotationServiceFee {
  id: string;
  option_service_id: string;
  organization_id: string;
  fee_type_id: string | null;
  fee_name: string;
  revenue_type: FeeRevenueType;
  installment_type: QuotationInstallmentType;
  amount: number;
  tax_mode: TaxMode;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  num_installments: number;
  installment_details: InstallmentDetail[];
  created_at: string;
  // Joined data
  fee_type?: { id: string; name: string } | null;
}

export interface CRMQuotationComment {
  id: string;
  quotation_id: string;
  organization_id: string;
  author_type: QuotationCommentAuthorType;
  author_id: string | null;
  author_name: string | null;
  content: string;
  created_at: string;
}

export interface CRMQuotationSettings {
  id: string;
  organization_id: string;
  auto_process_on_approve: boolean;
  auto_create_invoice: boolean;
  default_currency: string;
  default_validity_days: number;
  quotation_prefix: string;
  next_quotation_number: number;
  default_payment_details: Record<string, any>;
  default_cover_letter: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuotationFilters {
  search?: string;
  status?: QuotationStatus | 'all';
  assignee_id?: string;
  contact_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}

// Tax calculation helpers
export function calculateTax(amount: number, taxRate: number, taxMode: TaxMode): { baseAmount: number; taxAmount: number; totalAmount: number } {
  if (taxMode === 'inclusive') {
    const baseAmount = amount / (1 + taxRate / 100);
    const taxAmount = amount - baseAmount;
    return {
      baseAmount: Math.round(baseAmount * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      totalAmount: amount,
    };
  } else {
    const taxAmount = amount * (taxRate / 100);
    return {
      baseAmount: amount,
      taxAmount: Math.round(taxAmount * 100) / 100,
      totalAmount: Math.round((amount + taxAmount) * 100) / 100,
    };
  }
}

export function calculateEqualInstallments(totalAmount: number, numInstallments: number): number[] {
  if (numInstallments <= 0) return [totalAmount];
  const baseAmount = Math.floor((totalAmount / numInstallments) * 100) / 100;
  const remainder = Math.round((totalAmount - baseAmount * numInstallments) * 100) / 100;
  const installments = Array(numInstallments).fill(baseAmount);
  if (remainder !== 0) {
    installments[0] = Math.round((installments[0] + remainder) * 100) / 100;
  }
  return installments;
}
