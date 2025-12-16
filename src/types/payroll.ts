/**
 * Payroll Management System Types
 * Multi-country payroll types for Nepal, India, Australia
 */

// Country codes for payroll
export type PayrollCountry = 'NP' | 'IN' | 'AU';

// Pay frequency options
export type PayFrequency = 'monthly' | 'fortnightly' | 'weekly';

// Payroll run status workflow
export type PayrollRunStatus = 'draft' | 'calculated' | 'approved' | 'locked';

// Salary component types
export type SalaryComponentType = 'earning' | 'deduction' | 'bonus';

// Calculation methods for salary components
export type CalculationMethod = 'fixed_amount' | 'percentage_of_base' | 'formula';

// Salary period
export type SalaryPeriod = 'monthly' | 'annual';

// Salary type
export type SalaryType = 'ctc' | 'gross' | 'net';

// Employment type
export type EmploymentType = 'full-time' | 'part-time' | 'contractor' | 'casual';

// Earning types
export type EarningType = 'basic' | 'allowance' | 'overtime' | 'bonus' | 'commission' | 'other';

// Deduction types
export type DeductionType = 'tax' | 'pf' | 'ssf' | 'esi' | 'pt' | 'unpaid_leave' | 'loan' | 'other';

// Employer contribution types
export type ContributionType = 'pf_employer' | 'ssf_employer' | 'sg' | 'esi_employer' | 'gratuity' | 'other';

// Social security rule types
export type SocialSecurityRuleType = 'pf' | 'ssf' | 'sg' | 'esi';

// Statutory rule types
export type StatutoryRuleType = 'overtime' | 'min_wage' | 'bonus' | 'pt' | 'gratuity';

// Base type for social security calculation
export type SocialSecurityBaseType = 'basic_salary' | 'gross' | 'ote';

// ============ Core Entities ============

export interface LegalEntity {
  id: string;
  organization_id: string;
  name: string;
  country: PayrollCountry;
  registration_number: string | null;
  tax_id: string | null;
  address: LegalEntityAddress | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LegalEntityAddress {
  street?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

export interface PayrollProfile {
  id: string;
  legal_entity_id: string;
  organization_id: string;
  name: string;
  country: PayrollCountry;
  currency: string;
  pay_frequency: PayFrequency;
  standard_hours_per_week: number;
  timezone: string;
  is_default: boolean;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  legal_entity?: LegalEntity;
}

export interface SalaryStructure {
  id: string;
  employee_id: string;
  organization_id: string;
  effective_from: string;
  effective_to: string | null;
  base_salary_amount: number;
  salary_period: SalaryPeriod;
  salary_type: SalaryType;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  components?: SalaryComponent[];
}

export interface SalaryComponent {
  id: string;
  salary_structure_id: string;
  organization_id: string;
  component_type: SalaryComponentType;
  name: string;
  calculation_method: CalculationMethod;
  value: number;
  is_taxable: boolean;
  is_pf_applicable: boolean;
  is_ssf_applicable: boolean;
  is_super_applicable: boolean;
  sort_order: number;
  created_at: string;
}

export interface TaxSlab {
  id: string;
  country: PayrollCountry;
  payroll_profile_id: string | null;
  organization_id: string | null;
  effective_from: string;
  effective_to: string | null;
  slab_min: number;
  slab_max: number | null;
  rate_percent: number;
  metadata: TaxSlabMetadata | null;
  created_at: string;
}

export interface TaxSlabMetadata {
  marital_status?: 'single' | 'married';
  regime?: 'old' | 'new';
  description?: string;
}

export interface SocialSecurityRule {
  id: string;
  country: PayrollCountry;
  payroll_profile_id: string | null;
  organization_id: string | null;
  rule_type: SocialSecurityRuleType;
  effective_from: string;
  effective_to: string | null;
  employee_rate_percent: number;
  employer_rate_percent: number;
  base_type: SocialSecurityBaseType;
  caps: SocialSecurityCaps | null;
  created_at: string;
}

export interface SocialSecurityCaps {
  max_employee_contribution?: number;
  max_employer_contribution?: number;
  max_salary_ceiling?: number;
  min_salary_threshold?: number;
}

export interface StatutoryRule {
  id: string;
  country: PayrollCountry;
  payroll_profile_id: string | null;
  organization_id: string | null;
  rule_type: StatutoryRuleType;
  effective_from: string;
  effective_to: string | null;
  config: StatutoryRuleConfig;
  created_at: string;
}

export interface StatutoryRuleConfig {
  // Overtime config
  overtime_multiplier?: number;
  overtime_threshold_hours?: number;
  // Minimum wage config
  min_hourly_rate?: number;
  min_monthly_rate?: number;
  // Bonus config
  bonus_percent?: number;
  bonus_max_salary?: number;
  // Professional tax config
  pt_slabs?: Array<{ min: number; max: number | null; amount: number }>;
  // Gratuity config
  gratuity_percent?: number;
  gratuity_years_threshold?: number;
}

// ============ Payroll Run Entities ============

export interface PayrollRun {
  id: string;
  payroll_profile_id: string;
  organization_id: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  status: PayrollRunStatus;
  summary_totals: PayrollRunSummary | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  payroll_profile?: PayrollProfile;
  items?: PayrollRunItem[];
}

export interface PayrollRunSummary {
  total_employees: number;
  total_gross_earnings: number;
  total_deductions: number;
  total_employer_contributions: number;
  total_net_pay: number;
  currency: string;
}

export interface PayrollRunItem {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  organization_id: string;
  gross_earnings: number;
  total_deductions: number;
  employer_contributions_total: number;
  net_pay: number;
  currency: string;
  calculation_snapshot: CalculationSnapshot | null;
  has_manual_adjustment: boolean;
  adjustment_notes: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  earnings?: PayrollEarning[];
  deductions?: PayrollDeduction[];
  employer_contributions?: EmployerContribution[];
}

export interface CalculationSnapshot {
  calculated_at: string;
  salary_structure_id: string;
  base_salary: number;
  days_worked: number;
  days_in_period: number;
  overtime_hours: number;
  unpaid_leave_days: number;
  tax_slabs_used: TaxSlab[];
  social_security_rules_used: SocialSecurityRule[];
  statutory_rules_used: StatutoryRule[];
}

export interface PayrollEarning {
  id: string;
  run_item_id: string;
  organization_id: string;
  earning_type: EarningType;
  description: string;
  amount: number;
  is_manual: boolean;
  created_at: string;
}

export interface PayrollDeduction {
  id: string;
  run_item_id: string;
  organization_id: string;
  deduction_type: DeductionType;
  description: string;
  amount: number;
  is_manual: boolean;
  created_at: string;
}

export interface EmployerContribution {
  id: string;
  run_item_id: string;
  organization_id: string;
  contribution_type: ContributionType;
  description: string;
  amount: number;
  created_at: string;
}

// ============ Payslip ============

export interface Payslip {
  id: string;
  payroll_run_item_id: string;
  employee_id: string;
  organization_id: string;
  payslip_number: string;
  generated_at: string;
  pdf_url: string | null;
  emailed_at: string | null;
  created_at: string;
  // Relations
  run_item?: PayrollRunItem;
}

// ============ Employee Bank Account ============

export interface EmployeeBankAccount {
  id: string;
  employee_id: string;
  organization_id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  routing_code: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

// ============ Input Types for Mutations ============

export interface CreateLegalEntityInput {
  organization_id: string;
  name: string;
  country: PayrollCountry;
  registration_number?: string;
  tax_id?: string;
  address?: LegalEntityAddress;
}

export interface UpdateLegalEntityInput {
  name?: string;
  country?: PayrollCountry;
  registration_number?: string;
  tax_id?: string;
  address?: LegalEntityAddress;
  is_active?: boolean;
}

export interface CreatePayrollProfileInput {
  legal_entity_id: string;
  organization_id: string;
  name: string;
  country: PayrollCountry;
  currency: string;
  pay_frequency: PayFrequency;
  standard_hours_per_week?: number;
  timezone?: string;
  is_default?: boolean;
  effective_from: string;
  effective_to?: string;
}

export interface UpdatePayrollProfileInput {
  name?: string;
  currency?: string;
  pay_frequency?: PayFrequency;
  standard_hours_per_week?: number;
  timezone?: string;
  is_default?: boolean;
  effective_to?: string;
}

export interface CreateSalaryStructureInput {
  employee_id: string;
  organization_id: string;
  effective_from: string;
  effective_to?: string;
  base_salary_amount: number;
  salary_period: SalaryPeriod;
  salary_type: SalaryType;
  components?: CreateSalaryComponentInput[];
}

export interface CreateSalaryComponentInput {
  component_type: SalaryComponentType;
  name: string;
  calculation_method: CalculationMethod;
  value: number;
  is_taxable?: boolean;
  is_pf_applicable?: boolean;
  is_ssf_applicable?: boolean;
  is_super_applicable?: boolean;
  sort_order?: number;
}

export interface CreateTaxSlabInput {
  country: PayrollCountry;
  payroll_profile_id?: string;
  organization_id?: string;
  effective_from: string;
  effective_to?: string;
  slab_min: number;
  slab_max?: number;
  rate_percent: number;
  metadata?: TaxSlabMetadata;
}

export interface CreateSocialSecurityRuleInput {
  country: PayrollCountry;
  payroll_profile_id?: string;
  organization_id?: string;
  rule_type: SocialSecurityRuleType;
  effective_from: string;
  effective_to?: string;
  employee_rate_percent: number;
  employer_rate_percent: number;
  base_type: SocialSecurityBaseType;
  caps?: SocialSecurityCaps;
}

export interface CreateStatutoryRuleInput {
  country: PayrollCountry;
  payroll_profile_id?: string;
  organization_id?: string;
  rule_type: StatutoryRuleType;
  effective_from: string;
  effective_to?: string;
  config: StatutoryRuleConfig;
}

export interface CreatePayrollRunInput {
  payroll_profile_id: string;
  organization_id: string;
  period_start: string;
  period_end: string;
  pay_date: string;
}

export interface CreateEmployeeBankAccountInput {
  employee_id: string;
  organization_id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  routing_code?: string;
  is_primary?: boolean;
}

export interface UpdateEmployeeBankAccountInput {
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  routing_code?: string;
  is_primary?: boolean;
}

// ============ Calculation Types ============

export interface PayrollAttendanceSummary {
  days_worked: number;
  days_in_period: number;
  overtime_hours: number;
  late_arrivals: number;
  early_departures: number;
}

export interface PayrollLeaveSummary {
  paid_leave_days: number;
  unpaid_leave_days: number;
  leave_by_type: Record<string, number>;
}

export interface PayrollCalculationParams {
  employee_id: string;
  salary_structure: SalaryStructure;
  period: { start: string; end: string };
  attendance_summary: PayrollAttendanceSummary;
  leave_summary: PayrollLeaveSummary;
  tax_slabs: TaxSlab[];
  social_security_rules: SocialSecurityRule[];
  statutory_rules: StatutoryRule[];
}

export interface PayrollEarningLine {
  type: EarningType;
  description: string;
  amount: number;
  is_taxable: boolean;
}

export interface PayrollDeductionLine {
  type: DeductionType;
  description: string;
  amount: number;
}

export interface EmployerContributionLine {
  type: ContributionType;
  description: string;
  amount: number;
}

export interface PayrollCalculationResult {
  earnings: PayrollEarningLine[];
  deductions: PayrollDeductionLine[];
  employer_contributions: EmployerContributionLine[];
  gross_earnings: number;
  total_deductions: number;
  employer_contributions_total: number;
  net_pay: number;
  metadata: {
    calculated_at: string;
    country: PayrollCountry;
    currency: string;
    days_worked: number;
    days_in_period: number;
    overtime_hours: number;
    unpaid_leave_days: number;
  };
}

// ============ Employee Payroll Extensions ============

export interface EmployeeTaxProfile {
  // Nepal
  pan_number?: string;
  ssf_number?: string;
  marital_status?: 'single' | 'married';
  // India
  uan?: string; // Universal Account Number for PF
  esic_number?: string;
  tax_regime?: 'old' | 'new';
  // Australia
  tfn?: string; // Tax File Number
  super_fund_name?: string;
  super_fund_usi?: string;
  super_member_number?: string;
  tax_free_threshold?: boolean;
  hecs_help_debt?: boolean;
}

export interface EmployeeWithPayroll {
  id: string;
  user_id: string;
  organization_id: string;
  legal_entity_id: string | null;
  payroll_profile_id: string | null;
  employment_type: EmploymentType | null;
  tax_profile: EmployeeTaxProfile | null;
  // Standard employee fields
  position: string;
  department: string;
  join_date: string;
  status: string;
  // Relations
  salary_structure?: SalaryStructure;
  bank_accounts?: EmployeeBankAccount[];
  payroll_profile?: PayrollProfile;
}
