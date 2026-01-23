/**
 * Real-time subscription hooks for WFH requests
 */

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

/**
 * Organization-wide WFH realtime subscription
 * Invalidates WFH-related queries when changes occur
 */
export const useWfhRealtime = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();

  useEffect(() => {
    if (!currentOrg?.id) return;

    const channel = supabase
      .channel(`wfh-org-${currentOrg.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wfh_requests',
          filter: `organization_id=eq.${currentOrg.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pending-wfh-requests'] });
          queryClient.invalidateQueries({ queryKey: ['own-pending-wfh-requests'] });
          queryClient.invalidateQueries({ queryKey: ['has-approved-wfh-today'] });
          queryClient.invalidateQueries({ queryKey: ['wfh-days'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrg?.id, queryClient]);
};
