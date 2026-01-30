/**
 * Conversation Mutation Hooks
 * Create, update, leave, mute conversations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';

export const useCreateConversation = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({ 
      participantIds, 
      name,
      iconUrl,
      isGroup = false 
    }: { 
      participantIds: string[]; 
      name?: string;
      iconUrl?: string;
      isGroup?: boolean;
    }) => {
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error('Not authenticated');

      const { data: conversation, error: convError } = await supabase
        .from('chat_conversations')
        .insert({
          organization_id: currentOrg.id,
          name: name || null,
          icon_url: iconUrl || null,
          is_group: isGroup,
          created_by: currentEmployee.id
        })
        .select()
        .single();

      if (convError) throw convError;

      const allParticipants = [...new Set([currentEmployee.id, ...participantIds])];
      const { error: partError } = await supabase
        .from('chat_participants')
        .insert(
          allParticipants.map(empId => ({
            conversation_id: conversation.id,
            employee_id: empId,
            organization_id: currentOrg.id,
            role: empId === currentEmployee.id && isGroup ? 'admin' : 'member'
          }))
        );

      if (partError) throw partError;

      return conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    },
  });
};

export const useUpdateConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      name,
      iconUrl 
    }: { 
      conversationId: string;
      name?: string;
      iconUrl?: string;
    }) => {
      const updates: Record<string, any> = {};
      if (name !== undefined) updates.name = name;
      if (iconUrl !== undefined) updates.icon_url = iconUrl;

      const { data, error } = await supabase
        .from('chat_conversations')
        .update(updates)
        .eq('id', conversationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    },
  });
};

export const useMuteConversation = () => {
  const queryClient = useQueryClient();
  const { data: currentEmployee } = useCurrentEmployee();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async ({ conversationId, mute }: { conversationId: string; mute: boolean }) => {
      if (!currentEmployee?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('chat_participants')
        .update({ is_muted: mute })
        .eq('conversation_id', conversationId)
        .eq('employee_id', currentEmployee.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversations', currentOrg?.id] });
    },
  });
};

export const useLeaveConversation = () => {
  const queryClient = useQueryClient();
  const { data: currentEmployee } = useCurrentEmployee();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      transferAdminTo 
    }: { 
      conversationId: string; 
      transferAdminTo?: string 
    }) => {
      if (!currentEmployee?.id || !currentOrg?.id) throw new Error('Not authenticated');

      const leavingEmployeeName = currentEmployee.profiles?.full_name || 'Someone';

      if (transferAdminTo) {
        const { error: transferError } = await supabase
          .from('chat_participants')
          .update({ role: 'admin' })
          .eq('conversation_id', conversationId)
          .eq('employee_id', transferAdminTo);

        if (transferError) throw transferError;
      }

      await supabase.from('chat_messages').insert({
        organization_id: currentOrg.id,
        conversation_id: conversationId,
        sender_id: currentEmployee.id,
        content: `${leavingEmployeeName} left the group`,
        content_type: 'system_event',
        system_event_data: {
          event_type: 'member_left',
          target_employee_id: currentEmployee.id,
          target_name: leavingEmployeeName
        }
      });

      const { error } = await supabase
        .from('chat_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('employee_id', currentEmployee.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversations', currentOrg?.id] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversation-participants'] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    },
  });
};
