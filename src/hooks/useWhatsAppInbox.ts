import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import type { WaConversation, WaMessage, WaContact } from '@/types/whatsapp';

export function useWaConversations(orgId: string | undefined) {
  return useQuery({
    queryKey: ['wa-conversations', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wa_conversations')
        .select('*, wa_contacts(*)')
        .eq('organization_id', orgId!)
        .order('last_message_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as (WaConversation & { wa_contacts: WaContact })[];
    },
  });
}

export function useWaMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['wa-messages', conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wa_messages')
        .select('*')
        .eq('conversation_id', conversationId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as WaMessage[];
    },
  });
}

export function useWaContact(contactId: string | undefined) {
  return useQuery({
    queryKey: ['wa-contact', contactId],
    enabled: !!contactId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wa_contacts')
        .select('*')
        .eq('id', contactId!)
        .single();
      if (error) throw error;
      return data as WaContact;
    },
  });
}

export function useSendWaMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      conversationId: string;
      orgId: string;
      contactPhone: string;
      phoneNumberId: string;
      body: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('wa-send', {
        body: {
          organization_id: params.orgId,
          phone_number_id: params.phoneNumberId,
          to: params.contactPhone,
          type: 'text',
          text: { body: params.body },
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['wa-messages', vars.conversationId] });
      qc.invalidateQueries({ queryKey: ['wa-conversations'] });
    },
  });
}

export function useAssignConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { conversationId: string; assignTo: string | null }) => {
      const { error } = await supabase
        .from('wa_conversations')
        .update({
          assigned_to: params.assignTo,
          assigned_at: params.assignTo ? new Date().toISOString() : null,
          status: params.assignTo ? 'assigned' : 'open',
        })
        .eq('id', params.conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa-conversations'] });
    },
  });
}

export function useResolveConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('wa_conversations')
        .update({ status: 'resolved' })
        .eq('id', conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa-conversations'] });
    },
  });
}

export function useWaRealtimeInbox(orgId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel(`wa-inbox-${orgId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wa_conversations',
          filter: `organization_id=eq.${orgId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['wa-conversations', orgId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wa_messages',
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) => {
          const msg = payload.new as WaMessage;
          qc.invalidateQueries({ queryKey: ['wa-messages', msg.conversation_id] });
          qc.invalidateQueries({ queryKey: ['wa-conversations', orgId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, qc]);
}
