/**
 * CRM Custom Fields Service Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

export interface CRMCustomField {
  id: string;
  organization_id: string;
  entity_type: 'contact' | 'company';
  field_name: string;
  field_key: string;
  field_type: 'text' | 'number' | 'date' | 'select' | 'checkbox';
  options: string[] | null;
  is_required: boolean;
  sort_order: number;
  created_at: string;
}

export const useCRMCustomFields = (entityType: 'contact' | 'company') => {
  const { currentOrg } = useOrganization();
  return useQuery({
    queryKey: ['crm-custom-fields', currentOrg?.id, entityType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_custom_fields')
        .select('*')
        .eq('organization_id', currentOrg!.id)
        .eq('entity_type', entityType)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as unknown as CRMCustomField[];
    },
    enabled: !!currentOrg?.id,
  });
};

export const useCreateCRMCustomField = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  return useMutation({
    mutationFn: async (input: Partial<CRMCustomField>) => {
      const { data, error } = await supabase
        .from('crm_custom_fields')
        .insert({ ...input, organization_id: currentOrg!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-custom-fields'] }),
  });
};

export const useUpdateCRMCustomField = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CRMCustomField> & { id: string }) => {
      const { data, error } = await supabase
        .from('crm_custom_fields')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-custom-fields'] }),
  });
};

export const useDeleteCRMCustomField = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_custom_fields').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-custom-fields'] }),
  });
};
