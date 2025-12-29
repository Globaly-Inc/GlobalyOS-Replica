import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

export interface KpiActivityLog {
  id: string;
  kpi_id: string;
  employee_id: string;
  organization_id: string;
  action_type: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  description: string | null;
  created_at: string;
  employee?: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

export function useKpiActivityLogs(kpiId: string | undefined) {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['kpi-activity-logs', kpiId],
    queryFn: async () => {
      if (!kpiId || !currentOrg?.id) return [];

      const { data, error } = await supabase
        .from('kpi_activity_logs')
        .select(`
          *,
          employee:employees!kpi_activity_logs_employee_id_fkey(
            id,
            profiles(full_name, avatar_url)
          )
        `)
        .eq('kpi_id', kpiId)
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as KpiActivityLog[];
    },
    enabled: !!kpiId && !!currentOrg?.id,
  });
}

// useLogKpiActivity is exported from useKpi.ts
