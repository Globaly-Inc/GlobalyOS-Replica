/**
 * India Payroll Calculation Engine
 * 
 * Key features:
 * - PF (Provident Fund): 12% employer, 12% employee of basic + DA
 * - ESI (Employee State Insurance): 3.25% employer, 0.75% employee (if gross ≤ ₹21,000)
 * - Professional Tax: State-specific, deducted monthly
 * - TDS (Tax Deducted at Source): Based on annual projection
 * - Gratuity accrual: 4.81% of basic (for >5 years service)
 */

import type {
  PayrollEarningLine,
  PayrollDeductionLine,
  EmployerContributionLine,
  PayrollCalculationResult,
  TaxSlab,
  SocialSecurityRule,
  StatutoryRule,
  SalaryStructure,
  PayrollAttendanceSummary,
  PayrollLeaveSummary,
  EmployeeTaxProfile,
} from '@/types/payroll';
import type { ICountryPayrollEngine, PayrollCalculationParams } from './types';
import {
  calculateProRataSalary,
  findApplicableTaxRate,
  getBasicSalary,
  getTaxableEarnings,
} from './types';

export class IndiaPayrollEngine implements ICountryPayrollEngine {
  country = 'IN' as const;
  
  calculateForEmployee(params: PayrollCalculationParams): PayrollCalculationResult {
    const {
      employee,
      salaryStructure,
      attendanceSummary,
      leaveSummary,
      taxSlabs,
      socialSecurityRules,
      statutoryRules,
      currency,
    } = params;
    
    // Step 1: Calculate gross earnings
    const earnings = this.calculateGrossEarnings(
      salaryStructure,
      attendanceSummary,
      leaveSummary,
      statutoryRules
    );
    
    const grossEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);
    
    // Step 2: Calculate deductions
    const deductions = this.calculateDeductions(
      grossEarnings,
      earnings,
      taxSlabs,
      socialSecurityRules,
      statutoryRules,
      employee.tax_profile
    );
    
    const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
    
    // Step 3: Calculate employer contributions
    const employerContributions = this.calculateEmployerContributions(
      grossEarnings,
      earnings,
      socialSecurityRules,
      statutoryRules
    );
    
    const employerContributionsTotal = employerContributions.reduce((sum, c) => sum + c.amount, 0);
    
    // Step 4: Calculate net pay
    const netPay = grossEarnings - totalDeductions;
    
    return {
      earnings,
      deductions,
      employer_contributions: employerContributions,
      gross_earnings: Math.round(grossEarnings * 100) / 100,
      total_deductions: Math.round(totalDeductions * 100) / 100,
      employer_contributions_total: Math.round(employerContributionsTotal * 100) / 100,
      net_pay: Math.round(netPay * 100) / 100,
      metadata: {
        calculated_at: new Date().toISOString(),
        country: 'IN',
        currency,
        days_worked: attendanceSummary.days_worked,
        days_in_period: attendanceSummary.days_in_period,
        overtime_hours: attendanceSummary.overtime_hours,
        unpaid_leave_days: leaveSummary.unpaid_leave_days,
      },
    };
  }
  
  calculateGrossEarnings(
    salaryStructure: SalaryStructure,
    attendanceSummary: PayrollAttendanceSummary,
    leaveSummary: PayrollLeaveSummary,
    statutoryRules: StatutoryRule[]
  ): PayrollEarningLine[] {
    const earnings: PayrollEarningLine[] = [];
    const { days_worked, days_in_period, overtime_hours } = attendanceSummary;
    const { unpaid_leave_days } = leaveSummary;
    
    // Get monthly base salary
    let monthlyBase = salaryStructure.base_salary_amount;
    if (salaryStructure.salary_period === 'annual') {
      monthlyBase = salaryStructure.base_salary_amount / 12;
    }
    
    // Calculate effective days worked
    const effectiveDaysWorked = days_worked - unpaid_leave_days;
    
    // Pro-rata basic salary
    const basicSalary = calculateProRataSalary(monthlyBase, effectiveDaysWorked, days_in_period);
    
    earnings.push({
      type: 'basic',
      description: 'Basic Salary',
      amount: Math.round(basicSalary * 100) / 100,
      is_taxable: true,
    });
    
    // Process salary components
    if (salaryStructure.components) {
      for (const component of salaryStructure.components) {
        if (component.component_type === 'earning') {
          let amount = 0;
          
          if (component.calculation_method === 'fixed_amount') {
            amount = calculateProRataSalary(component.value, effectiveDaysWorked, days_in_period);
          } else if (component.calculation_method === 'percentage_of_base') {
            amount = basicSalary * (component.value / 100);
          }
          
          if (amount > 0) {
            earnings.push({
              type: 'allowance',
              description: component.name,
              amount: Math.round(amount * 100) / 100,
              is_taxable: component.is_taxable,
            });
          }
        }
      }
    }
    
    // Calculate overtime (India typically 2x for overtime)
    if (overtime_hours > 0) {
      const overtimeRule = statutoryRules.find(r => r.rule_type === 'overtime');
      const overtimeMultiplier = overtimeRule?.config?.overtime_multiplier ?? 2.0;
      
      // Hourly rate (assuming 26 days, 8 hours)
      const hourlyRate = monthlyBase / (26 * 8);
      const overtimeAmount = overtime_hours * hourlyRate * overtimeMultiplier;
      
      earnings.push({
        type: 'overtime',
        description: `Overtime (${overtime_hours} hrs @ ${overtimeMultiplier}x)`,
        amount: Math.round(overtimeAmount * 100) / 100,
        is_taxable: true,
      });
    }
    
    return earnings;
  }
  
  calculateDeductions(
    grossEarnings: number,
    earnings: PayrollEarningLine[],
    taxSlabs: TaxSlab[],
    socialSecurityRules: SocialSecurityRule[],
    statutoryRules: StatutoryRule[],
    taxProfile: EmployeeTaxProfile | null
  ): PayrollDeductionLine[] {
    const deductions: PayrollDeductionLine[] = [];
    const basicSalary = getBasicSalary(earnings);
    
    // Get DA (Dearness Allowance) for PF calculation
    const daAllowance = earnings.find(e => 
      e.description.toLowerCase().includes('dearness') || 
      e.description.toLowerCase().includes('da')
    )?.amount ?? 0;
    
    const pfBase = basicSalary + daAllowance;
    
    // PF Employee Contribution (12% of Basic + DA)
    const pfRule = socialSecurityRules.find(r => r.rule_type === 'pf');
    if (pfRule) {
      // PF wage ceiling is ₹15,000
      const pfCeiling = pfRule.caps?.max_salary_ceiling ?? 15000;
      const effectivePfBase = Math.min(pfBase, pfCeiling);
      const pfEmployeeAmount = effectivePfBase * (pfRule.employee_rate_percent / 100);
      
      deductions.push({
        type: 'pf',
        description: `PF Employee (${pfRule.employee_rate_percent}%)`,
        amount: Math.round(pfEmployeeAmount * 100) / 100,
      });
    }
    
    // ESI Employee Contribution (0.75% if gross ≤ ₹21,000)
    const esiRule = socialSecurityRules.find(r => r.rule_type === 'esi');
    if (esiRule) {
      const esiThreshold = esiRule.caps?.max_salary_ceiling ?? 21000;
      if (grossEarnings <= esiThreshold) {
        const esiEmployeeAmount = grossEarnings * (esiRule.employee_rate_percent / 100);
        
        deductions.push({
          type: 'esi',
          description: `ESI Employee (${esiRule.employee_rate_percent}%)`,
          amount: Math.round(esiEmployeeAmount * 100) / 100,
        });
      }
    }
    
    // Professional Tax (state-specific, using statutory rules)
    const ptRule = statutoryRules.find(r => r.rule_type === 'pt');
    if (ptRule?.config?.pt_slabs) {
      const ptSlabs = ptRule.config.pt_slabs;
      const applicableSlab = ptSlabs.find(slab => 
        grossEarnings >= slab.min && 
        (slab.max === null || grossEarnings <= slab.max)
      );
      
      if (applicableSlab) {
        deductions.push({
          type: 'pt',
          description: 'Professional Tax',
          amount: applicableSlab.amount,
        });
      }
    }
    
    // TDS (Income Tax) Calculation
    const taxableEarnings = getTaxableEarnings(earnings);
    
    // Standard deduction for salaried employees (₹50,000 annually)
    const standardDeduction = 50000 / 12;
    
    // PF is tax-exempt
    const pfDeduction = deductions.find(d => d.type === 'pf')?.amount ?? 0;
    
    // Taxable income after deductions
    const monthlyTaxableIncome = taxableEarnings - standardDeduction - pfDeduction;
    const annualTaxableIncome = Math.max(0, monthlyTaxableIncome * 12);
    
    // Use tax regime from profile (new regime by default)
    const taxRegime = taxProfile?.tax_regime ?? 'new';
    
    // Filter slabs by regime
    const applicableSlabs = taxSlabs.filter(slab => 
      !slab.metadata?.regime || slab.metadata.regime === taxRegime
    );
    
    // Calculate annual tax
    const annualTax = findApplicableTaxRate(annualTaxableIncome, applicableSlabs);
    
    // Add 4% health and education cess
    const taxWithCess = annualTax * 1.04;
    const monthlyTax = taxWithCess / 12;
    
    if (monthlyTax > 0) {
      deductions.push({
        type: 'tax',
        description: `TDS (${taxRegime} regime)`,
        amount: Math.round(monthlyTax * 100) / 100,
      });
    }
    
    return deductions;
  }
  
  calculateEmployerContributions(
    grossEarnings: number,
    earnings: PayrollEarningLine[],
    socialSecurityRules: SocialSecurityRule[],
    statutoryRules: StatutoryRule[]
  ): EmployerContributionLine[] {
    const contributions: EmployerContributionLine[] = [];
    const basicSalary = getBasicSalary(earnings);
    
    // Get DA for PF calculation
    const daAllowance = earnings.find(e => 
      e.description.toLowerCase().includes('dearness') || 
      e.description.toLowerCase().includes('da')
    )?.amount ?? 0;
    
    const pfBase = basicSalary + daAllowance;
    
    // PF Employer Contribution (12% of Basic + DA, split into PF and Pension)
    const pfRule = socialSecurityRules.find(r => r.rule_type === 'pf');
    if (pfRule) {
      const pfCeiling = pfRule.caps?.max_salary_ceiling ?? 15000;
      const effectivePfBase = Math.min(pfBase, pfCeiling);
      
      // Employer's 12% is split: 3.67% to EPF, 8.33% to EPS (pension)
      const epfAmount = effectivePfBase * 0.0367;
      const epsAmount = effectivePfBase * 0.0833;
      
      contributions.push({
        type: 'pf_employer',
        description: 'EPF Employer (3.67%)',
        amount: Math.round(epfAmount * 100) / 100,
      });
      
      contributions.push({
        type: 'pf_employer',
        description: 'EPS Employer (8.33%)',
        amount: Math.round(epsAmount * 100) / 100,
      });
    }
    
    // ESI Employer Contribution (3.25% if gross ≤ ₹21,000)
    const esiRule = socialSecurityRules.find(r => r.rule_type === 'esi');
    if (esiRule) {
      const esiThreshold = esiRule.caps?.max_salary_ceiling ?? 21000;
      if (grossEarnings <= esiThreshold) {
        const esiEmployerAmount = grossEarnings * (esiRule.employer_rate_percent / 100);
        
        contributions.push({
          type: 'esi_employer',
          description: `ESI Employer (${esiRule.employer_rate_percent}%)`,
          amount: Math.round(esiEmployerAmount * 100) / 100,
        });
      }
    }
    
    // Gratuity accrual (4.81% of basic for employees with 5+ years)
    const gratuityRule = statutoryRules.find(r => r.rule_type === 'gratuity');
    if (gratuityRule?.config?.gratuity_percent) {
      const gratuityAmount = basicSalary * (gratuityRule.config.gratuity_percent / 100);
      
      contributions.push({
        type: 'gratuity',
        description: `Gratuity Accrual (${gratuityRule.config.gratuity_percent}%)`,
        amount: Math.round(gratuityAmount * 100) / 100,
      });
    }
    
    return contributions;
  }
}
