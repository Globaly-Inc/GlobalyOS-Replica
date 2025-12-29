/**
 * KPI and performance domain service hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from './useCurrentEmployee';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errorUtils';
import type { Kpi, KpiWithEmployee, KpiTemplate, KpiAiInsight, GroupKpiWithScope, KpiScopeType, KpiWithHierarchy, OrganizationKpi } from '@/types';
import { sendKpiNotifications } from './kpiNotifications';

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

// Fetch group KPIs (department, office, project scoped - excludes organization)
export const useGroupKpis = (quarter?: number, year?: number) => {
  const { currentOrg } = useOrganization();
  const currentYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ['group-kpis', currentOrg?.id, quarter, currentYear],
    queryFn: async (): Promise<GroupKpiWithScope[]> => {
      if (!currentOrg?.id) return [];

      let query = supabase
        .from('kpis')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .eq('year', currentYear);
      
      // Only filter by quarter if a specific quarter is provided
      if (quarter !== undefined) {
        query = query.eq('quarter', quarter);
      }
      
      const { data, error } = await query.order('created_at');

      if (error) throw error;

      // Filter group KPIs (exclude individual and organization)
      const groupKpis = (data || []).filter((kpi: any) => 
        kpi.scope_type && kpi.scope_type !== 'individual' && kpi.scope_type !== 'organization'
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

// Fetch organization-level KPIs (top level)
export const useOrganizationKpis = (quarter?: number, year?: number) => {
  const { currentOrg } = useOrganization();
  const currentYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ['organization-kpis', currentOrg?.id, quarter, currentYear],
    queryFn: async (): Promise<OrganizationKpi[]> => {
      if (!currentOrg?.id) return [];

      let query = supabase
        .from('kpis')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .eq('year', currentYear);
      
      // Only filter by quarter if a specific quarter is provided
      if (quarter !== undefined) {
        query = query.eq('quarter', quarter);
      }
      
      const { data, error } = await query.order('created_at');

      if (error) throw error;

      // Filter organization KPIs
      const orgKpis = (data || []).filter((kpi: any) => 
        kpi.scope_type === 'organization'
      );

      // Get child counts for each org KPI
      const kpisWithChildren = await Promise.all(
        orgKpis.map(async (kpi: any) => {
          const { count } = await supabase
            .from('kpis')
            .select('id', { count: 'exact', head: true })
            .eq('parent_kpi_id', kpi.id);

          // Calculate aggregated progress if has children
          let aggregatedProgress: number | undefined;
          if (count && count > 0 && kpi.auto_rollup) {
            const { data: rollupData } = await supabase.rpc('calculate_kpi_rollup', { parent_id: kpi.id });
            aggregatedProgress = rollupData ?? undefined;
          }

          return {
            ...kpi,
            child_count: count || 0,
            aggregated_progress: aggregatedProgress,
          } as OrganizationKpi;
        })
      );

      return kpisWithChildren;
    },
    enabled: !!currentOrg?.id,
  });
};

// Fetch KPI with its hierarchy (parent and children)
export const useKpiHierarchy = (kpiId: string | undefined) => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['kpi-hierarchy', kpiId],
    queryFn: async (): Promise<KpiWithHierarchy | null> => {
      if (!kpiId || !currentOrg?.id) return null;

      // Fetch the KPI
      const { data: kpi, error } = await supabase
        .from('kpis')
        .select('*')
        .eq('id', kpiId)
        .single();

      if (error) throw error;
      if (!kpi) return null;

      // Fetch parent if exists
      let parent: Kpi | null = null;
      if (kpi.parent_kpi_id) {
        const { data: parentData } = await supabase
          .from('kpis')
          .select('*')
          .eq('id', kpi.parent_kpi_id)
          .single();
        parent = parentData as unknown as Kpi | null;
      }

      // Fetch children
      const { data: children } = await supabase
        .from('kpis')
        .select('*')
        .eq('parent_kpi_id', kpiId)
        .order('created_at');

      // Calculate aggregated progress
      let aggregatedProgress: number | undefined;
      if (children && children.length > 0) {
        const { data: rollupData } = await supabase.rpc('calculate_kpi_rollup', { parent_id: kpiId });
        aggregatedProgress = rollupData ?? undefined;
      }

      return {
        ...kpi,
        parent,
        children: (children || []) as unknown as Kpi[],
        child_count: children?.length || 0,
        aggregated_progress: aggregatedProgress,
      } as unknown as KpiWithHierarchy;
    },
    enabled: !!kpiId && !!currentOrg?.id,
  });
};

// Fetch available parent KPIs for linking
export const useAvailableParentKpis = (
  scopeType: KpiScopeType | undefined,
  quarter: number,
  year: number,
  excludeKpiId?: string
) => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['available-parent-kpis', currentOrg?.id, scopeType, quarter, year, excludeKpiId],
    queryFn: async (): Promise<Kpi[]> => {
      if (!currentOrg?.id || !scopeType) return [];

      const { data, error } = await supabase
        .from('kpis')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .eq('quarter', quarter)
        .eq('year', year)
        .is('parent_kpi_id', null) // Only top-level KPIs can be parents
        .order('title');

      if (error) throw error;

      // Filter based on hierarchy rules
      let filtered = (data || []).filter((kpi: any) => {
        if (excludeKpiId && kpi.id === excludeKpiId) return false;
        
        // Organization KPIs can be parents of anything except organization KPIs
        if (kpi.scope_type === 'organization') {
          return scopeType !== 'organization';
        }
        
        // Group KPIs (dept/office/project) can be parents of individual KPIs
        if (['department', 'office', 'project'].includes(kpi.scope_type)) {
          return scopeType === 'individual';
        }
        
        return false;
      });

      return filtered as unknown as Kpi[];
    },
    enabled: !!currentOrg?.id && !!scopeType,
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
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (input: CreateKpiInput) => {
      if (!currentOrg?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
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
        })
        .select('id')
        .single();

      if (error) throw error;

      // Send notification to the assigned employee
      if (currentEmployee?.id && data?.id) {
        await sendKpiNotifications({
          kpiId: data.id,
          kpiTitle: input.title,
          scopeType: 'individual',
          organizationId: currentOrg.id,
          actorEmployeeId: currentEmployee.id,
          targetEmployeeId: input.employeeId,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['team-kpis'] });
      toast.success('KPI created');
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to create KPI');
      toast.error(message);
    },
  });
};

// Create Group KPI (including organization scope)
interface CreateGroupKpiInput {
  title: string;
  description?: string;
  targetValue?: number;
  unit?: string;
  quarter: number;
  year: number;
  scopeType: 'department' | 'office' | 'project' | 'organization';
  scopeDepartment?: string;
  scopeOfficeId?: string;
  scopeProjectId?: string;
  scopeName?: string; // For better notification messages
  parentKpiId?: string;
  autoRollup?: boolean;
}

export const useCreateGroupKpi = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (input: CreateGroupKpiInput) => {
      if (!currentOrg?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
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
          parent_kpi_id: input.parentKpiId || null,
          auto_rollup: input.autoRollup || false,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Send notifications to affected employees (skip organization scope)
      if (currentEmployee?.id && data?.id && input.scopeType !== 'organization') {
        await sendKpiNotifications({
          kpiId: data.id,
          kpiTitle: input.title,
          scopeType: input.scopeType,
          organizationId: currentOrg.id,
          actorEmployeeId: currentEmployee.id,
          scopeDepartment: input.scopeDepartment,
          scopeOfficeId: input.scopeOfficeId,
          scopeProjectId: input.scopeProjectId,
          scopeName: input.scopeName,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['organization-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['employee-inherited-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['kpi-hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['available-parent-kpis'] });
      toast.success('KPI created');
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to create KPI');
      toast.error(message);
    },
  });
};

// Link a KPI to a parent
export const useLinkKpi = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      kpiId, 
      parentKpiId,
      weight = 1.0 
    }: { 
      kpiId: string; 
      parentKpiId: string;
      weight?: number;
    }) => {
      const { error } = await supabase
        .from('kpis')
        .update({ 
          parent_kpi_id: parentKpiId,
          child_contribution_weight: weight,
        })
        .eq('id', kpiId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['organization-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['group-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['available-parent-kpis'] });
      toast.success('KPI linked');
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to link KPI');
      toast.error(message);
    },
  });
};

// Unlink a KPI from its parent
export const useUnlinkKpi = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kpiId: string) => {
      const { error } = await supabase
        .from('kpis')
        .update({ 
          parent_kpi_id: null,
          child_contribution_weight: 1.0,
        })
        .eq('id', kpiId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['organization-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['group-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['available-parent-kpis'] });
      toast.success('KPI unlinked');
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to unlink KPI');
      toast.error(message);
    },
  });
};

// Toggle auto-rollup for a parent KPI
export const useToggleAutoRollup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ kpiId, autoRollup }: { kpiId: string; autoRollup: boolean }) => {
      const { error } = await supabase
        .from('kpis')
        .update({ auto_rollup: autoRollup })
        .eq('id', kpiId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['organization-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['group-kpis'] });
      toast.success('Auto-rollup setting updated');
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to update setting');
      toast.error(message);
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
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to update KPI');
      toast.error(message);
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
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to delete KPI');
      toast.error(message);
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
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to generate insights');
      toast.error(message);
    },
  });
};

// Update KPI owner
export const useUpdateKpiOwner = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async ({ kpiId, employeeId }: { kpiId: string; employeeId: string | null }) => {
      const { data, error } = await supabase
        .from('kpis')
        .update({ employee_id: employeeId })
        .eq('id', kpiId)
        .eq('organization_id', currentOrg?.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kpi-detail', variables.kpiId] });
      queryClient.invalidateQueries({ queryKey: ['employee-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['team-kpis'] });
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to update owner');
      toast.error(message);
    },
  });
};

// Log KPI activity
export const useLogKpiActivity = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({
      kpiId,
      actionType,
      description,
      oldValue,
      newValue,
    }: {
      kpiId: string;
      actionType: string;
      description?: string;
      oldValue?: Record<string, unknown>;
      newValue?: Record<string, unknown>;
    }) => {
      if (!currentOrg?.id || !currentEmployee?.id) {
        throw new Error('Missing organization or employee context');
      }

      const insertData = {
        kpi_id: kpiId,
        employee_id: currentEmployee.id,
        organization_id: currentOrg.id,
        action_type: actionType,
        description: description || null,
        old_value: oldValue || null,
        new_value: newValue || null,
      };

      const { data, error } = await supabase
        .from('kpi_activity_logs')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kpi-activity-logs', variables.kpiId] });
    },
  });
};
