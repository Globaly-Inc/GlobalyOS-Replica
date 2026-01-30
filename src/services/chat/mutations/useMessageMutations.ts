/**
 * Message Mutation Hooks
 * Send, edit, delete, pin messages
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';
import type { ChatMessage } from '@/types/chat';

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({ 
      content, 
      conversationId, 
      spaceId,
      attachments = []
    }: { 
      content: string; 
      conversationId?: string; 
      spaceId?: string;
      attachments?: { fileName: string; filePath: string; fileSize: number; fileType: string }[];
    }) => {
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error('Not authenticated');

      const contentType = attachments.length > 0 ? 'file' : 'text';

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          organization_id: currentOrg.id,
          conversation_id: conversationId || null,
          space_id: spaceId || null,
          sender_id: currentEmployee.id,
          content,
          content_type: contentType
        })
        .select()
        .single();

      if (error) throw error;

      if (attachments.length > 0) {
        const { error: attachError } = await supabase
          .from('chat_attachments')
          .insert(
            attachments.map(att => ({
              message_id: data.id,
              organization_id: currentOrg.id,
              file_name: att.fileName,
              file_path: att.filePath,
              file_size: att.fileSize,
              file_type: att.fileType
            }))
          );

        if (attachError) throw attachError;
      }

      return data;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ 
        queryKey: ['chat-messages', variables.conversationId, variables.spaceId] 
      });

      const previousMessages = queryClient.getQueryData<ChatMessage[]>(
        ['chat-messages', variables.conversationId, variables.spaceId]
      );

      const optimisticMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        organization_id: currentOrg?.id || '',
        conversation_id: variables.conversationId || null,
        space_id: variables.spaceId || null,
        sender_id: currentEmployee?.id || '',
        content: variables.content,
        content_type: variables.attachments?.length ? 'file' : 'text',
        is_pinned: false,
        reply_to_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender: currentEmployee ? {
          id: currentEmployee.id,
          user_id: currentEmployee.user_id,
          position: currentEmployee.position,
          profiles: {
            full_name: currentEmployee.profiles?.full_name || '',
            avatar_url: currentEmployee.profiles?.avatar_url || null
          }
        } : undefined,
        attachments: variables.attachments?.map((att, i) => ({
          id: `temp-att-${i}`,
          message_id: `temp-${Date.now()}`,
          organization_id: currentOrg?.id || '',
          file_name: att.fileName,
          file_path: att.filePath,
          file_type: att.fileType,
          file_size: att.fileSize,
          created_at: new Date().toISOString()
        })) || []
      };

      queryClient.setQueryData<ChatMessage[]>(
        ['chat-messages', variables.conversationId, variables.spaceId],
        (old) => [...(old || []), optimisticMessage]
      );

      return { previousMessages };
    },
    onError: (err, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ['chat-messages', variables.conversationId, variables.spaceId],
          context.previousMessages
        );
      }
    },
    onSettled: (data, error, variables) => {
      if (data && !error) {
        queryClient.setQueryData<ChatMessage[]>(
          ['chat-messages', variables.conversationId, variables.spaceId],
          (old) => {
            if (!old) return old;
            const filtered = old.filter(m => !m.id.startsWith('temp-'));
            const exists = filtered.some(m => m.id === data.id);
            if (!exists) {
              queryClient.invalidateQueries({ 
                queryKey: ['chat-messages', variables.conversationId, variables.spaceId] 
              });
            }
            return filtered;
          }
        );

        if (currentEmployee?.id) {
          supabase.functions.invoke("send-chat-push-notification", {
            body: {
              message_id: data.id,
              sender_employee_id: currentEmployee.id,
              conversation_id: variables.conversationId || undefined,
              space_id: variables.spaceId || undefined,
              content: variables.content,
              content_type: variables.attachments?.length ? 'file' : 'text',
            },
          }).catch(err => console.error("Push notification error:", err));
        }
      }
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['chat-spaces'] });
    },
  });
};

export const useEditMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      const { error } = await supabase
        .from('chat_messages')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    },
  });
};

export const useDeleteMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['chat-pinned-messages'] });
    },
  });
};

export const useTogglePinMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, isPinned }: { messageId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_pinned: !isPinned })
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['chat-pinned-messages'] });
    },
  });
};

export const useMarkAsRead = () => {
  const { data: currentEmployee } = useCurrentEmployee();
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, spaceId }: { conversationId?: string; spaceId?: string }) => {
      if (!currentEmployee?.id) throw new Error('Not authenticated');

      if (conversationId) {
        const { error } = await supabase
          .from('chat_participants')
          .update({ last_read_at: new Date().toISOString() })
          .eq('conversation_id', conversationId)
          .eq('employee_id', currentEmployee.id);

        if (error) throw error;
      } else if (spaceId) {
        const { error } = await supabase
          .from('chat_space_members')
          .update({ last_read_at: new Date().toISOString() })
          .eq('space_id', spaceId)
          .eq('employee_id', currentEmployee.id);

        if (error) throw error;
      }
    },
    onMutate: async ({ conversationId, spaceId }) => {
      await queryClient.cancelQueries({ queryKey: ['unread-counts', currentOrg?.id] });
      
      const previousCounts = queryClient.getQueryData(['unread-counts', currentOrg?.id]);
      
      queryClient.setQueryData(['unread-counts', currentOrg?.id], (old: any) => {
        if (!old) return old;
        return {
          conversations: conversationId 
            ? { ...old.conversations, [conversationId]: 0 }
            : old.conversations,
          spaces: spaceId
            ? { ...old.spaces, [spaceId]: 0 }
            : old.spaces,
        };
      });
      
      return { previousCounts };
    },
    onError: (err, variables, context) => {
      if (context?.previousCounts) {
        queryClient.setQueryData(['unread-counts', currentOrg?.id], context.previousCounts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['chat-spaces'] });
      queryClient.invalidateQueries({ queryKey: ['unread-counts'] });
    },
  });
};

export const useSaveMentions = () => {
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async ({ messageId, employeeIds }: { messageId: string; employeeIds: string[] }) => {
      if (!currentOrg?.id || employeeIds.length === 0) return;

      const mentions = employeeIds.map(employeeId => ({
        message_id: messageId,
        employee_id: employeeId,
        organization_id: currentOrg.id,
      }));

      const { error } = await supabase
        .from('chat_mentions')
        .insert(mentions);

      if (error) throw error;
    },
  });
};
