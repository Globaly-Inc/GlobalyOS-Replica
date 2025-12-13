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
          ),
          chat_attachments (
            id,
            file_name,
            file_path,
            file_type,
            file_size,
            created_at
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
        sender: msg.employees,
        attachments: msg.chat_attachments || []
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

// Typing indicator hooks
export const useTypingIndicator = () => {
  const { data: currentEmployee } = useCurrentEmployee();
  const { currentOrg } = useOrganization();

  const updateTypingStatus = async (conversationId: string | null, spaceId: string | null) => {
    if (!currentEmployee?.id || !currentOrg?.id) return;

    await supabase
      .from('chat_presence')
      .upsert({
        employee_id: currentEmployee.id,
        organization_id: currentOrg.id,
        typing_in_conversation_id: conversationId,
        typing_in_space_id: spaceId,
        is_online: true,
        last_seen_at: new Date().toISOString()
      }, { onConflict: 'employee_id' });
  };

  const clearTypingStatus = async () => {
    if (!currentEmployee?.id) return;

    await supabase
      .from('chat_presence')
      .update({
        typing_in_conversation_id: null,
        typing_in_space_id: null
      })
      .eq('employee_id', currentEmployee.id);
  };

  return { updateTypingStatus, clearTypingStatus };
};

export const useTypingUsers = (conversationId: string | null, spaceId: string | null) => {
  const { data: currentEmployee } = useCurrentEmployee();

  return useQuery({
    queryKey: ['typing-users', conversationId, spaceId],
    queryFn: async () => {
      if (!conversationId && !spaceId) return [];

      let query = supabase
        .from('chat_presence')
        .select(`
          employee_id,
          employees:employee_id (
            id,
            profiles:user_id (
              full_name
            )
          )
        `)
        .neq('employee_id', currentEmployee?.id || '');

      if (conversationId) {
        query = query.eq('typing_in_conversation_id', conversationId);
      } else if (spaceId) {
        query = query.eq('typing_in_space_id', spaceId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((p: any) => ({
        employeeId: p.employee_id,
        name: p.employees?.profiles?.full_name || 'Someone'
      }));
    },
    enabled: (!!conversationId || !!spaceId) && !!currentEmployee?.id,
    refetchInterval: 3000, // Poll every 3 seconds as fallback
  });
};

// Update last_read_at when viewing a conversation
export const useMarkAsRead = () => {
  const { data: currentEmployee } = useCurrentEmployee();
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['chat-spaces'] });
      queryClient.invalidateQueries({ queryKey: ['unread-counts'] });
    },
  });
};

// Get unread counts for conversations
export const useUnreadCounts = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useQuery({
    queryKey: ['unread-counts', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id || !currentEmployee?.id) return { conversations: {}, spaces: {} };

      // Get conversation unread counts
      const { data: participants } = await supabase
        .from('chat_participants')
        .select('conversation_id, last_read_at')
        .eq('employee_id', currentEmployee.id)
        .eq('organization_id', currentOrg.id);

      const conversationCounts: Record<string, number> = {};
      
      for (const p of participants || []) {
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', p.conversation_id)
          .gt('created_at', p.last_read_at || '1970-01-01');

        conversationCounts[p.conversation_id] = count || 0;
      }

      // Get space unread counts
      const { data: memberships } = await supabase
        .from('chat_space_members')
        .select('space_id, last_read_at')
        .eq('employee_id', currentEmployee.id)
        .eq('organization_id', currentOrg.id);

      const spaceCounts: Record<string, number> = {};

      for (const m of memberships || []) {
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('space_id', m.space_id)
          .gt('created_at', m.last_read_at || '1970-01-01');

        spaceCounts[m.space_id] = count || 0;
      }

      return { conversations: conversationCounts, spaces: spaceCounts };
    },
    enabled: !!currentOrg?.id && !!currentEmployee?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

// Edit message hook
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

// Delete message hook
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

// Message reactions hooks
export const useMessageReactions = (conversationId: string | null, spaceId: string | null) => {
  return useQuery({
    queryKey: ['chat-reactions', conversationId, spaceId],
    queryFn: async () => {
      if (!conversationId && !spaceId) return {};

      // Get all message IDs for this conversation/space
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

      // Group reactions by message_id and emoji
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

      // Check if reaction exists
      const { data: existing } = await supabase
        .from('chat_message_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('employee_id', currentEmployee.id)
        .eq('emoji', emoji)
        .maybeSingle();

      if (existing) {
        // Remove reaction
        const { error } = await supabase
          .from('chat_message_reactions')
          .delete()
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Add reaction
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

// Save mentions for a message
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

// Get single space details
export const useSpace = (spaceId: string | null) => {
  return useQuery({
    queryKey: ['chat-space', spaceId],
    queryFn: async () => {
      if (!spaceId) return null;

      const { data, error } = await supabase
        .from('chat_spaces')
        .select('*')
        .eq('id', spaceId)
        .single();

      if (error) throw error;

      return data as {
        id: string;
        name: string;
        description: string | null;
        space_type: 'collaboration' | 'announcements';
        access_type: 'public' | 'private';
      };
    },
    enabled: !!spaceId,
  });
};

// Update space settings
export const useUpdateSpace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      spaceId,
      name,
      description,
      spaceType,
    }: {
      spaceId: string;
      name: string;
      description?: string | null;
      spaceType: 'collaboration' | 'announcements';
    }) => {
      const { error } = await supabase
        .from('chat_spaces')
        .update({
          name,
          description,
          space_type: spaceType,
          updated_at: new Date().toISOString(),
        })
        .eq('id', spaceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-spaces'] });
      queryClient.invalidateQueries({ queryKey: ['chat-space'] });
    },
  });
};

// Delete space
export const useDeleteSpace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (spaceId: string) => {
      const { error } = await supabase
        .from('chat_spaces')
        .delete()
        .eq('id', spaceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-spaces'] });
    },
  });
};

// Add members to space
export const useAddSpaceMembers = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async ({
      spaceId,
      employeeIds,
    }: {
      spaceId: string;
      employeeIds: string[];
    }) => {
      if (!currentOrg?.id) throw new Error('Not authenticated');

      const members = employeeIds.map((empId) => ({
        space_id: spaceId,
        employee_id: empId,
        organization_id: currentOrg.id,
        role: 'member' as const,
      }));

      const { error } = await supabase
        .from('chat_space_members')
        .insert(members);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-space-members'] });
      queryClient.invalidateQueries({ queryKey: ['chat-spaces'] });
    },
  });
};

// Update space member role
export const useUpdateSpaceMemberRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      spaceId,
      employeeId,
      role,
    }: {
      spaceId: string;
      employeeId: string;
      role: 'admin' | 'member';
    }) => {
      const { error } = await supabase
        .from('chat_space_members')
        .update({ role })
        .eq('space_id', spaceId)
        .eq('employee_id', employeeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-space-members'] });
    },
  });
};

// Remove member from space
export const useRemoveSpaceMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      spaceId,
      employeeId,
    }: {
      spaceId: string;
      employeeId: string;
    }) => {
      const { error } = await supabase
        .from('chat_space_members')
        .delete()
        .eq('space_id', spaceId)
        .eq('employee_id', employeeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-space-members'] });
      queryClient.invalidateQueries({ queryKey: ['chat-spaces'] });
    },
  });
};
