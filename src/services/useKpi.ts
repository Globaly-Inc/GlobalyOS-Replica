/**
 * KPI and performance domain service hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from './useCurrentEmployee';
import { toast } from 'sonner';
import type { Kpi, KpiWithEmployee, KpiTemplate, KpiAiInsight, GroupKpiWithScope, KpiScopeType } from '@/types';

// Fetch KPIs for an employee (individual KPIs only)
export const useEmployeeKpis = (employeeId: string | undefined, quarter?: number, year?: number) => {
  const currentQuarter = quarter || Math.ceil((new Date().getMonth() + 1) / 3);
  const currentYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ['employee-kpis', employeeId, currentQuarter, currentYear],
    queryFn: async (): Promise<Kpi[]> => {
      if (!employeeId) return [];

      const { data, error } = await supabase
        .from('kpis')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('quarter', currentQuarter)
        .eq('year', currentYear)
        .order('created_at');

      if (error) throw error;
      
      // Filter individual KPIs in JS since scope_type may not be in generated types yet
      const filtered = (data || []).filter((kpi: any) => 
        kpi.scope_type === 'individual' || !kpi.scope_type
      );

      return filtered as unknown as Kpi[];
    },
    enabled: !!employeeId,
  });
};

// Fetch team KPIs (individual KPIs for managers)
export const useTeamKpis = (quarter?: number, year?: number) => {
  const { currentOrg } = useOrganization();
  const currentQuarter = quarter || Math.ceil((new Date().getMonth() + 1) / 3);
  const currentYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ['team-kpis', currentOrg?.id, currentQuarter, currentYear],
    queryFn: async (): Promise<KpiWithEmployee[]> => {
      if (!currentOrg?.id) return [];

      const { data, error } = await supabase
        .from('kpis')
        .select(`
          *,
          employee:employees!kpis_employee_id_fkey(
            id,
            profiles!inner(
              full_name,
              avatar_url
            )
          )
        `)
        .eq('organization_id', currentOrg.id)
        .eq('quarter', currentQuarter)
        .eq('year', currentYear)
        .order('created_at');

      if (error) throw error;

      // Filter individual KPIs in JS since scope_type may not be in generated types yet
      const filtered = (data || []).filter((kpi: any) => 
        kpi.scope_type === 'individual' || !kpi.scope_type
      );

      return filtered as unknown as KpiWithEmployee[];
    },
    enabled: !!currentOrg?.id,
  });
};

// Fetch group KPIs (department, office, project scoped)
export const useGroupKpis = (quarter?: number, year?: number) => {
  const { currentOrg } = useOrganization();
  const currentQuarter = quarter || Math.ceil((new Date().getMonth() + 1) / 3);
  const currentYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ['group-kpis', currentOrg?.id, currentQuarter, currentYear],
    queryFn: async (): Promise<GroupKpiWithScope[]> => {
      if (!currentOrg?.id) return [];

      const { data, error } = await supabase
        .from('kpis')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .eq('quarter', currentQuarter)
        .eq('year', currentYear)
        .order('created_at');

      if (error) throw error;

      // Filter group KPIs in JS
      const groupKpis = (data || []).filter((kpi: any) => 
        kpi.scope_type && kpi.scope_type !== 'individual'
      );

      // Fetch office and project names for group KPIs
      const officeIds = groupKpis.filter((k: any) => k.scope_office_id).map((k: any) => k.scope_office_id);
      const projectIds = groupKpis.filter((k: any) => k.scope_project_id).map((k: any) => k.scope_project_id);

      const [officesResult, projectsResult] = await Promise.all([
        officeIds.length > 0 
          ? supabase.from('offices').select('id, name').in('id', officeIds)
          : { data: [] },
        projectIds.length > 0
          ? supabase.from('projects').select('id, name').in('id', projectIds)
          : { data: [] },
      ]);

      const officeMap = new Map((officesResult.data || []).map((o: any) => [o.id, o]));
      const projectMap = new Map((projectsResult.data || []).map((p: any) => [p.id, p]));

      return groupKpis.map((kpi: any) => ({
        ...kpi,
        office: kpi.scope_office_id ? officeMap.get(kpi.scope_office_id) || null : null,
        project: kpi.scope_project_id ? projectMap.get(kpi.scope_project_id) || null : null,
      })) as GroupKpiWithScope[];
    },
    enabled: !!currentOrg?.id,
  });
};

// Fetch inherited group KPIs for an employee based on their department, office, and projects
export const useEmployeeInheritedKpis = (
  employeeId: string | undefined,
  department: string | undefined,
  officeId: string | undefined,
  projectIds: string[],
  quarter?: number,
  year?: number
) => {
  const { currentOrg } = useOrganization();
  const currentQuarter = quarter || Math.ceil((new Date().getMonth() + 1) / 3);
  const currentYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ['employee-inherited-kpis', employeeId, department, officeId, projectIds, currentQuarter, currentYear],
    queryFn: async (): Promise<GroupKpiWithScope[]> => {
      if (!currentOrg?.id || !employeeId) return [];

      const { data, error } = await supabase
        .from('kpis')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .eq('quarter', currentQuarter)
        .eq('year', currentYear);

      if (error) throw error;

      // Filter inherited KPIs in JS
      const inherited = (data || []).filter((kpi: any) => {
        if (!kpi.scope_type || kpi.scope_type === 'individual') return false;
        
        if (kpi.scope_type === 'department' && department && kpi.scope_department === department) return true;
        if (kpi.scope_type === 'office' && officeId && kpi.scope_office_id === officeId) return true;
        if (kpi.scope_type === 'project' && projectIds.length > 0 && projectIds.includes(kpi.scope_project_id)) return true;
        
        return false;
      });

      if (inherited.length === 0) return [];

      // Fetch office and project names
      const officeIdsToFetch = inherited.filter((k: any) => k.scope_office_id).map((k: any) => k.scope_office_id);
      const projectIdsToFetch = inherited.filter((k: any) => k.scope_project_id).map((k: any) => k.scope_project_id);

      const [officesResult, projectsResult] = await Promise.all([
        officeIdsToFetch.length > 0 
          ? supabase.from('offices').select('id, name').in('id', officeIdsToFetch)
          : { data: [] },
        projectIdsToFetch.length > 0
          ? supabase.from('projects').select('id, name').in('id', projectIdsToFetch)
          : { data: [] },
      ]);

      const officeMap = new Map((officesResult.data || []).map((o: any) => [o.id, o]));
      const projectMap = new Map((projectsResult.data || []).map((p: any) => [p.id, p]));

      return inherited.map((kpi: any) => ({
        ...kpi,
        office: kpi.scope_office_id ? officeMap.get(kpi.scope_office_id) || null : null,
        project: kpi.scope_project_id ? projectMap.get(kpi.scope_project_id) || null : null,
      })) as GroupKpiWithScope[];
    },
    enabled: !!currentOrg?.id && !!employeeId,
  });
};

// Fetch KPI templates
export const useKpiTemplates = () => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['kpi-templates', currentOrg?.id],
    queryFn: async (): Promise<KpiTemplate[]> => {
      if (!currentOrg?.id) return [];

      const { data, error } = await supabase
        .from('kpi_templates')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('title');

      if (error) throw error;

      return data as KpiTemplate[];
    },
    enabled: !!currentOrg?.id,
  });
};

// Create KPI (individual)
interface CreateKpiInput {
  employeeId: string;
  title: string;
  description?: string;
  targetValue?: number;
  unit?: string;
  quarter: number;
  year: number;
}

export const useCreateKpi = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async (input: CreateKpiInput) => {
      if (!currentOrg?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('kpis')
        .insert({
          employee_id: input.employeeId,
          organization_id: currentOrg.id,
          title: input.title,
          description: input.description,
          target_value: input.targetValue,
          unit: input.unit,
          quarter: input.quarter,
          year: input.year,
          scope_type: 'individual',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['team-kpis'] });
      toast.success('KPI created');
    },
    onError: () => {
      toast.error('Failed to create KPI');
    },
  });
};

// Create Group KPI
interface CreateGroupKpiInput {
  title: string;
  description?: string;
  targetValue?: number;
  unit?: string;
  quarter: number;
  year: number;
  scopeType: 'department' | 'office' | 'project';
  scopeDepartment?: string;
  scopeOfficeId?: string;
  scopeProjectId?: string;
}

export const useCreateGroupKpi = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async (input: CreateGroupKpiInput) => {
      if (!currentOrg?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('kpis')
        .insert({
          organization_id: currentOrg.id,
          title: input.title,
          description: input.description,
          target_value: input.targetValue,
          unit: input.unit,
          quarter: input.quarter,
          year: input.year,
          scope_type: input.scopeType,
          scope_department: input.scopeDepartment || null,
          scope_office_id: input.scopeOfficeId || null,
          scope_project_id: input.scopeProjectId || null,
          employee_id: null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['employee-inherited-kpis'] });
      toast.success('Group KPI created');
    },
    onError: () => {
      toast.error('Failed to create group KPI');
    },
  });
};

// Update KPI progress
export const useUpdateKpiProgress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      kpiId, 
      currentValue, 
      status 
    }: { 
      kpiId: string; 
      currentValue: number; 
      status?: string;
    }) => {
      const updates: Record<string, unknown> = { current_value: currentValue };
      if (status) updates.status = status;

      const { error } = await supabase
        .from('kpis')
        .update(updates)
        .eq('id', kpiId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['team-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['group-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['employee-inherited-kpis'] });
      toast.success('KPI progress updated');
    },
    onError: () => {
      toast.error('Failed to update KPI');
    },
  });
};

// Delete KPI
export const useDeleteKpi = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kpiId: string) => {
      const { error } = await supabase
        .from('kpis')
        .delete()
        .eq('id', kpiId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['team-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['group-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['employee-inherited-kpis'] });
      toast.success('KPI deleted');
    },
    onError: () => {
      toast.error('Failed to delete KPI');
    },
  });
};

// Fetch AI insights for an employee
export const useKpiAiInsights = (employeeId: string | undefined, quarter?: number, year?: number) => {
  const currentQuarter = quarter || Math.ceil((new Date().getMonth() + 1) / 3);
  const currentYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ['kpi-ai-insights', employeeId, currentQuarter, currentYear],
    queryFn: async () => {
      if (!employeeId) return null;

      const { data, error } = await supabase
        .from('kpi_ai_insights')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('quarter', currentQuarter)
        .eq('year', currentYear)
        .maybeSingle();

      if (error) throw error;

      return data;
    },
    enabled: !!employeeId,
  });
};

// Generate AI insights
export const useGenerateKpiInsights = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employeeId, quarter, year }: { employeeId: string; quarter: number; year: number }) => {
      const { data, error } = await supabase.functions.invoke('generate-kpi-insights', {
        body: { employeeId, quarter, year },
      });

      if (error) throw error;

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['kpi-ai-insights', variables.employeeId, variables.quarter, variables.year] 
      });
      toast.success('AI insights generated');
    },
    onError: () => {
      toast.error('Failed to generate insights');
    },
  });
};
