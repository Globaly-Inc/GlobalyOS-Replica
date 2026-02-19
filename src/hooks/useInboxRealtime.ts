import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

export function useInboxRealtime() {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;

  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel(`inbox-realtime-${orgId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inbox_conversations',
          filter: `organization_id=eq.${orgId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['inbox-conversations', orgId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inbox_messages',
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) => {
          const msg = payload.new as { conversation_id: string };
          qc.invalidateQueries({ queryKey: ['inbox-messages', msg.conversation_id] });
          qc.invalidateQueries({ queryKey: ['inbox-conversations', orgId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, qc]);
}
