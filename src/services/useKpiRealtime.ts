/**
 * Real-time subscription hooks for KPI updates
 */

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

/**
 * Organization-wide KPI realtime subscription
 * Invalidates KPI-related queries when changes occur
 */
export const useKpiRealtime = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();

  useEffect(() => {
    if (!currentOrg?.id) return;

    const channel = supabase
      .channel(`kpi-org-${currentOrg.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kpi_update_settings',
          filter: `organization_id=eq.${currentOrg.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pending-kpi-updates'] });
          queryClient.invalidateQueries({ queryKey: ['kpi-update-settings'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kpi_updates',
          filter: `organization_id=eq.${currentOrg.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pending-kpi-updates'] });
          queryClient.invalidateQueries({ queryKey: ['kpi-updates'] });
          queryClient.invalidateQueries({ queryKey: ['kpi-detail'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrg?.id, queryClient]);
};
