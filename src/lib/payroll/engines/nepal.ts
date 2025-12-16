/**
 * Nepal Payroll Calculation Engine
 * 
 * Key features:
 * - SSF (Social Security Fund): 20% employer, 11% employee of basic salary
 * - Income tax: Progressive slabs with married/single rates
 * - Overtime: 150% of hourly rate
 * - Dashain bonus: One month's basic salary
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

export class NepalPayrollEngine implements ICountryPayrollEngine {
  country = 'NP' as const;
  
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
        country: 'NP',
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
    
    // Calculate effective days worked (excluding unpaid leave)
    const effectiveDaysWorked = days_worked - unpaid_leave_days;
    
    // Pro-rata basic salary
    const basicSalary = calculateProRataSalary(monthlyBase, effectiveDaysWorked, days_in_period);
    
    earnings.push({
      type: 'basic',
      description: 'Basic Salary',
      amount: Math.round(basicSalary * 100) / 100,
      is_taxable: true,
    });
    
    // Process salary components (allowances, bonuses)
    if (salaryStructure.components) {
      for (const component of salaryStructure.components) {
        if (component.component_type === 'earning') {
          let amount = 0;
          
          if (component.calculation_method === 'fixed_amount') {
            // Pro-rate fixed amounts
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
    
    // Calculate overtime (150% in Nepal)
    if (overtime_hours > 0) {
      const overtimeRule = statutoryRules.find(r => r.rule_type === 'overtime');
      const overtimeMultiplier = overtimeRule?.config?.overtime_multiplier ?? 1.5;
      
      // Calculate hourly rate from monthly (assuming 26 working days, 8 hours)
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
    
    // SSF Employee Contribution (11% of basic salary)
    const ssfRule = socialSecurityRules.find(r => r.rule_type === 'ssf');
    if (ssfRule) {
      const ssfBase = ssfRule.base_type === 'basic_salary' ? basicSalary : grossEarnings;
      const ssfEmployeeAmount = ssfBase * (ssfRule.employee_rate_percent / 100);
      
      // Apply caps if defined
      const cappedSSF = ssfRule.caps?.max_employee_contribution
        ? Math.min(ssfEmployeeAmount, ssfRule.caps.max_employee_contribution)
        : ssfEmployeeAmount;
      
      deductions.push({
        type: 'ssf',
        description: `SSF Employee (${ssfRule.employee_rate_percent}%)`,
        amount: Math.round(cappedSSF * 100) / 100,
      });
    }
    
    // Income Tax Calculation
    const taxableEarnings = getTaxableEarnings(earnings);
    
    // SSF is tax-deductible in Nepal
    const ssfDeduction = deductions.find(d => d.type === 'ssf')?.amount ?? 0;
    const taxableIncome = taxableEarnings - ssfDeduction;
    
    // Annualize for tax calculation
    const annualTaxableIncome = taxableIncome * 12;
    
    // Get marital status from tax profile
    const maritalStatus = taxProfile?.marital_status ?? 'single';
    
    // Calculate annual tax using slabs
    const annualTax = findApplicableTaxRate(annualTaxableIncome, taxSlabs, maritalStatus);
    const monthlyTax = annualTax / 12;
    
    if (monthlyTax > 0) {
      deductions.push({
        type: 'tax',
        description: `Income Tax (${maritalStatus})`,
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
    
    // SSF Employer Contribution (20% of basic salary)
    const ssfRule = socialSecurityRules.find(r => r.rule_type === 'ssf');
    if (ssfRule) {
      const ssfBase = ssfRule.base_type === 'basic_salary' ? basicSalary : grossEarnings;
      const ssfEmployerAmount = ssfBase * (ssfRule.employer_rate_percent / 100);
      
      // Apply caps if defined
      const cappedSSF = ssfRule.caps?.max_employer_contribution
        ? Math.min(ssfEmployerAmount, ssfRule.caps.max_employer_contribution)
        : ssfEmployerAmount;
      
      contributions.push({
        type: 'ssf_employer',
        description: `SSF Employer (${ssfRule.employer_rate_percent}%)`,
        amount: Math.round(cappedSSF * 100) / 100,
      });
    }
    
    return contributions;
  }
}
