/**
 * Conversation Query Hooks
 * Fetches and caches conversation data
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';
import type { ChatConversation, ChatParticipant } from '@/types/chat';

export const useConversations = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useQuery({
    queryKey: ['chat-conversations', currentOrg?.id, currentEmployee?.id],
    queryFn: async () => {
      if (!currentOrg?.id || !currentEmployee?.id) return [];

      // Single optimized query with all needed joins - eliminates N+1 problem
      const { data, error } = await supabase
        .from('chat_participants')
        .select(`
          conversation_id,
          last_read_at,
          is_muted,
          chat_conversations:conversation_id (
            id,
            organization_id,
            name,
            icon_url,
            is_group,
            created_by,
            created_at,
            updated_at,
            chat_participants (
              id,
              employee_id,
              role,
              employees:employee_id (
                id,
                user_id,
                position,
                profiles:user_id (
                  full_name,
                  avatar_url,
                  email
                )
              )
            )
          )
        `)
        .eq('employee_id', currentEmployee.id)
        .eq('organization_id', currentOrg.id);

      if (error) throw error;

      // Get conversation IDs for batch last message fetch
      const conversationIds = (data || [])
        .map((item: any) => item.chat_conversations?.id)
        .filter(Boolean);

      // Batch fetch last messages using optimized database function
      let lastMessageMap = new Map();
      if (conversationIds.length > 0) {
        const { data: lastMessages } = await supabase
          .rpc('get_last_messages_batch', { 
            conversation_ids: conversationIds 
          });

        lastMessageMap = new Map(
          (lastMessages || []).map((m: any) => [m.conversation_id, m])
        );
      }

      // Transform data - no additional queries needed
      return (data || []).map((item: any) => {
        const conv = item.chat_conversations;
        if (!conv) return null;
        
        return {
          ...conv,
          participants: conv.chat_participants?.map((p: any) => ({
            ...p,
            employee: p.employees
          })),
          last_message: lastMessageMap.get(conv.id),
          last_read_at: item.last_read_at,
          is_muted: item.is_muted
        } as ChatConversation;
      }).filter(Boolean) as ChatConversation[];
    },
    enabled: !!currentOrg?.id && !!currentEmployee?.id,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useConversationParticipants = (conversationId: string | null) => {
  return useQuery({
    queryKey: ['chat-conversation-participants', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('chat_participants')
        .select(`
          *,
          employees:employee_id (
            id,
            user_id,
            position,
            profiles:user_id (
              full_name,
              avatar_url,
              email
            )
          )
        `)
        .eq('conversation_id', conversationId);

      if (error) throw error;

      return (data || []).map((p: any) => ({
        ...p,
        employee: p.employees
      })) as ChatParticipant[];
    },
    enabled: !!conversationId,
  });
};
