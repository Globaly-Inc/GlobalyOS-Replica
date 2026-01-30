/**
 * Reaction Query and Mutation Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';

export const useMessageReactions = (conversationId: string | null, spaceId: string | null) => {
  return useQuery({
    queryKey: ['chat-reactions', conversationId, spaceId],
    queryFn: async () => {
      if (!conversationId && !spaceId) return {};

      let messagesQuery = supabase
        .from('chat_messages')
        .select('id')
        .order('created_at', { ascending: true });

      if (conversationId) {
        messagesQuery = messagesQuery.eq('conversation_id', conversationId);
      } else if (spaceId) {
        messagesQuery = messagesQuery.eq('space_id', spaceId);
      }

      const { data: messages } = await messagesQuery;
      if (!messages?.length) return {};

      const messageIds = messages.map(m => m.id);

      const { data: reactions, error } = await supabase
        .from('chat_message_reactions')
        .select(`
          id,
          message_id,
          employee_id,
          emoji,
          employees:employee_id (
            id,
            profiles:user_id (
              full_name,
              avatar_url
            )
          )
        `)
        .in('message_id', messageIds);

      if (error) throw error;

      const groupedReactions: Record<string, Record<string, { emoji: string; users: { id: string; name: string; avatar?: string }[] }>> = {};

      for (const reaction of reactions || []) {
        if (!groupedReactions[reaction.message_id]) {
          groupedReactions[reaction.message_id] = {};
        }
        if (!groupedReactions[reaction.message_id][reaction.emoji]) {
          groupedReactions[reaction.message_id][reaction.emoji] = {
            emoji: reaction.emoji,
            users: []
          };
        }
        groupedReactions[reaction.message_id][reaction.emoji].users.push({
          id: reaction.employee_id,
          name: reaction.employees?.profiles?.full_name || 'Unknown',
          avatar: reaction.employees?.profiles?.avatar_url
        });
      }

      return groupedReactions;
    },
    enabled: !!conversationId || !!spaceId,
  });
};

export const useToggleReaction = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('chat_message_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('employee_id', currentEmployee.id)
        .eq('emoji', emoji)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('chat_message_reactions')
          .delete()
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('chat_message_reactions')
          .insert({
            message_id: messageId,
            employee_id: currentEmployee.id,
            organization_id: currentOrg.id,
            emoji
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-reactions'] });
    },
  });
};
