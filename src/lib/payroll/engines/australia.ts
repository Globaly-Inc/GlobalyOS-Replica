/**
 * Australia Payroll Calculation Engine
 * 
 * Key features:
 * - PAYG Withholding: Tax withheld from wages based on ATO tables
 * - Superannuation Guarantee (SG): 11.5% employer contribution on OTE (Ordinary Time Earnings)
 * - Medicare Levy: 2% on taxable income
 * - HELP/HECS debt repayment: Additional deduction if employee has student loan
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
  getTaxableEarnings,
} from './types';

export class AustraliaPayrollEngine implements ICountryPayrollEngine {
  country = 'AU' as const;
  
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
        country: 'AU',
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
    
    // Pro-rata base salary
    const baseSalary = calculateProRataSalary(monthlyBase, effectiveDaysWorked, days_in_period);
    
    earnings.push({
      type: 'basic',
      description: 'Base Salary',
      amount: Math.round(baseSalary * 100) / 100,
      is_taxable: true,
    });
    
    // Process salary components (allowances)
    if (salaryStructure.components) {
      for (const component of salaryStructure.components) {
        if (component.component_type === 'earning') {
          let amount = 0;
          
          if (component.calculation_method === 'fixed_amount') {
            amount = calculateProRataSalary(component.value, effectiveDaysWorked, days_in_period);
          } else if (component.calculation_method === 'percentage_of_base') {
            amount = baseSalary * (component.value / 100);
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
    
    // Calculate overtime (Australia typically 1.5x first 2 hours, 2x thereafter)
    if (overtime_hours > 0) {
      const overtimeRule = statutoryRules.find(r => r.rule_type === 'overtime');
      const overtimeMultiplier = overtimeRule?.config?.overtime_multiplier ?? 1.5;
      
      // Hourly rate (assuming 38 hour work week in Australia)
      const weeklyHours = 38;
      const hourlyRate = (monthlyBase * 12) / (52 * weeklyHours);
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
    const taxableEarnings = getTaxableEarnings(earnings);
    
    // Annualize for tax calculation
    const annualTaxableIncome = taxableEarnings * 12;
    
    // PAYG Withholding Tax
    // Check if employee has claimed tax-free threshold
    const hasTaxFreeThreshold = taxProfile?.tax_free_threshold ?? true;
    
    // Filter slabs (tax-free threshold affects calculation)
    const applicableSlabs = hasTaxFreeThreshold 
      ? taxSlabs 
      : taxSlabs.map(slab => ({ ...slab, slab_min: 0 }));
    
    // Calculate annual tax
    let annualTax = findApplicableTaxRate(annualTaxableIncome, applicableSlabs);
    
    // Add Medicare Levy (2%)
    const medicareLevyThreshold = 24276; // 2024 threshold
    if (annualTaxableIncome > medicareLevyThreshold) {
      const medicareLevy = annualTaxableIncome * 0.02;
      annualTax += medicareLevy;
    }
    
    const monthlyTax = annualTax / 12;
    
    if (monthlyTax > 0) {
      deductions.push({
        type: 'tax',
        description: 'PAYG Withholding',
        amount: Math.round(monthlyTax * 100) / 100,
      });
    }
    
    // HELP/HECS Debt Repayment
    if (taxProfile?.hecs_help_debt) {
      // HECS repayment rates based on income (2024 rates)
      const hecsRates = [
        { min: 51550, max: 59518, rate: 0.01 },
        { min: 59518, max: 63089, rate: 0.02 },
        { min: 63089, max: 66875, rate: 0.025 },
        { min: 66875, max: 70888, rate: 0.03 },
        { min: 70888, max: 75140, rate: 0.035 },
        { min: 75140, max: 79649, rate: 0.04 },
        { min: 79649, max: 84429, rate: 0.045 },
        { min: 84429, max: 89494, rate: 0.05 },
        { min: 89494, max: 94865, rate: 0.055 },
        { min: 94865, max: 100557, rate: 0.06 },
        { min: 100557, max: 106590, rate: 0.065 },
        { min: 106590, max: 112985, rate: 0.07 },
        { min: 112985, max: 119764, rate: 0.075 },
        { min: 119764, max: 126950, rate: 0.08 },
        { min: 126950, max: 134568, rate: 0.085 },
        { min: 134568, max: 142642, rate: 0.09 },
        { min: 142642, max: 151200, rate: 0.095 },
        { min: 151200, max: Infinity, rate: 0.10 },
      ];
      
      const applicableRate = hecsRates.find(
        r => annualTaxableIncome >= r.min && annualTaxableIncome < r.max
      );
      
      if (applicableRate) {
        const annualHecs = annualTaxableIncome * applicableRate.rate;
        const monthlyHecs = annualHecs / 12;
        
        deductions.push({
          type: 'other',
          description: 'HELP/HECS Repayment',
          amount: Math.round(monthlyHecs * 100) / 100,
        });
      }
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
    
    // Superannuation Guarantee (SG) - 11.5% of OTE (Ordinary Time Earnings)
    // OTE excludes overtime, but includes base salary and most allowances
    const sgRule = socialSecurityRules.find(r => r.rule_type === 'sg');
    
    if (sgRule) {
      // Calculate OTE (exclude overtime from gross)
      const overtimeEarnings = earnings
        .filter(e => e.type === 'overtime')
        .reduce((sum, e) => sum + e.amount, 0);
      
      const ote = grossEarnings - overtimeEarnings;
      
      // SG rate (currently 11.5%, increasing to 12% in 2025)
      const sgRate = sgRule.employer_rate_percent;
      const sgAmount = ote * (sgRate / 100);
      
      // Quarterly max super contribution base ($62,500 per quarter in 2024)
      // Monthly approximation
      const monthlyMaxBase = sgRule.caps?.max_salary_ceiling ?? (62500 / 3);
      const cappedOte = Math.min(ote, monthlyMaxBase);
      const cappedSgAmount = cappedOte * (sgRate / 100);
      
      contributions.push({
        type: 'sg',
        description: `Superannuation Guarantee (${sgRate}%)`,
        amount: Math.round(cappedSgAmount * 100) / 100,
      });
    }
    
    return contributions;
  }
}
