import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import type {
  InboxConversation,
  InboxMessage,
  InboxContact,
  InboxChannel,
  InboxConversationStatus,
  InboxChannelType,
} from '@/types/inbox';

export function useInboxConversations(filters?: {
  status?: InboxConversationStatus;
  channelType?: InboxChannelType;
  assignedTo?: string;
  search?: string;
}) {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['inbox-conversations', currentOrg?.id, filters],
    enabled: !!currentOrg?.id,
    queryFn: async () => {
      let query = supabase
        .from('inbox_conversations')
        .select('*, inbox_contacts(*)')
        .eq('organization_id', currentOrg!.id)
        .order('last_message_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.channelType && filters.channelType !== 'sms') {
        query = query.eq('channel_type', filters.channelType as Exclude<InboxChannelType, 'sms'>);
      }
      if (filters?.assignedTo === '__UNASSIGNED__') {
        query = query.is('assigned_to', null);
      } else if (filters?.assignedTo === 'CURRENT_USER') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) query = query.eq('assigned_to', user.id);
      } else if (filters?.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as (InboxConversation & { inbox_contacts: InboxContact })[];
    },
  });
}

export function useInboxMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['inbox-messages', conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inbox_messages')
        .select('*')
        .eq('conversation_id', conversationId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as InboxMessage[];
    },
  });
}

export function useInboxChannels() {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['inbox-channels', currentOrg?.id],
    enabled: !!currentOrg?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inbox_channels')
        .select('*')
        .eq('organization_id', currentOrg!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as InboxChannel[];
    },
  });
}

export function useSendInboxMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      conversationId: string;
      orgId: string;
      content: string;
      msgType?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('inbox-send', {
        body: {
          conversation_id: params.conversationId,
          organization_id: params.orgId,
          content: { body: params.content },
          msg_type: params.msgType || 'text',
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['inbox-messages', vars.conversationId] });
      qc.invalidateQueries({ queryKey: ['inbox-conversations'] });
    },
  });
}

export function useUpdateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      conversationId: string;
      updates: Partial<Pick<InboxConversation, 'status' | 'assigned_to' | 'priority' | 'tags' | 'notes' | 'snoozed_until'>>;
    }) => {
      const updateData: Record<string, unknown> = { ...params.updates };
      if (params.updates.assigned_to !== undefined) {
        updateData.assigned_at = params.updates.assigned_to ? new Date().toISOString() : null;
      }
      if (params.updates.status === 'closed') {
        updateData.resolved_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from('inbox_conversations')
        .update(updateData)
        .eq('id', params.conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox-conversations'] });
    },
  });
}

export function useInboxAIDraft() {
  return useMutation({
    mutationFn: async (params: {
      conversationId: string;
      orgId: string;
      messages: { role: string; content: string }[];
    }) => {
      const { data, error } = await supabase.functions.invoke('inbox-ai-respond', {
        body: {
          conversation_id: params.conversationId,
          organization_id: params.orgId,
          messages: params.messages,
          mode: 'draft',
        },
      });
      if (error) throw error;
      return data as { reply: string; confidence: number; citations: string[] };
    },
  });
}
