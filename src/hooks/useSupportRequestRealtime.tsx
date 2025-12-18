import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useSupportRequestRealtime = (requestId: string | null) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!requestId) return;

    const channel = supabase
      .channel(`support-request-${requestId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_requests', filter: `id=eq.${requestId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['support-requests'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_request_comments', filter: `request_id=eq.${requestId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['support-request-comments', requestId] });
          queryClient.invalidateQueries({ queryKey: ['support-requests'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_request_subscribers', filter: `request_id=eq.${requestId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['support-request-subscribers', requestId] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_request_activity_logs', filter: `request_id=eq.${requestId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['support-request-activity-logs', requestId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, queryClient]);
};

export const useSupportRequestsListRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('support-requests-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_requests' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['support-requests'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
