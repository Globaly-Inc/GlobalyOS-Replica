import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import type { InboxMacro } from '@/types/inbox';

export function useInboxMacros() {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['inbox-macros', currentOrg?.id],
    enabled: !!currentOrg?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inbox_macros')
        .select('*')
        .eq('organization_id', currentOrg!.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data ?? []) as InboxMacro[];
    },
  });
}

export function useCreateInboxMacro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (macro: Omit<InboxMacro, 'id' | 'created_by' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('inbox_macros')
        .insert(macro as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox-macros'] });
    },
  });
}

export function useUpdateInboxMacro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; updates: Partial<InboxMacro> }) => {
      const { error } = await supabase
        .from('inbox_macros')
        .update({ ...params.updates, updated_at: new Date().toISOString() } as any)
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox-macros'] });
    },
  });
}

export function useDeleteInboxMacro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inbox_macros')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox-macros'] });
    },
  });
}
