/**
 * Real-time subscription hooks for attendance records
 */

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

/**
 * Organization-wide attendance realtime subscription
 * Invalidates attendance-related queries when changes occur
 */
export const useAttendanceRealtime = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();

  useEffect(() => {
    if (!currentOrg?.id) return;

    const channel = supabase
      .channel(`attendance-org-${currentOrg.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_records',
          filter: `organization_id=eq.${currentOrg.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['today-attendance'] });
          queryClient.invalidateQueries({ queryKey: ['check-in-status'] });
          queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
          queryClient.invalidateQueries({ queryKey: ['attendance-hour-balance'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrg?.id, queryClient]);
};
