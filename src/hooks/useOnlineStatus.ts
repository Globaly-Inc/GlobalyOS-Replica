/**
 * Hook to fetch and subscribe to online status for an employee
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

export interface OnlineStatus {
  isOnline: boolean;
  lastSeenAt: string | null;
}

export const useOnlineStatus = (employeeId: string | undefined) => {
  const { currentOrg } = useOrganization();
  const [status, setStatus] = useState<OnlineStatus>({ isOnline: false, lastSeenAt: null });

  useEffect(() => {
    if (!employeeId || !currentOrg?.id) return;

    const fetchStatus = async () => {
      const { data } = await supabase
        .from('chat_presence')
        .select('is_online, last_seen_at')
        .eq('employee_id', employeeId)
        .single();

      if (data) {
        setStatus({
          isOnline: data.is_online,
          lastSeenAt: data.last_seen_at,
        });
      }
    };

    fetchStatus();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`presence-${employeeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_presence',
          filter: `employee_id=eq.${employeeId}`,
        },
        (payload: any) => {
          if (payload.new) {
            setStatus({
              isOnline: payload.new.is_online,
              lastSeenAt: payload.new.last_seen_at,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employeeId, currentOrg?.id]);

  return status;
};
