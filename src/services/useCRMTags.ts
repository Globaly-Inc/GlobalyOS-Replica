/**
 * CRM Tags Service Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import type { CRMTag } from '@/types/crm';

export const useCRMTags = () => {
  const { currentOrg } = useOrganization();
  return useQuery({
    queryKey: ['crm-tags', currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_tags')
        .select('*')
        .eq('organization_id', currentOrg!.id)
        .order('name');
      if (error) throw error;
      return data as unknown as CRMTag[];
    },
    enabled: !!currentOrg?.id,
  });
};

export const useCreateCRMTag = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  return useMutation({
    mutationFn: async (input: { name: string; color?: string }) => {
      const { data, error } = await supabase
        .from('crm_tags')
        .insert({ ...input, organization_id: currentOrg!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-tags'] }),
  });
};

export const useUpdateCRMTag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; color?: string }) => {
      const { data, error } = await supabase
        .from('crm_tags')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-tags'] }),
  });
};

export const useDeleteCRMTag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_tags').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-tags'] }),
  });
};
