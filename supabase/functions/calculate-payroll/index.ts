/**
 * Calculate Payroll Edge Function
 * Processes payroll calculations for a given payroll run
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PayrollCalculationRequest {
  payroll_run_id: string;
  employee_ids?: string[]; // Optional: calculate for specific employees only
}

// Inline calculation helpers
function calculateProRataSalary(monthlySalary: number, daysWorked: number, totalDays: number): number {
  if (totalDays === 0) return 0;
  return (monthlySalary / totalDays) * daysWorked;
}

function findApplicableTaxRate(
  annualIncome: number,
  taxSlabs: any[],
  maritalStatus?: string
): number {
  const applicableSlabs = taxSlabs.filter(slab => {
    if (!maritalStatus || !slab.metadata?.marital_status) return true;
    return slab.metadata.marital_status === maritalStatus;
  });
  
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

// Nepal calculation
function calculateNepal(params: any): any {
  const { employee, salaryStructure, attendanceSummary, leaveSummary, taxSlabs, socialSecurityRules, statutoryRules, currency } = params;
  
  const earnings: any[] = [];
  const deductions: any[] = [];
  const employerContributions: any[] = [];
  
  let monthlyBase = salaryStructure.base_salary_amount;
  if (salaryStructure.salary_period === 'annual') {
    monthlyBase = salaryStructure.base_salary_amount / 12;
  }
  
  const effectiveDaysWorked = attendanceSummary.days_worked - leaveSummary.unpaid_leave_days;
  const basicSalary = calculateProRataSalary(monthlyBase, effectiveDaysWorked, attendanceSummary.days_in_period);
  
  earnings.push({
    type: 'basic',
    description: 'Basic Salary',
    amount: Math.round(basicSalary * 100) / 100,
    is_taxable: true,
  });
  
  // Process components
  if (salaryStructure.salary_components) {
    for (const comp of salaryStructure.salary_components) {
      if (comp.component_type === 'earning') {
        let amount = 0;
        if (comp.calculation_method === 'fixed_amount') {
          amount = calculateProRataSalary(comp.value, effectiveDaysWorked, attendanceSummary.days_in_period);
        } else if (comp.calculation_method === 'percentage_of_base') {
          amount = basicSalary * (comp.value / 100);
        }
        if (amount > 0) {
          earnings.push({
            type: 'allowance',
            description: comp.name,
            amount: Math.round(amount * 100) / 100,
            is_taxable: comp.is_taxable,
          });
        }
      }
    }
  }
  
  // Overtime
  if (attendanceSummary.overtime_hours > 0) {
    const overtimeRule = statutoryRules.find((r: any) => r.rule_type === 'overtime');
    const multiplier = overtimeRule?.config?.overtime_multiplier ?? 1.5;
    const hourlyRate = monthlyBase / (26 * 8);
    const overtimeAmount = attendanceSummary.overtime_hours * hourlyRate * multiplier;
    earnings.push({
      type: 'overtime',
      description: `Overtime (${attendanceSummary.overtime_hours} hrs @ ${multiplier}x)`,
      amount: Math.round(overtimeAmount * 100) / 100,
      is_taxable: true,
    });
  }
  
  const grossEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);
  
  // SSF
  const ssfRule = socialSecurityRules.find((r: any) => r.rule_type === 'ssf');
  if (ssfRule) {
    const ssfBase = ssfRule.base_type === 'basic_salary' ? basicSalary : grossEarnings;
    const ssfEmployee = ssfBase * (ssfRule.employee_rate_percent / 100);
    const ssfEmployer = ssfBase * (ssfRule.employer_rate_percent / 100);
    
    deductions.push({
      type: 'ssf',
      description: `SSF Employee (${ssfRule.employee_rate_percent}%)`,
      amount: Math.round(ssfEmployee * 100) / 100,
    });
    
    employerContributions.push({
      type: 'ssf_employer',
      description: `SSF Employer (${ssfRule.employer_rate_percent}%)`,
      amount: Math.round(ssfEmployer * 100) / 100,
    });
  }
  
  // Tax
  const taxableEarnings = earnings.filter(e => e.is_taxable).reduce((sum, e) => sum + e.amount, 0);
  const ssfDeduction = deductions.find(d => d.type === 'ssf')?.amount ?? 0;
  const annualTaxable = (taxableEarnings - ssfDeduction) * 12;
  const maritalStatus = employee.tax_profile?.marital_status ?? 'single';
  const annualTax = findApplicableTaxRate(annualTaxable, taxSlabs, maritalStatus);
  const monthlyTax = annualTax / 12;
  
  if (monthlyTax > 0) {
    deductions.push({
      type: 'tax',
      description: `Income Tax (${maritalStatus})`,
      amount: Math.round(monthlyTax * 100) / 100,
    });
  }
  
  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const employerContributionsTotal = employerContributions.reduce((sum, c) => sum + c.amount, 0);
  
  return {
    earnings,
    deductions,
    employer_contributions: employerContributions,
    gross_earnings: Math.round(grossEarnings * 100) / 100,
    total_deductions: Math.round(totalDeductions * 100) / 100,
    employer_contributions_total: Math.round(employerContributionsTotal * 100) / 100,
    net_pay: Math.round((grossEarnings - totalDeductions) * 100) / 100,
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

// India calculation
function calculateIndia(params: any): any {
  const { employee, salaryStructure, attendanceSummary, leaveSummary, taxSlabs, socialSecurityRules, statutoryRules, currency } = params;
  
  const earnings: any[] = [];
  const deductions: any[] = [];
  const employerContributions: any[] = [];
  
  let monthlyBase = salaryStructure.base_salary_amount;
  if (salaryStructure.salary_period === 'annual') {
    monthlyBase = salaryStructure.base_salary_amount / 12;
  }
  
  const effectiveDaysWorked = attendanceSummary.days_worked - leaveSummary.unpaid_leave_days;
  const basicSalary = calculateProRataSalary(monthlyBase, effectiveDaysWorked, attendanceSummary.days_in_period);
  
  earnings.push({
    type: 'basic',
    description: 'Basic Salary',
    amount: Math.round(basicSalary * 100) / 100,
    is_taxable: true,
  });
  
  // Components
  let daAmount = 0;
  if (salaryStructure.salary_components) {
    for (const comp of salaryStructure.salary_components) {
      if (comp.component_type === 'earning') {
        let amount = 0;
        if (comp.calculation_method === 'fixed_amount') {
          amount = calculateProRataSalary(comp.value, effectiveDaysWorked, attendanceSummary.days_in_period);
        } else if (comp.calculation_method === 'percentage_of_base') {
          amount = basicSalary * (comp.value / 100);
        }
        if (amount > 0) {
          if (comp.name.toLowerCase().includes('dearness') || comp.name.toLowerCase().includes('da')) {
            daAmount = amount;
          }
          earnings.push({
            type: 'allowance',
            description: comp.name,
            amount: Math.round(amount * 100) / 100,
            is_taxable: comp.is_taxable,
          });
        }
      }
    }
  }
  
  // Overtime
  if (attendanceSummary.overtime_hours > 0) {
    const overtimeRule = statutoryRules.find((r: any) => r.rule_type === 'overtime');
    const multiplier = overtimeRule?.config?.overtime_multiplier ?? 2.0;
    const hourlyRate = monthlyBase / (26 * 8);
    earnings.push({
      type: 'overtime',
      description: `Overtime (${attendanceSummary.overtime_hours} hrs @ ${multiplier}x)`,
      amount: Math.round(attendanceSummary.overtime_hours * hourlyRate * multiplier * 100) / 100,
      is_taxable: true,
    });
  }
  
  const grossEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);
  const pfBase = basicSalary + daAmount;
  
  // PF
  const pfRule = socialSecurityRules.find((r: any) => r.rule_type === 'pf');
  if (pfRule) {
    const pfCeiling = pfRule.caps?.max_salary_ceiling ?? 15000;
    const effectivePfBase = Math.min(pfBase, pfCeiling);
    const pfEmployee = effectivePfBase * (pfRule.employee_rate_percent / 100);
    
    deductions.push({
      type: 'pf',
      description: `PF Employee (${pfRule.employee_rate_percent}%)`,
      amount: Math.round(pfEmployee * 100) / 100,
    });
    
    // Employer split: 3.67% EPF + 8.33% EPS
    employerContributions.push({
      type: 'pf_employer',
      description: 'EPF Employer (3.67%)',
      amount: Math.round(effectivePfBase * 0.0367 * 100) / 100,
    });
    employerContributions.push({
      type: 'pf_employer',
      description: 'EPS Employer (8.33%)',
      amount: Math.round(effectivePfBase * 0.0833 * 100) / 100,
    });
  }
  
  // ESI
  const esiRule = socialSecurityRules.find((r: any) => r.rule_type === 'esi');
  if (esiRule && grossEarnings <= (esiRule.caps?.max_salary_ceiling ?? 21000)) {
    deductions.push({
      type: 'esi',
      description: `ESI Employee (${esiRule.employee_rate_percent}%)`,
      amount: Math.round(grossEarnings * (esiRule.employee_rate_percent / 100) * 100) / 100,
    });
    employerContributions.push({
      type: 'esi_employer',
      description: `ESI Employer (${esiRule.employer_rate_percent}%)`,
      amount: Math.round(grossEarnings * (esiRule.employer_rate_percent / 100) * 100) / 100,
    });
  }
  
  // PT
  const ptRule = statutoryRules.find((r: any) => r.rule_type === 'pt');
  if (ptRule?.config?.pt_slabs) {
    const slab = ptRule.config.pt_slabs.find((s: any) => grossEarnings >= s.min && (s.max === null || grossEarnings <= s.max));
    if (slab) {
      deductions.push({ type: 'pt', description: 'Professional Tax', amount: slab.amount });
    }
  }
  
  // TDS
  const taxableEarnings = earnings.filter(e => e.is_taxable).reduce((sum, e) => sum + e.amount, 0);
  const pfDeduction = deductions.find(d => d.type === 'pf')?.amount ?? 0;
  const annualTaxable = Math.max(0, (taxableEarnings - (50000/12) - pfDeduction) * 12);
  const taxRegime = employee.tax_profile?.tax_regime ?? 'new';
  const applicableSlabs = taxSlabs.filter((s: any) => !s.metadata?.regime || s.metadata.regime === taxRegime);
  const annualTax = findApplicableTaxRate(annualTaxable, applicableSlabs) * 1.04; // 4% cess
  
  if (annualTax > 0) {
    deductions.push({
      type: 'tax',
      description: `TDS (${taxRegime} regime)`,
      amount: Math.round((annualTax / 12) * 100) / 100,
    });
  }
  
  // Gratuity
  const gratuityRule = statutoryRules.find((r: any) => r.rule_type === 'gratuity');
  if (gratuityRule?.config?.gratuity_percent) {
    employerContributions.push({
      type: 'gratuity',
      description: `Gratuity Accrual (${gratuityRule.config.gratuity_percent}%)`,
      amount: Math.round(basicSalary * (gratuityRule.config.gratuity_percent / 100) * 100) / 100,
    });
  }
  
  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const employerContributionsTotal = employerContributions.reduce((sum, c) => sum + c.amount, 0);
  
  return {
    earnings,
    deductions,
    employer_contributions: employerContributions,
    gross_earnings: Math.round(grossEarnings * 100) / 100,
    total_deductions: Math.round(totalDeductions * 100) / 100,
    employer_contributions_total: Math.round(employerContributionsTotal * 100) / 100,
    net_pay: Math.round((grossEarnings - totalDeductions) * 100) / 100,
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

// Australia calculation
function calculateAustralia(params: any): any {
  const { employee, salaryStructure, attendanceSummary, leaveSummary, taxSlabs, socialSecurityRules, statutoryRules, currency } = params;
  
  const earnings: any[] = [];
  const deductions: any[] = [];
  const employerContributions: any[] = [];
  
  let monthlyBase = salaryStructure.base_salary_amount;
  if (salaryStructure.salary_period === 'annual') {
    monthlyBase = salaryStructure.base_salary_amount / 12;
  }
  
  const effectiveDaysWorked = attendanceSummary.days_worked - leaveSummary.unpaid_leave_days;
  const baseSalary = calculateProRataSalary(monthlyBase, effectiveDaysWorked, attendanceSummary.days_in_period);
  
  earnings.push({
    type: 'basic',
    description: 'Base Salary',
    amount: Math.round(baseSalary * 100) / 100,
    is_taxable: true,
  });
  
  // Components
  if (salaryStructure.salary_components) {
    for (const comp of salaryStructure.salary_components) {
      if (comp.component_type === 'earning') {
        let amount = 0;
        if (comp.calculation_method === 'fixed_amount') {
          amount = calculateProRataSalary(comp.value, effectiveDaysWorked, attendanceSummary.days_in_period);
        } else if (comp.calculation_method === 'percentage_of_base') {
          amount = baseSalary * (comp.value / 100);
        }
        if (amount > 0) {
          earnings.push({
            type: 'allowance',
            description: comp.name,
            amount: Math.round(amount * 100) / 100,
            is_taxable: comp.is_taxable,
          });
        }
      }
    }
  }
  
  // Overtime
  if (attendanceSummary.overtime_hours > 0) {
    const overtimeRule = statutoryRules.find((r: any) => r.rule_type === 'overtime');
    const multiplier = overtimeRule?.config?.overtime_multiplier ?? 1.5;
    const hourlyRate = (monthlyBase * 12) / (52 * 38);
    earnings.push({
      type: 'overtime',
      description: `Overtime (${attendanceSummary.overtime_hours} hrs @ ${multiplier}x)`,
      amount: Math.round(attendanceSummary.overtime_hours * hourlyRate * multiplier * 100) / 100,
      is_taxable: true,
    });
  }
  
  const grossEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);
  const taxableEarnings = earnings.filter(e => e.is_taxable).reduce((sum, e) => sum + e.amount, 0);
  const annualTaxable = taxableEarnings * 12;
  
  // PAYG + Medicare
  let annualTax = findApplicableTaxRate(annualTaxable, taxSlabs);
  if (annualTaxable > 24276) {
    annualTax += annualTaxable * 0.02; // Medicare levy
  }
  
  if (annualTax > 0) {
    deductions.push({
      type: 'tax',
      description: 'PAYG Withholding',
      amount: Math.round((annualTax / 12) * 100) / 100,
    });
  }
  
  // HECS
  if (employee.tax_profile?.hecs_help_debt) {
    const hecsRates = [
      { min: 51550, max: 59518, rate: 0.01 },
      { min: 59518, max: 151200, rate: 0.05 },
      { min: 151200, max: Infinity, rate: 0.10 },
    ];
    const rate = hecsRates.find(r => annualTaxable >= r.min && annualTaxable < r.max);
    if (rate) {
      deductions.push({
        type: 'other',
        description: 'HELP/HECS Repayment',
        amount: Math.round((annualTaxable * rate.rate / 12) * 100) / 100,
      });
    }
  }
  
  // Superannuation
  const sgRule = socialSecurityRules.find((r: any) => r.rule_type === 'sg');
  if (sgRule) {
    const overtimeAmount = earnings.filter(e => e.type === 'overtime').reduce((sum, e) => sum + e.amount, 0);
    const ote = grossEarnings - overtimeAmount;
    const monthlyMaxBase = sgRule.caps?.max_salary_ceiling ?? (62500 / 3);
    const cappedOte = Math.min(ote, monthlyMaxBase);
    
    employerContributions.push({
      type: 'sg',
      description: `Superannuation Guarantee (${sgRule.employer_rate_percent}%)`,
      amount: Math.round(cappedOte * (sgRule.employer_rate_percent / 100) * 100) / 100,
    });
  }
  
  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const employerContributionsTotal = employerContributions.reduce((sum, c) => sum + c.amount, 0);
  
  return {
    earnings,
    deductions,
    employer_contributions: employerContributions,
    gross_earnings: Math.round(grossEarnings * 100) / 100,
    total_deductions: Math.round(totalDeductions * 100) / 100,
    employer_contributions_total: Math.round(employerContributionsTotal * 100) / 100,
    net_pay: Math.round((grossEarnings - totalDeductions) * 100) / 100,
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

function calculateForCountry(country: string, params: any): any {
  switch (country) {
    case 'NP': return calculateNepal(params);
    case 'IN': return calculateIndia(params);
    case 'AU': return calculateAustralia(params);
    default: throw new Error(`Unsupported country: ${country}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { payroll_run_id, employee_ids }: PayrollCalculationRequest = await req.json();
    
    console.log(`[calculate-payroll] Starting calculation for run: ${payroll_run_id}`);

    // Get payroll run with profile
    const { data: run, error: runError } = await supabase
      .from('payroll_runs')
      .select('*, payroll_profiles(*)')
      .eq('id', payroll_run_id)
      .single();

    if (runError || !run) {
      console.error('[calculate-payroll] Run not found:', runError);
      return new Response(JSON.stringify({ error: 'Payroll run not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const profile = run.payroll_profiles;
    const country = profile.country;
    const currency = profile.currency;
    const orgId = run.organization_id;

    console.log(`[calculate-payroll] Processing for country: ${country}, org: ${orgId}`);

    // Get employees for this payroll profile
    let employeesQuery = supabase
      .from('employees')
      .select('*, salary_structures(*, salary_components(*))')
      .eq('organization_id', orgId)
      .eq('payroll_profile_id', profile.id)
      .eq('status', 'active');

    if (employee_ids && employee_ids.length > 0) {
      employeesQuery = employeesQuery.in('id', employee_ids);
    }

    const { data: employees, error: empError } = await employeesQuery;

    if (empError) {
      console.error('[calculate-payroll] Error fetching employees:', empError);
      throw empError;
    }

    console.log(`[calculate-payroll] Found ${employees?.length || 0} employees`);

    // Get tax slabs for this country/profile
    const { data: taxSlabs } = await supabase
      .from('tax_slabs')
      .select('*')
      .eq('country', country)
      .or(`payroll_profile_id.eq.${profile.id},payroll_profile_id.is.null`)
      .lte('effective_from', run.period_end)
      .or(`effective_to.is.null,effective_to.gte.${run.period_start}`);

    // Get social security rules
    const { data: socialSecurityRules } = await supabase
      .from('social_security_rules')
      .select('*')
      .eq('country', country)
      .or(`payroll_profile_id.eq.${profile.id},payroll_profile_id.is.null`)
      .lte('effective_from', run.period_end)
      .or(`effective_to.is.null,effective_to.gte.${run.period_start}`);

    // Get statutory rules
    const { data: statutoryRules } = await supabase
      .from('statutory_rules')
      .select('*')
      .eq('country', country)
      .or(`payroll_profile_id.eq.${profile.id},payroll_profile_id.is.null`)
      .lte('effective_from', run.period_end)
      .or(`effective_to.is.null,effective_to.gte.${run.period_start}`);

    const results: any[] = [];
    let totalGross = 0;
    let totalDeductions = 0;
    let totalEmployerContrib = 0;
    let totalNet = 0;

    for (const employee of employees || []) {
      console.log(`[calculate-payroll] Processing employee: ${employee.id}`);

      // Get active salary structure
      const salaryStructure = employee.salary_structures?.find((s: any) => {
        const today = run.period_end;
        return s.effective_from <= today && (!s.effective_to || s.effective_to >= run.period_start);
      });

      if (!salaryStructure) {
        console.warn(`[calculate-payroll] No salary structure for employee: ${employee.id}`);
        continue;
      }

      // Get attendance summary for period
      const { data: attendance } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', employee.id)
        .gte('date', run.period_start)
        .lte('date', run.period_end);

      const daysWorked = attendance?.filter(a => a.status === 'present').length || 0;
      const overtimeHours = attendance?.reduce((sum, a) => {
        const workHours = a.work_hours || 0;
        return sum + Math.max(0, workHours - 8);
      }, 0) || 0;

      // Get leave summary
      const { data: leaves } = await supabase
        .from('leave_requests')
        .select('*, leave_types(*)')
        .eq('employee_id', employee.id)
        .eq('status', 'approved')
        .gte('start_date', run.period_start)
        .lte('end_date', run.period_end);

      const unpaidLeaveDays = leaves?.filter(l => !l.leave_types?.is_paid).reduce((sum, l) => sum + (l.days || 0), 0) || 0;
      const paidLeaveDays = leaves?.filter(l => l.leave_types?.is_paid).reduce((sum, l) => sum + (l.days || 0), 0) || 0;

      // Calculate days in period
      const periodStart = new Date(run.period_start);
      const periodEnd = new Date(run.period_end);
      let daysInPeriod = 0;
      for (let d = new Date(periodStart); d <= periodEnd; d.setDate(d.getDate() + 1)) {
        const day = d.getDay();
        if (day !== 0 && day !== 6) daysInPeriod++;
      }

      const attendanceSummary = {
        days_worked: daysWorked + paidLeaveDays,
        days_in_period: daysInPeriod,
        overtime_hours: overtimeHours,
        late_arrivals: 0,
        early_departures: 0,
      };

      const leaveSummary = {
        paid_leave_days: paidLeaveDays,
        unpaid_leave_days: unpaidLeaveDays,
        leave_by_type: {},
      };

      // Calculate payroll
      const calcResult = calculateForCountry(country, {
        employee: {
          id: employee.id,
          join_date: employee.join_date,
          tax_profile: employee.tax_profile,
          department: employee.department,
          position: employee.position,
        },
        salaryStructure,
        attendanceSummary,
        leaveSummary,
        taxSlabs: taxSlabs || [],
        socialSecurityRules: socialSecurityRules || [],
        statutoryRules: statutoryRules || [],
        currency,
      });

      // Delete existing run items for this employee
      await supabase
        .from('payroll_run_items')
        .delete()
        .eq('payroll_run_id', payroll_run_id)
        .eq('employee_id', employee.id);

      // Insert run item
      const { data: runItem, error: itemError } = await supabase
        .from('payroll_run_items')
        .insert({
          payroll_run_id,
          employee_id: employee.id,
          organization_id: orgId,
          gross_earnings: calcResult.gross_earnings,
          total_deductions: calcResult.total_deductions,
          employer_contributions_total: calcResult.employer_contributions_total,
          net_pay: calcResult.net_pay,
          currency,
          calculation_snapshot: calcResult.metadata,
        })
        .select()
        .single();

      if (itemError) {
        console.error(`[calculate-payroll] Error inserting run item:`, itemError);
        continue;
      }

      // Insert earnings
      for (const earning of calcResult.earnings) {
        await supabase.from('payroll_earnings').insert({
          run_item_id: runItem.id,
          organization_id: orgId,
          earning_type: earning.type,
          description: earning.description,
          amount: earning.amount,
        });
      }

      // Insert deductions
      for (const deduction of calcResult.deductions) {
        await supabase.from('payroll_deductions').insert({
          run_item_id: runItem.id,
          organization_id: orgId,
          deduction_type: deduction.type,
          description: deduction.description,
          amount: deduction.amount,
        });
      }

      // Insert employer contributions
      for (const contrib of calcResult.employer_contributions) {
        await supabase.from('employer_contributions').insert({
          run_item_id: runItem.id,
          organization_id: orgId,
          contribution_type: contrib.type,
          description: contrib.description,
          amount: contrib.amount,
        });
      }

      totalGross += calcResult.gross_earnings;
      totalDeductions += calcResult.total_deductions;
      totalEmployerContrib += calcResult.employer_contributions_total;
      totalNet += calcResult.net_pay;

      results.push({
        employee_id: employee.id,
        ...calcResult,
      });
    }

    // Update run status and summary
    const { error: updateError } = await supabase
      .from('payroll_runs')
      .update({
        status: 'calculated',
        summary_totals: {
          total_employees: results.length,
          total_gross_earnings: Math.round(totalGross * 100) / 100,
          total_deductions: Math.round(totalDeductions * 100) / 100,
          total_employer_contributions: Math.round(totalEmployerContrib * 100) / 100,
          total_net_pay: Math.round(totalNet * 100) / 100,
          currency,
        },
      })
      .eq('id', payroll_run_id);

    if (updateError) {
      console.error('[calculate-payroll] Error updating run:', updateError);
    }

    console.log(`[calculate-payroll] Completed. Processed ${results.length} employees`);

    return new Response(JSON.stringify({
      success: true,
      processed_count: results.length,
      summary: {
        total_gross_earnings: Math.round(totalGross * 100) / 100,
        total_deductions: Math.round(totalDeductions * 100) / 100,
        total_employer_contributions: Math.round(totalEmployerContrib * 100) / 100,
        total_net_pay: Math.round(totalNet * 100) / 100,
      },
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[calculate-payroll] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
