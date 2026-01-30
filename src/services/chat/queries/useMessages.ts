/**
 * Message Query Hooks
 * Fetches messages, pinned messages, starred messages, and mentions
 */

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';
import type { ChatMessage } from '@/types/chat';

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
        .is('reply_to_id', null)
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

export const useMentionedMessages = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useQuery({
    queryKey: ['chat-mentioned-messages', currentOrg?.id, currentEmployee?.id],
    queryFn: async () => {
      if (!currentOrg?.id || !currentEmployee?.id) return [];

      const { data: mentions, error: mentionsError } = await supabase
        .from('chat_mentions')
        .select('message_id')
        .eq('employee_id', currentEmployee.id)
        .eq('organization_id', currentOrg.id);

      if (mentionsError) throw mentionsError;
      if (!mentions?.length) return [];

      const messageIds = mentions.map(m => m.message_id);

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

export const useStarredMessages = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useQuery({
    queryKey: ['starred-messages', currentOrg?.id, currentEmployee?.id],
    queryFn: async () => {
      if (!currentOrg?.id || !currentEmployee?.id) return [];

      const { data: stars, error: starsError } = await supabase
        .from('chat_message_stars')
        .select('message_id')
        .eq('employee_id', currentEmployee.id)
        .eq('organization_id', currentOrg.id);

      if (starsError) throw starsError;
      if (!stars || stars.length === 0) return [];

      const messageIds = stars.map(s => s.message_id);

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
        .eq('organization_id', currentOrg.id)
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

export const useUnreadMessages = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useQuery({
    queryKey: ['unread-messages', currentOrg?.id, currentEmployee?.id],
    queryFn: async () => {
      if (!currentOrg?.id || !currentEmployee?.id) return [];

      const { data, error } = await supabase.rpc('get_unread_messages', {
        p_employee_id: currentEmployee.id,
        p_organization_id: currentOrg.id,
        p_limit: 50
      });

      if (error) throw error;

      return (data || []).map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        content_type: msg.content_type,
        created_at: msg.created_at,
        conversation_id: msg.conversation_id,
        space_id: msg.space_id,
        sender: {
          profiles: {
            full_name: msg.sender_full_name,
            avatar_url: msg.sender_avatar_url
          }
        },
        conversation: msg.conversation_id ? {
          id: msg.conversation_id,
          name: msg.conversation_name,
          is_group: msg.conversation_is_group
        } : null,
        space: msg.space_id ? {
          id: msg.space_id,
          name: msg.space_name,
          icon_url: msg.space_icon_url
        } : null
      }));
    },
    enabled: !!currentOrg?.id && !!currentEmployee?.id,
    staleTime: 30 * 1000,
    refetchInterval: 30000,
  });
};

export const useUnreadCounts = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useQuery({
    queryKey: ['unread-counts', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id || !currentEmployee?.id) return { conversations: {}, spaces: {} };

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
    staleTime: 10000,
    gcTime: 2 * 60 * 1000,
    refetchInterval: 60000,
  });
};

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
