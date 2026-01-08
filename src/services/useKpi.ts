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
    staleTime: 60 * 1000, // 1 minute
    enabled: !!employeeId,
  });
};

// Fetch team KPIs (individual KPIs for managers) with metadata
export const useTeamKpis = (quarter?: number, year?: number) => {
  const { currentOrg } = useOrganization();
  const currentQuarter = quarter || Math.ceil((new Date().getMonth() + 1) / 3);
  const currentYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ['team-kpis', currentOrg?.id, currentQuarter, currentYear],
    staleTime: 60 * 1000, // 1 minute
    queryFn: async (): Promise<KpiWithEmployee[]> => {
      if (!currentOrg?.id) return [];

      const { data, error } = await supabase
        .from('kpis')
        .select(`
          *,
          employee:employees!kpis_employee_id_fkey(
            id,
            position,
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

      // Get KPI IDs for metadata fetching
      const kpiIds = filtered.map((k: any) => k.id);
      if (kpiIds.length === 0) return [];

      // Fetch updates count and child count in parallel
      const [updatesResult, childrenResult] = await Promise.all([
        supabase.from('kpi_updates').select('kpi_id').in('kpi_id', kpiIds),
        supabase.from('kpis').select('parent_kpi_id').in('parent_kpi_id', kpiIds),
      ]);

      // Build maps for counts
      const updatesMap = new Map<string, number>();
      const childMap = new Map<string, number>();
      
      (updatesResult.data || []).forEach((u: any) => {
        updatesMap.set(u.kpi_id, (updatesMap.get(u.kpi_id) || 0) + 1);
      });
      
      (childrenResult.data || []).forEach((c: any) => {
        if (c.parent_kpi_id) {
          childMap.set(c.parent_kpi_id, (childMap.get(c.parent_kpi_id) || 0) + 1);
        }
      });

      // Enrich KPIs with metadata
      return filtered.map((kpi: any) => ({
        ...kpi,
        updates_count: updatesMap.get(kpi.id) || 0,
        child_count: childMap.get(kpi.id) || 0,
      })) as unknown as KpiWithEmployee[];
    },
    enabled: !!currentOrg?.id,
  });
};

// Fetch group KPIs (department, office, project scoped - excludes organization) with metadata
export const useGroupKpis = (quarter?: number, year?: number) => {
  const { currentOrg } = useOrganization();
  const currentYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ['group-kpis', currentOrg?.id, quarter, currentYear],
    staleTime: 60 * 1000, // 1 minute
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

      if (groupKpis.length === 0) return [];

      // Fetch office, project names, updates count, child count, and owners in parallel
      const kpiIds = groupKpis.map((k: any) => k.id);
      const officeIds = groupKpis.filter((k: any) => k.scope_office_id).map((k: any) => k.scope_office_id);
      const projectIds = groupKpis.filter((k: any) => k.scope_project_id).map((k: any) => k.scope_project_id);

      const [officesResult, projectsResult, updatesResult, childrenResult, ownersResult] = await Promise.all([
        officeIds.length > 0 
          ? supabase.from('offices').select('id, name').in('id', officeIds)
          : { data: [] },
        projectIds.length > 0
          ? supabase.from('projects').select('id, name, icon, color, logo_url').in('id', projectIds)
          : { data: [] },
        supabase.from('kpi_updates').select('kpi_id').in('kpi_id', kpiIds),
        supabase.from('kpis').select('parent_kpi_id').in('parent_kpi_id', kpiIds),
        supabase.from('kpi_owners').select('kpi_id, employee_id, is_primary').in('kpi_id', kpiIds),
      ]);

      const officeMap = new Map((officesResult.data || []).map((o: any) => [o.id, o]));
      const projectMap = new Map((projectsResult.data || []).map((p: any) => [p.id, p]));
      
      // Build maps for counts
      const updatesMap = new Map<string, number>();
      const childMap = new Map<string, number>();
      
      (updatesResult.data || []).forEach((u: any) => {
        updatesMap.set(u.kpi_id, (updatesMap.get(u.kpi_id) || 0) + 1);
      });
      
      (childrenResult.data || []).forEach((c: any) => {
        if (c.parent_kpi_id) {
          childMap.set(c.parent_kpi_id, (childMap.get(c.parent_kpi_id) || 0) + 1);
        }
      });
      
      // Build owners map from kpi_owners result
      const ownerEmployeeIds = [...new Set((ownersResult.data || []).map((o: any) => o.employee_id))];
      
      // Fetch employee profile data for owners
      let ownerProfilesMap = new Map<string, { full_name: string; avatar_url: string | null }>();
      if (ownerEmployeeIds.length > 0) {
        const { data: employeeProfiles } = await supabase
          .from('employees')
          .select('id, profiles!inner(full_name, avatar_url)')
          .in('id', ownerEmployeeIds);
        
        (employeeProfiles || []).forEach((e: any) => {
          ownerProfilesMap.set(e.id, {
            full_name: e.profiles?.full_name || 'Unknown',
            avatar_url: e.profiles?.avatar_url || null,
          });
        });
      }
      
      // Build owners map with profile data
      const ownersMap = new Map<string, Array<{ employee_id: string; is_primary: boolean; full_name?: string; avatar_url?: string | null }>>();
      (ownersResult.data || []).forEach((o: any) => {
        if (!ownersMap.has(o.kpi_id)) {
          ownersMap.set(o.kpi_id, []);
        }
        const profile = ownerProfilesMap.get(o.employee_id);
        ownersMap.get(o.kpi_id)!.push({ 
          employee_id: o.employee_id, 
          is_primary: o.is_primary,
          full_name: profile?.full_name,
          avatar_url: profile?.avatar_url,
        });
      });

      return groupKpis.map((kpi: any) => ({
        ...kpi,
        office: kpi.scope_office_id ? officeMap.get(kpi.scope_office_id) || null : null,
        project: kpi.scope_project_id ? projectMap.get(kpi.scope_project_id) || null : null,
        updates_count: updatesMap.get(kpi.id) || 0,
        child_count: childMap.get(kpi.id) || 0,
        kpi_owners: ownersMap.get(kpi.id) || [],
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
    staleTime: 60 * 1000, // 1 minute
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

      // Fetch children with employee profiles for individual KPIs and project/office for group KPIs
      const { data: children } = await supabase
        .from('kpis')
        .select(`
          *,
          employee:employees!kpis_employee_id_fkey(
            id,
            profiles:profiles(full_name, avatar_url)
          ),
          project:projects!kpis_scope_project_id_fkey(
            id,
            name,
            icon,
            color,
            logo_url
          ),
          office:offices!kpis_scope_office_id_fkey(
            id,
            name
          )
        `)
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

// Fetch Group KPIs where employee is an owner (fetches ALL periods, not filtered by quarter/year)
export const useEmployeeOwnedGroupKpis = (
  employeeId: string | undefined,
  _quarter?: number, // Ignored - kept for API compatibility
  _year?: number     // Ignored - kept for API compatibility
) => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['employee-owned-group-kpis', employeeId, currentOrg?.id],
    queryFn: async (): Promise<GroupKpiWithScope[]> => {
      if (!currentOrg?.id || !employeeId) return [];

      // Get KPI IDs where this employee is an owner
      const { data: ownershipData, error: ownershipError } = await supabase
        .from('kpi_owners')
        .select('kpi_id')
        .eq('employee_id', employeeId);

      if (ownershipError) throw ownershipError;
      if (!ownershipData || ownershipData.length === 0) return [];

      const ownedKpiIds = ownershipData.map(o => o.kpi_id);

      // Fetch those KPIs that are group-scoped (NO quarter/year filter - show all)
      const { data, error } = await supabase
        .from('kpis')
        .select('*')
        .in('id', ownedKpiIds)
        .eq('organization_id', currentOrg.id);

      if (error) throw error;

      // Filter to group KPIs only (exclude individual and organization)
      const groupKpis = (data || []).filter((kpi: any) =>
        kpi.scope_type && kpi.scope_type !== 'individual' && kpi.scope_type !== 'organization'
      );

      if (groupKpis.length === 0) return [];

      // Fetch office and project details including icon, color, logo_url
      const officeIds = groupKpis.filter((k: any) => k.scope_office_id).map((k: any) => k.scope_office_id);
      const projectIds = groupKpis.filter((k: any) => k.scope_project_id).map((k: any) => k.scope_project_id);

      const [officesResult, projectsResult] = await Promise.all([
        officeIds.length > 0
          ? supabase.from('offices').select('id, name').in('id', officeIds)
          : { data: [] },
        projectIds.length > 0
          ? supabase.from('projects').select('id, name, icon, color, logo_url').in('id', projectIds)
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
  quarter: number | null;
  year: number;
}

export const useCreateKpi = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (input: CreateKpiInput) => {
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error('Not authenticated');

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

      // Log the activity
      await supabase.from('kpi_activity_logs').insert({
        kpi_id: data.id,
        employee_id: currentEmployee.id,
        organization_id: currentOrg.id,
        action_type: 'created',
        description: `Created KPI: ${input.title}`,
        new_value: {
          title: input.title,
          description: input.description,
          target_value: input.targetValue,
          unit: input.unit,
          quarter: input.quarter,
          year: input.year,
          scope_type: 'individual',
        },
      });

      // Send notification to the assigned employee
      if (data?.id) {
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
  quarter: number | null;
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
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error('Not authenticated');

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

      // Log the activity
      await supabase.from('kpi_activity_logs').insert({
        kpi_id: data.id,
        employee_id: currentEmployee.id,
        organization_id: currentOrg.id,
        action_type: 'created',
        description: `Created ${input.scopeType} KPI: ${input.title}`,
        new_value: {
          title: input.title,
          description: input.description,
          target_value: input.targetValue,
          unit: input.unit,
          quarter: input.quarter,
          year: input.year,
          scope_type: input.scopeType,
          scope_department: input.scopeDepartment,
          scope_office_id: input.scopeOfficeId,
          scope_project_id: input.scopeProjectId,
          scope_name: input.scopeName,
        },
      });

      // Send notifications to affected employees (skip organization scope)
      if (data?.id && input.scopeType !== 'organization') {
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
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({ 
      kpiId, 
      parentKpiId,
      parentTitle,
      weight = 1.0 
    }: { 
      kpiId: string; 
      parentKpiId: string;
      parentTitle?: string;
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

      // Log the activity
      if (currentOrg?.id && currentEmployee?.id) {
        await supabase.from('kpi_activity_logs').insert({
          kpi_id: kpiId,
          employee_id: currentEmployee.id,
          organization_id: currentOrg.id,
          action_type: 'linked',
          description: parentTitle ? `Linked to parent KPI: ${parentTitle}` : 'Linked to parent KPI',
          new_value: { parent_kpi_id: parentKpiId, weight },
        });
      }

      return { kpiId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['kpi-hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['kpi-activity-logs', result.kpiId] });
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
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({ kpiId, parentTitle }: { kpiId: string; parentTitle?: string }) => {
      // Get the current parent before unlinking
      const { data: kpi } = await supabase
        .from('kpis')
        .select('parent_kpi_id')
        .eq('id', kpiId)
        .single();

      const { error } = await supabase
        .from('kpis')
        .update({ 
          parent_kpi_id: null,
          child_contribution_weight: 1.0,
        })
        .eq('id', kpiId);

      if (error) throw error;

      // Log the activity
      if (currentOrg?.id && currentEmployee?.id) {
        await supabase.from('kpi_activity_logs').insert({
          kpi_id: kpiId,
          employee_id: currentEmployee.id,
          organization_id: currentOrg.id,
          action_type: 'unlinked',
          description: parentTitle ? `Unlinked from parent KPI: ${parentTitle}` : 'Unlinked from parent KPI',
          old_value: { parent_kpi_id: kpi?.parent_kpi_id },
        });
      }

      return { kpiId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['kpi-hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['kpi-activity-logs', result.kpiId] });
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
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({ kpiId, kpiTitle }: { kpiId: string; kpiTitle?: string }) => {
      // Get KPI details before deletion for activity log
      const { data: kpi } = await supabase
        .from('kpis')
        .select('title, description, scope_type, target_value, unit')
        .eq('id', kpiId)
        .single();

      // Note: We can't log to kpi_activity_logs after deletion as the KPI won't exist
      // The activity log entry will be deleted via cascade
      // For audit purposes, consider a separate audit table in the future

      const { error } = await supabase
        .from('kpis')
        .delete()
        .eq('id', kpiId);

      if (error) throw error;
      
      return { kpiTitle: kpiTitle || kpi?.title };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['employee-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['team-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['group-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['employee-inherited-kpis'] });
      toast.success(`KPI "${result.kpiTitle || 'KPI'}" deleted`);
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
