import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from './useCurrentEmployee';
import type { ChatConversation, ChatSpace, ChatMessage, ChatSpaceMember, ChatParticipant } from '@/types/chat';

export const useConversations = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useQuery({
    queryKey: ['chat-conversations', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id || !currentEmployee?.id) return [];

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
            is_group,
            created_by,
            created_at,
            updated_at
          )
        `)
        .eq('employee_id', currentEmployee.id)
        .eq('organization_id', currentOrg.id);

      if (error) throw error;

      // Get participants for each conversation
      const conversations = await Promise.all(
        (data || []).map(async (item: any) => {
          const conv = item.chat_conversations;
          
          const { data: participants } = await supabase
            .from('chat_participants')
            .select(`
              id,
              employee_id,
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
            .eq('conversation_id', conv.id);

          // Get last message
          const { data: messages } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            ...conv,
            participants: participants?.map((p: any) => ({
              ...p,
              employee: p.employees
            })),
            last_message: messages?.[0],
            last_read_at: item.last_read_at,
            is_muted: item.is_muted
          } as ChatConversation;
        })
      );

      return conversations;
    },
    enabled: !!currentOrg?.id && !!currentEmployee?.id,
  });
};

export const useSpaces = () => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['chat-spaces', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];

      const { data, error } = await supabase
        .from('chat_spaces')
        .select(`
          *,
          chat_space_members (
            id,
            employee_id
          )
        `)
        .eq('organization_id', currentOrg.id);

      if (error) throw error;

      return (data || []).map((space: any) => ({
        ...space,
        member_count: space.chat_space_members?.length || 0
      })) as ChatSpace[];
    },
    enabled: !!currentOrg?.id,
  });
};

export const useSpaceMembers = (spaceId: string | null) => {
  return useQuery({
    queryKey: ['chat-space-members', spaceId],
    queryFn: async () => {
      if (!spaceId) return [];

      const { data, error } = await supabase
        .from('chat_space_members')
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
        .eq('space_id', spaceId);

      if (error) throw error;

      return (data || []).map((member: any) => ({
        ...member,
        employee: member.employees
      })) as ChatSpaceMember[];
    },
    enabled: !!spaceId,
  });
};

export const useMessages = (conversationId: string | null, spaceId: string | null) => {
  return useQuery({
    queryKey: ['chat-messages', conversationId, spaceId],
    queryFn: async () => {
      let query = supabase
        .from('chat_messages')
        .select(`
          *,
          employees:sender_id (
            id,
            user_id,
            position,
            profiles:user_id (
              full_name,
              avatar_url
            )
          )
        `)
        .order('created_at', { ascending: true });

      if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      } else if (spaceId) {
        query = query.eq('space_id', spaceId);
      } else {
        return [];
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((msg: any) => ({
        ...msg,
        sender: msg.employees
      })) as ChatMessage[];
    },
    enabled: !!conversationId || !!spaceId,
  });
};

export const usePinnedMessages = (conversationId: string | null, spaceId: string | null) => {
  return useQuery({
    queryKey: ['chat-pinned-messages', conversationId, spaceId],
    queryFn: async () => {
      let query = supabase
        .from('chat_messages')
        .select(`
          *,
          employees:sender_id (
            id,
            user_id,
            position,
            profiles:user_id (
              full_name,
              avatar_url
            )
          )
        `)
        .eq('is_pinned', true)
        .order('created_at', { ascending: false });

      if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      } else if (spaceId) {
        query = query.eq('space_id', spaceId);
      } else {
        return [];
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((msg: any) => ({
        ...msg,
        sender: msg.employees
      })) as ChatMessage[];
    },
    enabled: !!conversationId || !!spaceId,
  });
};

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

      // Insert attachments if any
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['chat-messages', variables.conversationId, variables.spaceId] 
      });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['chat-spaces'] });
    },
  });
};

export const useCreateConversation = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({ 
      participantIds, 
      name,
      isGroup = false 
    }: { 
      participantIds: string[]; 
      name?: string;
      isGroup?: boolean;
    }) => {
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error('Not authenticated');

      // Create conversation
      const { data: conversation, error: convError } = await supabase
        .from('chat_conversations')
        .insert({
          organization_id: currentOrg.id,
          name: name || null,
          is_group: isGroup,
          created_by: currentEmployee.id
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add all participants including creator
      const allParticipants = [...new Set([currentEmployee.id, ...participantIds])];
      const { error: partError } = await supabase
        .from('chat_participants')
        .insert(
          allParticipants.map(empId => ({
            conversation_id: conversation.id,
            employee_id: empId,
            organization_id: currentOrg.id
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

export const useCreateSpace = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({ 
      name, 
      description,
      spaceType = 'collaboration',
      accessType = 'public'
    }: { 
      name: string; 
      description?: string;
      spaceType?: 'collaboration' | 'announcements';
      accessType?: 'public' | 'private';
    }) => {
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error('Not authenticated');

      // Create space
      const { data: space, error: spaceError } = await supabase
        .from('chat_spaces')
        .insert({
          organization_id: currentOrg.id,
          name,
          description: description || null,
          space_type: spaceType,
          access_type: accessType,
          created_by: currentEmployee.id
        })
        .select()
        .single();

      if (spaceError) throw spaceError;

      // Add creator as admin
      const { error: memberError } = await supabase
        .from('chat_space_members')
        .insert({
          space_id: space.id,
          employee_id: currentEmployee.id,
          organization_id: currentOrg.id,
          role: 'admin'
        });

      if (memberError) throw memberError;

      return space;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-spaces'] });
    },
  });
};

export const useJoinSpace = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (spaceId: string) => {
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('chat_space_members')
        .insert({
          space_id: spaceId,
          employee_id: currentEmployee.id,
          organization_id: currentOrg.id,
          role: 'member'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-spaces'] });
      queryClient.invalidateQueries({ queryKey: ['chat-space-members'] });
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
