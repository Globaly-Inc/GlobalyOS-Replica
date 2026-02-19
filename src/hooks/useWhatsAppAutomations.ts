import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WaAutomation, WaContact } from '@/types/whatsapp';

// ── Automations ──

export function useWaAutomations(orgId: string | undefined) {
  return useQuery({
    queryKey: ['wa-automations', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wa_automations')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as WaAutomation[];
    },
  });
}

export function useCreateWaAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      name: string;
      description?: string;
      trigger_type: string;
      trigger_config: Record<string, unknown>;
      nodes: unknown[];
      edges: unknown[];
    }) => {
      const { data, error } = await supabase
        .from('wa_automations')
        .insert({
          ...params,
          status: 'draft' as any,
          version: 1,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa-automations'] });
    },
  });
}

export function useUpdateWaAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; [key: string]: unknown }) => {
      const { id, ...updates } = params;
      const { error } = await supabase
        .from('wa_automations')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa-automations'] });
    },
  });
}

export function useDeleteWaAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('wa_automations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa-automations'] });
    },
  });
}

// ── Contacts ──

export function useWaContacts(orgId: string | undefined) {
  return useQuery({
    queryKey: ['wa-contacts', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wa_contacts')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as WaContact[];
    },
  });
}

export function useUpdateWaContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; [key: string]: unknown }) => {
      const { id, ...updates } = params;
      const { error } = await supabase
        .from('wa_contacts')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa-contacts'] });
    },
  });
}

export function useCreateWaContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      phone: string;
      name?: string;
      tags?: string[];
      opt_in_status?: string;
    }) => {
      const { data, error } = await supabase
        .from('wa_contacts')
        .insert({
          organization_id: params.organization_id,
          phone: params.phone,
          name: params.name || null,
          tags: params.tags || [],
          opt_in_status: (params.opt_in_status || 'pending') as any,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa-contacts'] });
    },
  });
}
