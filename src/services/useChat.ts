import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from './useCurrentEmployee';
import type { ChatConversation, ChatSpace, ChatMessage, ChatSpaceMember, ChatParticipant } from '@/types/chat';

// Hook to get reply counts for messages
export const useMessageReplyCounts = (conversationId: string | null, spaceId: string | null) => {
  return useQuery({
    queryKey: ['message-reply-counts', conversationId, spaceId],
    queryFn: async () => {
      if (!conversationId && !spaceId) return {};

      let query = supabase
        .from('chat_messages')
        .select('reply_to_id')
        .not('reply_to_id', 'is', null);

      if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      } else if (spaceId) {
        query = query.eq('space_id', spaceId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Count replies per parent message
      const counts: Record<string, number> = {};
      for (const msg of data || []) {
        if (msg.reply_to_id) {
          counts[msg.reply_to_id] = (counts[msg.reply_to_id] || 0) + 1;
        }
      }
      return counts;
    },
    enabled: !!conversationId || !!spaceId,
  });
};

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
            icon_url,
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

export const useSpaces = (includeArchived = false) => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['chat-spaces', currentOrg?.id, includeArchived],
    queryFn: async () => {
      if (!currentOrg?.id) return [];

      let query = supabase
        .from('chat_spaces')
        .select(`
          *,
          chat_space_members (
            id,
            employee_id
          )
        `)
        .eq('organization_id', currentOrg.id);

      // Filter out archived spaces unless explicitly requested
      if (!includeArchived) {
        query = query.is('archived_at', null);
      }

      const { data, error } = await query;

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

const MESSAGE_PAGE_SIZE = 50;

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
        .is('reply_to_id', null) // Only get top-level messages, not replies
        .order('created_at', { ascending: false })
        .limit(MESSAGE_PAGE_SIZE);

      if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      } else if (spaceId) {
        query = query.eq('space_id', spaceId);
      } else {
        return [];
      }

      const { data, error } = await query;
      if (error) throw error;

      // Reverse to show oldest first in UI (most recent at bottom)
      return ((data || []).map((msg: any) => ({
        ...msg,
        sender: msg.employees,
        attachments: msg.chat_attachments || [],
        call_log_data: msg.call_log_data || undefined,
      })) as ChatMessage[]).reverse();
    },
    enabled: !!conversationId || !!spaceId,
  });
};

// Load older messages for infinite scroll
export const useLoadOlderMessages = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      spaceId, 
      beforeDate 
    }: { 
      conversationId?: string; 
      spaceId?: string; 
      beforeDate: string;
    }) => {
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
        .is('reply_to_id', null)
        .lt('created_at', beforeDate)
        .order('created_at', { ascending: false })
        .limit(MESSAGE_PAGE_SIZE);

      if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      } else if (spaceId) {
        query = query.eq('space_id', spaceId);
      } else {
        return { messages: [], hasMore: false };
      }

      const { data, error } = await query;
      if (error) throw error;

      const messages = ((data || []).map((msg: any) => ({
        ...msg,
        sender: msg.employees,
        attachments: msg.chat_attachments || [],
        call_log_data: msg.call_log_data || undefined,
      })) as ChatMessage[]).reverse();

      return {
        messages,
        hasMore: (data || []).length >= MESSAGE_PAGE_SIZE,
      };
    },
    onSuccess: (result, variables) => {
      const { conversationId, spaceId } = variables;
      
      // Prepend older messages to the existing cache
      queryClient.setQueryData<ChatMessage[]>(
        ['chat-messages', conversationId || null, spaceId || null],
        (oldData = []) => [...result.messages, ...oldData]
      );
    },
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
    // Optimistic update: immediately add message to cache
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: ['chat-messages', variables.conversationId, variables.spaceId] 
      });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData<ChatMessage[]>(
        ['chat-messages', variables.conversationId, variables.spaceId]
      );

      // Create optimistic message
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

      // Optimistically update messages
      queryClient.setQueryData<ChatMessage[]>(
        ['chat-messages', variables.conversationId, variables.spaceId],
        (old) => [...(old || []), optimisticMessage]
      );

      return { previousMessages };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ['chat-messages', variables.conversationId, variables.spaceId],
          context.previousMessages
        );
      }
    },
    onSettled: (data, error, variables) => {
      // Replace temp message with real one or refetch if needed
      if (data && !error) {
        queryClient.setQueryData<ChatMessage[]>(
          ['chat-messages', variables.conversationId, variables.spaceId],
          (old) => {
            if (!old) return old;
            // Remove temp message and add real one (realtime will handle it, but just in case)
            const filtered = old.filter(m => !m.id.startsWith('temp-'));
            const exists = filtered.some(m => m.id === data.id);
            if (!exists) {
              // Fetch the full message with sender info
              queryClient.invalidateQueries({ 
                queryKey: ['chat-messages', variables.conversationId, variables.spaceId] 
              });
            }
            return filtered;
          }
        );
      }
      // Update conversation/space lists for last message preview
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
      iconUrl,
      isGroup = false 
    }: { 
      participantIds: string[]; 
      name?: string;
      iconUrl?: string;
      isGroup?: boolean;
    }) => {
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error('Not authenticated');

      // Create conversation
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

export const useCreateSpace = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({ 
      name, 
      description,
      iconUrl,
      spaceType = 'collaboration',
      accessScope = 'company',
      officeIds,
      projectIds,
      memberIds,
    }: { 
      name: string; 
      description?: string;
      iconUrl?: string;
      spaceType?: 'collaboration' | 'announcements';
      accessScope?: 'company' | 'offices' | 'projects' | 'members';
      officeIds?: string[];
      projectIds?: string[];
      memberIds?: string[];
    }) => {
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error('Not authenticated');

      // Pre-validate: verify the employee is active in this organization
      const { data: { user } } = await supabase.auth.getUser();
      const { data: verifyEmployee, error: verifyError } = await supabase
        .from('employees')
        .select('id, status')
        .eq('user_id', user?.id)
        .eq('organization_id', currentOrg.id)
        .single();

      if (verifyError || !verifyEmployee) {
        throw new Error('Your employee profile was not found in this organization');
      }
      
      if (verifyEmployee.status !== 'active') {
        throw new Error('Your employee profile is not active in this organization');
      }

      // Ensure we're using the correct employee ID from the verification
      const employeeId = verifyEmployee.id;

      // Determine access_type based on access_scope
      const accessType = accessScope === 'company' ? 'public' : 'private';

      // Create space using the verified employee ID
      const { data: space, error: spaceError } = await supabase
        .from('chat_spaces')
        .insert({
          organization_id: currentOrg.id,
          name,
          description: description || null,
          icon_url: iconUrl || null,
          space_type: spaceType,
          access_type: accessType,
          access_scope: accessScope,
          created_by: employeeId
        })
        .select()
        .single();

      if (spaceError) throw spaceError;

      // Creator is auto-added as admin by database trigger (trg_auto_add_space_creator)
      // No manual insert needed - this eliminates RLS recursion issues

      // Add office associations if office-wise access
      if (accessScope === 'offices' && officeIds && officeIds.length > 0) {
        const { error: officeError } = await supabase
          .from('chat_space_offices')
          .insert(
            officeIds.map(officeId => ({
              space_id: space.id,
              office_id: officeId,
              organization_id: currentOrg.id,
            }))
          );
        if (officeError) throw officeError;
      }

      // Add project associations if project-wise access
      if (accessScope === 'projects' && projectIds && projectIds.length > 0) {
        const { error: projectError } = await supabase
          .from('chat_space_projects')
          .insert(
            projectIds.map(projectId => ({
              space_id: space.id,
              project_id: projectId,
              organization_id: currentOrg.id,
            }))
          );
        if (projectError) throw projectError;
      }

      // Add member associations if members-only access
      if (accessScope === 'members' && memberIds && memberIds.length > 0) {
        const { error: membersError } = await supabase
          .from('chat_space_members')
          .insert(
            memberIds.map(empId => ({
              space_id: space.id,
              employee_id: empId,
              organization_id: currentOrg.id,
              role: 'member'
            }))
          );
        if (membersError) throw membersError;
      }

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
    // Optimistic update for immediate UI feedback
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

// Get unread counts for conversations and spaces using optimized batch function
export const useUnreadCounts = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useQuery({
    queryKey: ['unread-counts', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id || !currentEmployee?.id) return { conversations: {}, spaces: {} };

      // Use optimized database function for batch unread counts
      const { data, error } = await supabase.rpc('get_unread_counts_batch', {
        _employee_id: currentEmployee.id,
        _organization_id: currentOrg.id
      });

      if (error) {
        console.error('Error fetching unread counts:', error);
        return { conversations: {}, spaces: {} };
      }

      const conversationCounts: Record<string, number> = {};
      const spaceCounts: Record<string, number> = {};

      for (const row of data || []) {
        if (row.context_type === 'conversation') {
          conversationCounts[row.context_id] = row.unread_count;
        } else if (row.context_type === 'space') {
          spaceCounts[row.context_id] = row.unread_count;
        }
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
        archived_at: string | null;
        archived_by: string | null;
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
      queryClient.invalidateQueries({ queryKey: ['chat-all-spaces'] });
    },
  });
};

// Archive space (soft delete)
export const useArchiveSpace = () => {
  const queryClient = useQueryClient();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (spaceId: string) => {
      if (!currentEmployee?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('chat_spaces')
        .update({
          archived_at: new Date().toISOString(),
          archived_by: currentEmployee.id,
        })
        .eq('id', spaceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-spaces'] });
      queryClient.invalidateQueries({ queryKey: ['chat-space'] });
      queryClient.invalidateQueries({ queryKey: ['chat-all-spaces'] });
    },
  });
};

// Restore archived space
export const useRestoreSpace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (spaceId: string) => {
      const { error } = await supabase
        .from('chat_spaces')
        .update({
          archived_at: null,
          archived_by: null,
        })
        .eq('id', spaceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-spaces'] });
      queryClient.invalidateQueries({ queryKey: ['chat-space'] });
      queryClient.invalidateQueries({ queryKey: ['chat-all-spaces'] });
    },
  });
};

// Hook for org admins/owners to see ALL spaces in the organization
export const useAllSpaces = (includeArchived = false) => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['chat-all-spaces', currentOrg?.id, includeArchived],
    queryFn: async () => {
      if (!currentOrg?.id) return [];

      let query = supabase
        .from('chat_spaces')
        .select(`
          *,
          chat_space_members (
            id,
            employee_id,
            role
          ),
          creator:created_by (
            id,
            user_id,
            profiles:user_id (
              full_name,
              avatar_url
            )
          )
        `)
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false });

      if (!includeArchived) {
        query = query.is('archived_at', null);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((space: any) => ({
        ...space,
        member_count: space.chat_space_members?.length || 0,
        creator_name: space.creator?.profiles?.full_name || 'Unknown',
        creator_avatar: space.creator?.profiles?.avatar_url || null,
      })) as (ChatSpace & { creator_name: string; creator_avatar: string | null })[];
    },
    enabled: !!currentOrg?.id,
  });
};

// Hook to join a space as admin (for org admins/owners viewing spaces they're not members of)
export const useJoinSpaceAsAdmin = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (spaceId: string) => {
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error('Not authenticated');

      // Check if already a member
      const { data: existing } = await supabase
        .from('chat_space_members')
        .select('id')
        .eq('space_id', spaceId)
        .eq('employee_id', currentEmployee.id)
        .maybeSingle();

      if (existing) {
        // Already a member, no action needed
        return { alreadyMember: true };
      }

      const { error } = await supabase
        .from('chat_space_members')
        .insert({
          space_id: spaceId,
          employee_id: currentEmployee.id,
          organization_id: currentOrg.id,
          role: 'admin'
        });

      if (error) throw error;
      return { alreadyMember: false };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-spaces'] });
      queryClient.invalidateQueries({ queryKey: ['chat-space-members'] });
      queryClient.invalidateQueries({ queryKey: ['chat-all-spaces'] });
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

// Fetch messages where current user is mentioned
export const useMentionedMessages = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useQuery({
    queryKey: ['chat-mentioned-messages', currentOrg?.id, currentEmployee?.id],
    queryFn: async () => {
      if (!currentOrg?.id || !currentEmployee?.id) return [];

      // Get all mentions for current employee
      const { data: mentions, error: mentionsError } = await supabase
        .from('chat_mentions')
        .select('message_id')
        .eq('employee_id', currentEmployee.id)
        .eq('organization_id', currentOrg.id);

      if (mentionsError) throw mentionsError;
      if (!mentions?.length) return [];

      const messageIds = mentions.map(m => m.message_id);

      // Get full message details
      const { data: messages, error } = await supabase
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
          ),
          chat_conversations:conversation_id (
            id,
            name,
            is_group
          ),
          chat_spaces:space_id (
            id,
            name
          )
        `)
        .in('id', messageIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (messages || []).map((msg: any) => ({
        ...msg,
        sender: msg.employees,
        attachments: msg.chat_attachments || [],
        conversation: msg.chat_conversations,
        space: msg.chat_spaces
      }));
    },
    enabled: !!currentOrg?.id && !!currentEmployee?.id,
  });
};

// Fetch all starred/pinned messages for current user
export const useStarredMessages = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useQuery({
    queryKey: ['chat-starred-messages', currentOrg?.id, currentEmployee?.id],
    queryFn: async () => {
      if (!currentOrg?.id || !currentEmployee?.id) return [];

      // Get pinned messages from conversations the user is part of
      const { data: participantConvs } = await supabase
        .from('chat_participants')
        .select('conversation_id')
        .eq('employee_id', currentEmployee.id)
        .eq('organization_id', currentOrg.id);

      const { data: memberSpaces } = await supabase
        .from('chat_space_members')
        .select('space_id')
        .eq('employee_id', currentEmployee.id)
        .eq('organization_id', currentOrg.id);

      const convIds = participantConvs?.map(p => p.conversation_id) || [];
      const spaceIds = memberSpaces?.map(s => s.space_id) || [];

      if (!convIds.length && !spaceIds.length) return [];

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
          ),
          chat_conversations:conversation_id (
            id,
            name,
            is_group
          ),
          chat_spaces:space_id (
            id,
            name
          )
        `)
        .eq('is_pinned', true)
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false });

      // Filter by conversations or spaces user has access to
      if (convIds.length && spaceIds.length) {
        query = query.or(`conversation_id.in.(${convIds.join(',')}),space_id.in.(${spaceIds.join(',')})`);
      } else if (convIds.length) {
        query = query.in('conversation_id', convIds);
      } else if (spaceIds.length) {
        query = query.in('space_id', spaceIds);
      }

      const { data: messages, error } = await query;

      if (error) throw error;

      return (messages || []).map((msg: any) => ({
        ...msg,
        sender: msg.employees,
        attachments: msg.chat_attachments || [],
        conversation: msg.chat_conversations,
        space: msg.chat_spaces
      }));
    },
    enabled: !!currentOrg?.id && !!currentEmployee?.id,
  });
};

// Hook to get total unread count across all conversations and spaces
export const useTotalUnreadCount = () => {
  const { data: unreadCounts } = useUnreadCounts();

  const total = useMemo(() => {
    if (!unreadCounts) return 0;
    
    const convTotal = Object.values(unreadCounts.conversations || {}).reduce((a, b) => a + b, 0);
    const spaceTotal = Object.values(unreadCounts.spaces || {}).reduce((a, b) => a + b, 0);
    
    return convTotal + spaceTotal;
  }, [unreadCounts]);

  return { data: total };
};

// Hook to get online presence for all users in the organization
export const useOnlinePresence = () => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['online-presence', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];

      const { data, error } = await supabase
        .from('chat_presence')
        .select('employee_id, is_online, last_seen_at')
        .eq('organization_id', currentOrg.id)
        .eq('is_online', true);

      if (error) throw error;

      return data || [];
    },
    enabled: !!currentOrg?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

// Mute/Unmute a conversation
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

// Leave a group conversation
export const useLeaveConversation = () => {
  const queryClient = useQueryClient();
  const { data: currentEmployee } = useCurrentEmployee();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!currentEmployee?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('chat_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('employee_id', currentEmployee.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversations', currentOrg?.id] });
    },
  });
};

// Leave a space
export const useLeaveSpace = () => {
  const queryClient = useQueryClient();
  const { data: currentEmployee } = useCurrentEmployee();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async (spaceId: string) => {
      if (!currentEmployee?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('chat_space_members')
        .delete()
        .eq('space_id', spaceId)
        .eq('employee_id', currentEmployee.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-spaces', currentOrg?.id] });
      queryClient.invalidateQueries({ queryKey: ['chat-space-members'] });
    },
  });
};

// Update space notification setting
export const useUpdateSpaceNotification = () => {
  const queryClient = useQueryClient();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({ 
      spaceId, 
      setting 
    }: { 
      spaceId: string; 
      setting: 'all' | 'mentions' | 'mute' 
    }) => {
      if (!currentEmployee?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('chat_space_members')
        .update({ notification_setting: setting })
        .eq('space_id', spaceId)
        .eq('employee_id', currentEmployee.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-space-members'] });
      queryClient.invalidateQueries({ queryKey: ['chat-spaces'] });
    },
  });
};

// Get public spaces the user can join
export const usePublicSpaces = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useQuery({
    queryKey: ['public-spaces', currentOrg?.id, currentEmployee?.id],
    queryFn: async () => {
      if (!currentOrg?.id || !currentEmployee?.id) return [];

      // Get spaces user is already a member of
      const { data: memberSpaces } = await supabase
        .from('chat_space_members')
        .select('space_id')
        .eq('employee_id', currentEmployee.id)
        .eq('organization_id', currentOrg.id);

      const memberSpaceIds = memberSpaces?.map(s => s.space_id) || [];

      // Get all public spaces in the organization
      let query = supabase
        .from('chat_spaces')
        .select(`
          *,
          chat_space_members (
            id,
            employee_id
          )
        `)
        .eq('organization_id', currentOrg.id)
        .eq('access_type', 'public');

      // Exclude spaces user is already a member of
      if (memberSpaceIds.length > 0) {
        query = query.not('id', 'in', `(${memberSpaceIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((space: any) => ({
        ...space,
        member_count: space.chat_space_members?.length || 0
      })) as ChatSpace[];
    },
    enabled: !!currentOrg?.id && !!currentEmployee?.id,
  });
};
