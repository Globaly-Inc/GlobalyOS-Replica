import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WaFlow, WaFlowSubmission } from '@/types/whatsapp';

export function useWaFlows(orgId: string | undefined) {
  return useQuery({
    queryKey: ['wa-flows', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wa_flows')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as WaFlow[];
    },
  });
}

export function useWaFlow(flowId: string | undefined) {
  return useQuery({
    queryKey: ['wa-flow', flowId],
    enabled: !!flowId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wa_flows')
        .select('*')
        .eq('id', flowId!)
        .single();
      if (error) throw error;
      return data as unknown as WaFlow;
    },
  });
}

export function useCreateWaFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      name: string;
      description?: string;
      screens: unknown[];
      field_mapping: unknown[];
    }) => {
      const { data, error } = await supabase
        .from('wa_flows')
        .insert(params as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa-flows'] });
    },
  });
}

export function useUpdateWaFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; [key: string]: unknown }) => {
      const { id, ...updates } = params;
      const { error } = await supabase
        .from('wa_flows')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa-flows'] });
      qc.invalidateQueries({ queryKey: ['wa-flow'] });
    },
  });
}

export function useDeleteWaFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('wa_flows').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa-flows'] });
    },
  });
}

export function useWaFlowSubmissions(flowId: string | undefined) {
  return useQuery({
    queryKey: ['wa-flow-submissions', flowId],
    enabled: !!flowId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wa_flow_submissions')
        .select('*')
        .eq('flow_id', flowId!)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as WaFlowSubmission[];
    },
  });
}
