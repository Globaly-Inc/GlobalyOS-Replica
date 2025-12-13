/**
 * KPI and performance domain service hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from './useCurrentEmployee';
import { toast } from 'sonner';
import type { Kpi, KpiWithEmployee, KpiTemplate, KpiAiInsight } from '@/types';

// Fetch KPIs for an employee
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

      return data as Kpi[];
    },
    enabled: !!employeeId,
  });
};

// Fetch team KPIs (for managers)
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

      return data as KpiWithEmployee[];
    },
    enabled: !!currentOrg?.id,
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

// Create KPI
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
