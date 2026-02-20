import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

export interface CallQueue {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  strategy: string;
  max_wait_seconds: number;
  max_queue_size: number;
  hold_music_url: string | null;
  hold_message: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CallQueueMember {
  id: string;
  queue_id: string;
  organization_id: string;
  employee_id: string;
  priority: number;
  is_available: boolean;
  created_at: string;
}

export function useCallQueues() {
  const { currentOrg } = useOrganization();
  return useQuery({
    queryKey: ['call-queues', currentOrg?.id],
    enabled: !!currentOrg?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_queues')
        .select('*')
        .eq('organization_id', currentOrg!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CallQueue[];
    },
  });
}

export function useQueueMembers(queueId?: string) {
  const { currentOrg } = useOrganization();
  return useQuery({
    queryKey: ['queue-members', queueId],
    enabled: !!queueId && !!currentOrg?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_queue_members')
        .select('*')
        .eq('queue_id', queueId!)
        .eq('organization_id', currentOrg!.id)
        .order('priority', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CallQueueMember[];
    },
  });
}

export function useCreateQueue() {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  return useMutation({
    mutationFn: async (params: Partial<CallQueue>) => {
      const { data, error } = await supabase
        .from('call_queues')
        .insert({ organization_id: currentOrg!.id, ...params } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['call-queues'] });
      toast.success('Call queue created');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CallQueue>) => {
      const { error } = await supabase.from('call_queues').update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['call-queues'] });
      toast.success('Queue updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAddQueueMember() {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  return useMutation({
    mutationFn: async (params: { queue_id: string; employee_id: string; priority?: number }) => {
      const { error } = await supabase.from('call_queue_members').insert({
        organization_id: currentOrg!.id,
        ...params,
      } as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['queue-members', vars.queue_id] });
      toast.success('Member added to queue');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRemoveQueueMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, queueId }: { id: string; queueId: string }) => {
      const { error } = await supabase.from('call_queue_members').delete().eq('id', id);
      if (error) throw error;
      return queueId;
    },
    onSuccess: (queueId) => {
      qc.invalidateQueries({ queryKey: ['queue-members', queueId] });
      toast.success('Member removed from queue');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
