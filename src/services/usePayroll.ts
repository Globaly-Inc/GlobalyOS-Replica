/**
 * Payroll Service Hooks
 * React Query hooks for payroll management operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import type { Json } from '@/integrations/supabase/types';
import type {
  LegalEntity,
  PayrollProfile,
  SalaryStructure,
  SalaryComponent,
  TaxSlab,
  SocialSecurityRule,
  StatutoryRule,
  PayrollRun,
  PayrollRunItem,
  PayrollEarning,
  PayrollDeduction,
  EmployerContribution,
  Payslip,
  EmployeeBankAccount,
  CreateLegalEntityInput,
  UpdateLegalEntityInput,
  CreatePayrollProfileInput,
  UpdatePayrollProfileInput,
  CreateSalaryStructureInput,
  CreateSalaryComponentInput,
  CreateTaxSlabInput,
  CreateSocialSecurityRuleInput,
  CreateStatutoryRuleInput,
  CreatePayrollRunInput,
  CreateEmployeeBankAccountInput,
  UpdateEmployeeBankAccountInput,
  PayrollRunStatus,
  LegalEntityAddress,
  TaxSlabMetadata,
  SocialSecurityCaps,
  StatutoryRuleConfig,
  PayrollRunSummary,
  CalculationSnapshot,
} from '@/types/payroll';

// ============ Legal Entities ============

export function useLegalEntities() {
  const { currentOrg } = useOrganization();
  
  return useQuery({
    queryKey: ['legal-entities', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from('legal_entities')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('name');
      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        address: row.address as unknown as LegalEntityAddress | null,
      })) as LegalEntity[];
    },
    enabled: !!currentOrg?.id,
  });
}

export function useLegalEntity(id: string | undefined) {
  return useQuery({
    queryKey: ['legal-entity', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('legal_entities')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        address: data.address as unknown as LegalEntityAddress | null,
      } as LegalEntity;
    },
    enabled: !!id,
  });
}

export function useCreateLegalEntity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateLegalEntityInput) => {
      const { data, error } = await supabase
        .from('legal_entities')
        .insert({
          organization_id: input.organization_id,
          name: input.name,
          country: input.country,
          registration_number: input.registration_number,
          tax_id: input.tax_id,
          address: input.address as unknown as Json,
        })
        .select()
        .single();
      if (error) throw error;
      return {
        ...data,
        address: data.address as unknown as LegalEntityAddress | null,
      } as LegalEntity;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['legal-entities', variables.organization_id] });
    },
  });
}

export function useUpdateLegalEntity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateLegalEntityInput & { id: string }) => {
      const updateData: Record<string, unknown> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.country !== undefined) updateData.country = input.country;
      if (input.registration_number !== undefined) updateData.registration_number = input.registration_number;
      if (input.tax_id !== undefined) updateData.tax_id = input.tax_id;
      if (input.address !== undefined) updateData.address = input.address as unknown as Json;
      if (input.is_active !== undefined) updateData.is_active = input.is_active;
      
      const { data, error } = await supabase
        .from('legal_entities')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return {
        ...data,
        address: data.address as unknown as LegalEntityAddress | null,
      } as LegalEntity;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['legal-entities', data.organization_id] });
      queryClient.invalidateQueries({ queryKey: ['legal-entity', data.id] });
    },
  });
}

export function useDeleteLegalEntity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('legal_entities')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-entities'] });
    },
  });
}

// ============ Payroll Profiles ============

export function usePayrollProfiles(legalEntityId?: string) {
  const { currentOrg } = useOrganization();
  
  return useQuery({
    queryKey: ['payroll-profiles', currentOrg?.id, legalEntityId],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      let query = supabase
        .from('payroll_profiles')
        .select('*, legal_entities(*)')
        .eq('organization_id', currentOrg.id)
        .order('name');
      
      if (legalEntityId) {
        query = query.eq('legal_entity_id', legalEntityId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        legal_entity: row.legal_entities ? {
          ...row.legal_entities,
          address: row.legal_entities.address as unknown as LegalEntityAddress | null,
        } : undefined,
      })) as PayrollProfile[];
    },
    enabled: !!currentOrg?.id,
  });
}

export function usePayrollProfile(id: string | undefined) {
  return useQuery({
    queryKey: ['payroll-profile', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('payroll_profiles')
        .select('*, legal_entities(*)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        legal_entity: data.legal_entities ? {
          ...data.legal_entities,
          address: data.legal_entities.address as unknown as LegalEntityAddress | null,
        } : undefined,
      } as PayrollProfile;
    },
    enabled: !!id,
  });
}

export function useCreatePayrollProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreatePayrollProfileInput) => {
      const { data, error } = await supabase
        .from('payroll_profiles')
        .insert({
          legal_entity_id: input.legal_entity_id,
          organization_id: input.organization_id,
          name: input.name,
          country: input.country,
          currency: input.currency,
          pay_frequency: input.pay_frequency,
          standard_hours_per_week: input.standard_hours_per_week ?? 40,
          timezone: input.timezone ?? 'UTC',
          is_default: input.is_default ?? false,
          effective_from: input.effective_from,
          effective_to: input.effective_to,
        })
        .select()
        .single();
      if (error) throw error;
      return data as PayrollProfile;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-profiles', variables.organization_id] });
    },
  });
}

export function useUpdatePayrollProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdatePayrollProfileInput & { id: string }) => {
      const { data, error } = await supabase
        .from('payroll_profiles')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as PayrollProfile;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-profiles', data.organization_id] });
      queryClient.invalidateQueries({ queryKey: ['payroll-profile', data.id] });
    },
  });
}

// ============ Salary Structures ============

export function useSalaryStructures(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['salary-structures', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from('salary_structures')
        .select('*, salary_components(*)')
        .eq('employee_id', employeeId)
        .order('effective_from', { ascending: false });
      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        components: row.salary_components || [],
      })) as SalaryStructure[];
    },
    enabled: !!employeeId,
  });
}

export function useActiveSalaryStructure(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['salary-structure-active', employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('salary_structures')
        .select('*, salary_components(*)')
        .eq('employee_id', employeeId)
        .lte('effective_from', today)
        .or(`effective_to.is.null,effective_to.gte.${today}`)
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        components: data.salary_components || [],
      } as SalaryStructure;
    },
    enabled: !!employeeId,
  });
}

export function useCreateSalaryStructure() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateSalaryStructureInput) => {
      // Create salary structure
      const { data: structure, error: structureError } = await supabase
        .from('salary_structures')
        .insert({
          employee_id: input.employee_id,
          organization_id: input.organization_id,
          effective_from: input.effective_from,
          effective_to: input.effective_to,
          base_salary_amount: input.base_salary_amount,
          salary_period: input.salary_period,
          salary_type: input.salary_type,
        })
        .select()
        .single();
      if (structureError) throw structureError;
      
      // Create components if provided
      if (input.components && input.components.length > 0) {
        const componentsToInsert = input.components.map((comp, index) => ({
          salary_structure_id: structure.id,
          organization_id: input.organization_id,
          component_type: comp.component_type,
          name: comp.name,
          calculation_method: comp.calculation_method,
          value: comp.value,
          is_taxable: comp.is_taxable ?? true,
          is_pf_applicable: comp.is_pf_applicable ?? false,
          is_ssf_applicable: comp.is_ssf_applicable ?? false,
          is_super_applicable: comp.is_super_applicable ?? false,
          sort_order: comp.sort_order ?? index,
        }));
        
        const { error: componentsError } = await supabase
          .from('salary_components')
          .insert(componentsToInsert);
        if (componentsError) throw componentsError;
      }
      
      return structure as SalaryStructure;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['salary-structures', variables.employee_id] });
      queryClient.invalidateQueries({ queryKey: ['salary-structure-active', variables.employee_id] });
    },
  });
}

// ============ Tax Slabs ============

export function useTaxSlabs(country?: string, profileId?: string) {
  const { currentOrg } = useOrganization();
  
  return useQuery({
    queryKey: ['tax-slabs', currentOrg?.id, country, profileId],
    queryFn: async () => {
      let query = supabase
        .from('tax_slabs')
        .select('*')
        .order('slab_min');
      
      if (country) {
        query = query.eq('country', country);
      }
      
      if (profileId) {
        query = query.eq('payroll_profile_id', profileId);
      } else if (currentOrg?.id) {
        query = query.or(`organization_id.eq.${currentOrg.id},organization_id.is.null`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        metadata: row.metadata as unknown as TaxSlabMetadata | null,
      })) as TaxSlab[];
    },
  });
}

export function useCreateTaxSlab() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateTaxSlabInput) => {
      const { data, error } = await supabase
        .from('tax_slabs')
        .insert({
          country: input.country,
          payroll_profile_id: input.payroll_profile_id,
          organization_id: input.organization_id,
          effective_from: input.effective_from,
          effective_to: input.effective_to,
          slab_min: input.slab_min,
          slab_max: input.slab_max,
          rate_percent: input.rate_percent,
          metadata: input.metadata as unknown as Json,
        })
        .select()
        .single();
      if (error) throw error;
      return {
        ...data,
        metadata: data.metadata as unknown as TaxSlabMetadata | null,
      } as TaxSlab;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-slabs'] });
    },
  });
}

export function useDeleteTaxSlab() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tax_slabs')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-slabs'] });
    },
  });
}

// ============ Social Security Rules ============

export function useSocialSecurityRules(country?: string, profileId?: string) {
  const { currentOrg } = useOrganization();
  
  return useQuery({
    queryKey: ['social-security-rules', currentOrg?.id, country, profileId],
    queryFn: async () => {
      let query = supabase
        .from('social_security_rules')
        .select('*')
        .order('rule_type');
      
      if (country) {
        query = query.eq('country', country);
      }
      
      if (profileId) {
        query = query.eq('payroll_profile_id', profileId);
      } else if (currentOrg?.id) {
        query = query.or(`organization_id.eq.${currentOrg.id},organization_id.is.null`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        caps: row.caps as unknown as SocialSecurityCaps | null,
      })) as SocialSecurityRule[];
    },
  });
}

export function useCreateSocialSecurityRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateSocialSecurityRuleInput) => {
      const { data, error } = await supabase
        .from('social_security_rules')
        .insert({
          country: input.country,
          payroll_profile_id: input.payroll_profile_id,
          organization_id: input.organization_id,
          rule_type: input.rule_type,
          effective_from: input.effective_from,
          effective_to: input.effective_to,
          employee_rate_percent: input.employee_rate_percent,
          employer_rate_percent: input.employer_rate_percent,
          base_type: input.base_type,
          caps: input.caps as unknown as Json,
        })
        .select()
        .single();
      if (error) throw error;
      return {
        ...data,
        caps: data.caps as unknown as SocialSecurityCaps | null,
      } as SocialSecurityRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-security-rules'] });
    },
  });
}

// ============ Statutory Rules ============

export function useStatutoryRules(country?: string, profileId?: string) {
  const { currentOrg } = useOrganization();
  
  return useQuery({
    queryKey: ['statutory-rules', currentOrg?.id, country, profileId],
    queryFn: async () => {
      let query = supabase
        .from('statutory_rules')
        .select('*')
        .order('rule_type');
      
      if (country) {
        query = query.eq('country', country);
      }
      
      if (profileId) {
        query = query.eq('payroll_profile_id', profileId);
      } else if (currentOrg?.id) {
        query = query.or(`organization_id.eq.${currentOrg.id},organization_id.is.null`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        config: row.config as unknown as StatutoryRuleConfig,
      })) as StatutoryRule[];
    },
  });
}

export function useCreateStatutoryRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateStatutoryRuleInput) => {
      const { data, error } = await supabase
        .from('statutory_rules')
        .insert({
          country: input.country,
          payroll_profile_id: input.payroll_profile_id,
          organization_id: input.organization_id,
          rule_type: input.rule_type,
          effective_from: input.effective_from,
          effective_to: input.effective_to,
          config: input.config as unknown as Json,
        })
        .select()
        .single();
      if (error) throw error;
      return {
        ...data,
        config: data.config as unknown as StatutoryRuleConfig,
      } as StatutoryRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statutory-rules'] });
    },
  });
}

// ============ Payroll Runs ============

export function usePayrollRuns(profileId?: string, status?: PayrollRunStatus) {
  const { currentOrg } = useOrganization();
  
  return useQuery({
    queryKey: ['payroll-runs', currentOrg?.id, profileId, status],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      let query = supabase
        .from('payroll_runs')
        .select('*, payroll_profiles(*)')
        .eq('organization_id', currentOrg.id)
        .order('period_start', { ascending: false });
      
      if (profileId) {
        query = query.eq('payroll_profile_id', profileId);
      }
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        summary_totals: row.summary_totals as unknown as PayrollRunSummary | null,
        payroll_profile: row.payroll_profiles || undefined,
      })) as PayrollRun[];
    },
    enabled: !!currentOrg?.id,
  });
}

export function usePayrollRun(id: string | undefined) {
  return useQuery({
    queryKey: ['payroll-run', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('payroll_runs')
        .select('*, payroll_profiles(*)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        summary_totals: data.summary_totals as unknown as PayrollRunSummary | null,
        payroll_profile: data.payroll_profiles || undefined,
      } as PayrollRun;
    },
    enabled: !!id,
  });
}

export function useCreatePayrollRun() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreatePayrollRunInput) => {
      const { data, error } = await supabase
        .from('payroll_runs')
        .insert({
          payroll_profile_id: input.payroll_profile_id,
          organization_id: input.organization_id,
          period_start: input.period_start,
          period_end: input.period_end,
          pay_date: input.pay_date,
          status: 'draft',
        })
        .select()
        .single();
      if (error) throw error;
      return {
        ...data,
        summary_totals: data.summary_totals as unknown as PayrollRunSummary | null,
      } as PayrollRun;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs', variables.organization_id] });
    },
  });
}

export function useUpdatePayrollRunStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status, approvedBy }: { id: string; status: PayrollRunStatus; approvedBy?: string }) => {
      const updateData: Record<string, unknown> = { status };
      if (status === 'approved' && approvedBy) {
        updateData.approved_by = approvedBy;
        updateData.approved_at = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('payroll_runs')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return {
        ...data,
        summary_totals: data.summary_totals as unknown as PayrollRunSummary | null,
      } as PayrollRun;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-run', data.id] });
    },
  });
}

// ============ Payroll Run Items ============

export function usePayrollRunItems(runId: string | undefined) {
  return useQuery({
    queryKey: ['payroll-run-items', runId],
    queryFn: async () => {
      if (!runId) return [];
      const { data, error } = await supabase
        .from('payroll_run_items')
        .select(`
          *,
          payroll_earnings(*),
          payroll_deductions(*),
          employer_contributions(*)
        `)
        .eq('payroll_run_id', runId)
        .order('created_at');
      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        calculation_snapshot: row.calculation_snapshot as unknown as CalculationSnapshot | null,
        earnings: row.payroll_earnings || [],
        deductions: row.payroll_deductions || [],
        employer_contributions: row.employer_contributions || [],
      })) as PayrollRunItem[];
    },
    enabled: !!runId,
  });
}

// ============ Payslips ============

export function usePayslips(employeeId?: string) {
  const { currentOrg } = useOrganization();
  
  return useQuery({
    queryKey: ['payslips', currentOrg?.id, employeeId],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      let query = supabase
        .from('payslips')
        .select('*, payroll_run_items(*)')
        .eq('organization_id', currentOrg.id)
        .order('generated_at', { ascending: false });
      
      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        run_item: row.payroll_run_items ? {
          ...row.payroll_run_items,
          calculation_snapshot: row.payroll_run_items.calculation_snapshot as unknown as CalculationSnapshot | null,
        } : undefined,
      })) as Payslip[];
    },
    enabled: !!currentOrg?.id,
  });
}

export function useMyPayslips() {
  const { currentOrg } = useOrganization();
  
  return useQuery({
    queryKey: ['my-payslips', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      
      // Get current user's employee ID
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];
      
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', userData.user.id)
        .eq('organization_id', currentOrg.id)
        .maybeSingle();
      
      if (!employee) return [];
      
      const { data, error } = await supabase
        .from('payslips')
        .select('*, payroll_run_items(*)')
        .eq('employee_id', employee.id)
        .order('generated_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        run_item: row.payroll_run_items ? {
          ...row.payroll_run_items,
          calculation_snapshot: row.payroll_run_items.calculation_snapshot as unknown as CalculationSnapshot | null,
        } : undefined,
      })) as Payslip[];
    },
    enabled: !!currentOrg?.id,
  });
}

export function usePayslip(id: string | undefined) {
  return useQuery({
    queryKey: ['payslip', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('payslips')
        .select(`
          *,
          payroll_run_items(
            *,
            payroll_earnings(*),
            payroll_deductions(*),
            employer_contributions(*)
          )
        `)
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        run_item: data.payroll_run_items ? {
          ...data.payroll_run_items,
          calculation_snapshot: data.payroll_run_items.calculation_snapshot as unknown as CalculationSnapshot | null,
          earnings: data.payroll_run_items.payroll_earnings || [],
          deductions: data.payroll_run_items.payroll_deductions || [],
          employer_contributions: data.payroll_run_items.employer_contributions || [],
        } : undefined,
      } as Payslip;
    },
    enabled: !!id,
  });
}

// ============ Employee Bank Accounts ============

export function useEmployeeBankAccounts(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['employee-bank-accounts', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from('employee_bank_accounts')
        .select('*')
        .eq('employee_id', employeeId)
        .order('is_primary', { ascending: false });
      if (error) throw error;
      return data as EmployeeBankAccount[];
    },
    enabled: !!employeeId,
  });
}

export function useCreateEmployeeBankAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateEmployeeBankAccountInput) => {
      const { data, error } = await supabase
        .from('employee_bank_accounts')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as EmployeeBankAccount;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-bank-accounts', variables.employee_id] });
    },
  });
}

export function useUpdateEmployeeBankAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, employeeId, ...input }: UpdateEmployeeBankAccountInput & { id: string; employeeId: string }) => {
      const { data, error } = await supabase
        .from('employee_bank_accounts')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, employeeId } as EmployeeBankAccount & { employeeId: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employee-bank-accounts', data.employeeId] });
    },
  });
}

export function useDeleteEmployeeBankAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, employeeId }: { id: string; employeeId: string }) => {
      const { error } = await supabase
        .from('employee_bank_accounts')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { employeeId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employee-bank-accounts', data.employeeId] });
    },
  });
}
