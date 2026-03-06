/**
 * Task Custom Fields Service Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

export interface TaskCustomField {
  id: string;
  organization_id: string;
  space_id: string;
  field_name: string;
  field_key: string;
  field_type: 'text' | 'number' | 'date' | 'select';
  options: string[] | null;
  is_required: boolean;
  sort_order: number;
  created_at: string;
}

export const useTaskCustomFields = (spaceId: string | undefined) => {
  const { currentOrg } = useOrganization();
  return useQuery({
    queryKey: ['task-custom-fields', currentOrg?.id, spaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_custom_fields')
        .select('*')
        .eq('organization_id', currentOrg!.id)
        .eq('space_id', spaceId!)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as unknown as TaskCustomField[];
    },
    enabled: !!currentOrg?.id && !!spaceId,
  });
};

export const useCreateTaskCustomField = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  return useMutation({
    mutationFn: async (input: Partial<TaskCustomField>) => {
      const { data, error } = await supabase
        .from('task_custom_fields')
        .insert({ ...input, organization_id: currentOrg!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-custom-fields'] }),
  });
};

export const useDeleteTaskCustomField = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('task_custom_fields').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-custom-fields'] }),
  });
};
