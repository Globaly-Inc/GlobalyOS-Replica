import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WaTemplate, WaCampaign } from '@/types/whatsapp';

// ── Templates ──

export function useWaTemplates(orgId: string | undefined) {
  return useQuery({
    queryKey: ['wa-templates', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wa_templates')
        .select('*')
        .eq('organization_id', orgId!)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as WaTemplate[];
    },
  });
}

export function useCreateWaTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      name: string;
      category: string;
      language: string;
      components: unknown[];
    }) => {
      const { data, error } = await supabase
        .from('wa_templates')
        .insert({
          organization_id: params.organization_id,
          name: params.name,
          category: params.category as any,
          language: params.language,
          components: params.components as any,
          status: 'draft' as any,
          version: 1,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa-templates'] });
    },
  });
}

export function useUpdateWaTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      name?: string;
      category?: string;
      language?: string;
      components?: unknown[];
    }) => {
      const { id, ...updates } = params;
      const { error } = await supabase
        .from('wa_templates')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa-templates'] });
    },
  });
}

export function useDeleteWaTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('wa_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa-templates'] });
    },
  });
}

export function useSyncWaTemplates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orgId: string) => {
      const { data, error } = await supabase.functions.invoke('wa-template-sync', {
        body: { organization_id: orgId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa-templates'] });
    },
  });
}

// ── Campaigns (Broadcasts) ──

export function useWaCampaigns(orgId: string | undefined) {
  return useQuery({
    queryKey: ['wa-campaigns', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wa_campaigns')
        .select('*, wa_templates(*)')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as (WaCampaign & { wa_templates: WaTemplate | null })[];
    },
  });
}

export function useCreateWaCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      name: string;
      template_id: string;
      variable_mapping: Record<string, unknown>;
      audience_filters: Record<string, unknown>;
      audience_source: string;
      scheduled_at?: string | null;
      created_by?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('wa_campaigns')
        .insert({
          ...params,
          status: params.scheduled_at ? 'scheduled' : 'draft',
          stats: { total: 0, sent: 0, delivered: 0, read: 0, failed: 0, replied: 0 },
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa-campaigns'] });
    },
  });
}

export function useSendWaCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.functions.invoke('wa-send-broadcast', {
        body: { campaign_id: campaignId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa-campaigns'] });
    },
  });
}
