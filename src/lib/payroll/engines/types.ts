/**
 * Payroll Calculation Engine Types
 * Strategy interface for country-specific payroll calculations
 */

import type {
  PayrollCountry,
  SalaryStructure,
  TaxSlab,
  SocialSecurityRule,
  StatutoryRule,
  PayrollEarningLine,
  PayrollDeductionLine,
  EmployerContributionLine,
  PayrollCalculationResult,
  PayrollAttendanceSummary,
  PayrollLeaveSummary,
  EmployeeTaxProfile,
} from '@/types/payroll';

export interface EmployeePayrollData {
  id: string;
  join_date: string;
  tax_profile: EmployeeTaxProfile | null;
  department: string;
  position: string;
}

export interface PayrollCalculationParams {
  employee: EmployeePayrollData;
  salaryStructure: SalaryStructure;
  period: { start: string; end: string };
  attendanceSummary: PayrollAttendanceSummary;
  leaveSummary: PayrollLeaveSummary;
  taxSlabs: TaxSlab[];
  socialSecurityRules: SocialSecurityRule[];
  statutoryRules: StatutoryRule[];
  currency: string;
}

export interface ICountryPayrollEngine {
  country: PayrollCountry;
  
  /**
   * Calculate payroll for a single employee
   */
  calculateForEmployee(params: PayrollCalculationParams): PayrollCalculationResult;
  
  /**
   * Calculate gross earnings from salary structure and attendance
   */
  calculateGrossEarnings(
    salaryStructure: SalaryStructure,
    attendanceSummary: PayrollAttendanceSummary,
    leaveSummary: PayrollLeaveSummary,
    statutoryRules: StatutoryRule[]
  ): PayrollEarningLine[];
  
  /**
   * Calculate statutory deductions (tax, social security)
   */
  calculateDeductions(
    grossEarnings: number,
    earnings: PayrollEarningLine[],
    taxSlabs: TaxSlab[],
    socialSecurityRules: SocialSecurityRule[],
    statutoryRules: StatutoryRule[],
    taxProfile: EmployeeTaxProfile | null
  ): PayrollDeductionLine[];
  
  /**
   * Calculate employer contributions (not deducted from employee)
   */
  calculateEmployerContributions(
    grossEarnings: number,
    earnings: PayrollEarningLine[],
    socialSecurityRules: SocialSecurityRule[],
    statutoryRules: StatutoryRule[]
  ): EmployerContributionLine[];
}

// Helper to get working days in a month
export function getWorkingDaysInMonth(year: number, month: number): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let workingDays = 0;
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    // Exclude Saturday (6) and Sunday (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
  }
  
  return workingDays;
}

// Helper to calculate pro-rata salary
export function calculateProRataSalary(
  monthlySalary: number,
  daysWorked: number,
  totalDays: number
): number {
  if (totalDays === 0) return 0;
  return (monthlySalary / totalDays) * daysWorked;
}

// Helper to find applicable tax slab
export function findApplicableTaxRate(
  annualIncome: number,
  taxSlabs: TaxSlab[],
  maritalStatus?: 'single' | 'married'
): number {
  // Filter slabs by marital status if provided
  const applicableSlabs = taxSlabs.filter(slab => {
    if (!maritalStatus || !slab.metadata?.marital_status) return true;
    return slab.metadata.marital_status === maritalStatus;
  });
  
  // Sort by slab_min ascending
  const sortedSlabs = [...applicableSlabs].sort((a, b) => a.slab_min - b.slab_min);
  
  let totalTax = 0;
  let remainingIncome = annualIncome;
  
  for (const slab of sortedSlabs) {
    if (remainingIncome <= 0) break;
    
    const slabMax = slab.slab_max ?? Infinity;
    const slabRange = slabMax - slab.slab_min;
    const taxableInSlab = Math.min(remainingIncome, slabRange);
    
    if (annualIncome > slab.slab_min) {
      totalTax += taxableInSlab * (slab.rate_percent / 100);
      remainingIncome -= taxableInSlab;
    }
  }
  
  return totalTax;
}

// Helper to get basic salary from earnings
export function getBasicSalary(earnings: PayrollEarningLine[]): number {
  const basic = earnings.find(e => e.type === 'basic');
  return basic?.amount ?? 0;
}

// Helper to get taxable earnings
export function getTaxableEarnings(earnings: PayrollEarningLine[]): number {
  return earnings
    .filter(e => e.is_taxable)
    .reduce((sum, e) => sum + e.amount, 0);
}
