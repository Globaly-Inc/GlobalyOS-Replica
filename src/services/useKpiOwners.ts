/**
 * KPI Owners service hooks
 * Handles owner management for both individual and group/organization KPIs
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from './useCurrentEmployee';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errorUtils';

export interface KpiOwner {
  id: string;
  employee_id: string;
  is_primary: boolean;
  full_name: string;
  avatar_url: string | null;
}

// Fetch KPI owners based on scope type
export const useKpiOwners = (kpiId: string | undefined, scopeType: string | undefined) => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['kpi-owners', kpiId, scopeType],
    queryFn: async (): Promise<KpiOwner[]> => {
      if (!kpiId || !currentOrg?.id) return [];

      // For individual KPIs, fetch from kpis.employee_id
      if (scopeType === 'individual') {
        const { data: kpi, error } = await supabase
          .from('kpis')
          .select(`
            employee_id,
            employee:employees!kpis_employee_id_fkey(
              id,
              profiles!inner(full_name, avatar_url)
            )
          `)
          .eq('id', kpiId)
          .single();

        if (error) throw error;
        if (!kpi?.employee) return [];

        return [{
          id: kpi.employee.id,
          employee_id: kpi.employee.id,
          is_primary: true,
          full_name: (kpi.employee as any).profiles.full_name,
          avatar_url: (kpi.employee as any).profiles.avatar_url,
        }];
      }

      // For organization/group KPIs, fetch from kpi_owners table
      const { data, error } = await supabase
        .from('kpi_owners')
        .select(`
          id,
          employee_id,
          is_primary,
          employee:employees!inner(
            id,
            profiles!inner(full_name, avatar_url)
          )
        `)
        .eq('kpi_id', kpiId)
        .order('is_primary', { ascending: false });

      if (error) throw error;

      return (data || []).map((owner: any) => ({
        id: owner.id,
        employee_id: owner.employee_id,
        is_primary: owner.is_primary,
        full_name: owner.employee.profiles.full_name,
        avatar_url: owner.employee.profiles.avatar_url,
      }));
    },
    enabled: !!kpiId && !!currentOrg?.id && !!scopeType,
  });
};

// Add owner to a group/organization KPI
export const useAddKpiOwner = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async ({ 
      kpiId, 
      employeeId, 
      isPrimary = false 
    }: { 
      kpiId: string; 
      employeeId: string; 
      isPrimary?: boolean;
    }) => {
      if (!currentOrg?.id) throw new Error('No organization');

      // If setting as primary, unset other primaries first
      if (isPrimary) {
        await supabase
          .from('kpi_owners')
          .update({ is_primary: false })
          .eq('kpi_id', kpiId);
      }

      const { data, error } = await supabase
        .from('kpi_owners')
        .insert({
          kpi_id: kpiId,
          employee_id: employeeId,
          organization_id: currentOrg.id,
          is_primary: isPrimary,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kpi-owners', variables.kpiId] });
      queryClient.invalidateQueries({ queryKey: ['kpi-detail', variables.kpiId] });
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to add owner');
      toast.error(message);
    },
  });
};

// Remove owner from a group/organization KPI
export const useRemoveKpiOwner = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      kpiId, 
      employeeId 
    }: { 
      kpiId: string; 
      employeeId: string;
    }) => {
      const { error } = await supabase
        .from('kpi_owners')
        .delete()
        .eq('kpi_id', kpiId)
        .eq('employee_id', employeeId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kpi-owners', variables.kpiId] });
      queryClient.invalidateQueries({ queryKey: ['kpi-detail', variables.kpiId] });
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to remove owner');
      toast.error(message);
    },
  });
};

// Set primary owner for a group/organization KPI
export const useSetPrimaryOwner = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      kpiId, 
      employeeId 
    }: { 
      kpiId: string; 
      employeeId: string;
    }) => {
      // Unset all primaries first
      await supabase
        .from('kpi_owners')
        .update({ is_primary: false })
        .eq('kpi_id', kpiId);

      // Set the new primary
      const { error } = await supabase
        .from('kpi_owners')
        .update({ is_primary: true })
        .eq('kpi_id', kpiId)
        .eq('employee_id', employeeId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kpi-owners', variables.kpiId] });
      toast.success('Primary owner updated');
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to set primary owner');
      toast.error(message);
    },
  });
};

// Update individual KPI owner (single owner via employee_id)
export const useUpdateIndividualKpiOwner = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async ({ kpiId, employeeId }: { kpiId: string; employeeId: string | null }) => {
      if (!currentOrg?.id) throw new Error('No organization');

      const { data, error } = await supabase
        .from('kpis')
        .update({ employee_id: employeeId })
        .eq('id', kpiId)
        .eq('organization_id', currentOrg.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kpi-detail', variables.kpiId] });
      queryClient.invalidateQueries({ queryKey: ['kpi-owners', variables.kpiId] });
      queryClient.invalidateQueries({ queryKey: ['employee-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['team-kpis'] });
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to update owner');
      toast.error(message);
    },
  });
};
