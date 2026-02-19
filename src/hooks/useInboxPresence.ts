import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

interface PresenceState {
  user_id: string;
  user_name: string;
  conversation_id: string;
  is_typing: boolean;
  online_at: string;
}

export function useInboxPresence(conversationId: string | undefined) {
  const { currentOrg } = useOrganization();
  const [otherAgents, setOtherAgents] = useState<PresenceState[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (!conversationId || !currentOrg?.id || !currentUserId) return;

    const channelName = `inbox-presence-${conversationId}`;
    const channel = supabase.channel(channelName, {
      config: { presence: { key: currentUserId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceState>();
        const agents: PresenceState[] = [];
        Object.entries(state).forEach(([key, presences]) => {
          if (key !== currentUserId && presences.length > 0) {
            agents.push(presences[0] as unknown as PresenceState);
          }
        });
        setOtherAgents(agents);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: currentUserId,
            user_name: '', // Will be filled by caller
            conversation_id: conversationId,
            is_typing: false,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentOrg?.id, currentUserId]);

  const setTyping = useCallback(
    async (isTyping: boolean) => {
      if (!conversationId || !currentUserId) return;
      const channelName = `inbox-presence-${conversationId}`;
      const channel = supabase.channel(channelName);
      try {
        await channel.track({
          user_id: currentUserId,
          user_name: '',
          conversation_id: conversationId,
          is_typing: isTyping,
          online_at: new Date().toISOString(),
        });
      } catch {
        // Ignore track errors
      }
    },
    [conversationId, currentUserId]
  );

  const viewingAgents = otherAgents.filter((a) => !a.is_typing);
  const typingAgents = otherAgents.filter((a) => a.is_typing);

  return {
    viewingAgents,
    typingAgents,
    otherAgents,
    setTyping,
  };
}
