import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import type { TaskFilters } from '@/types/task';

export interface SavedFilter {
  id: string;
  name: string;
  filters: TaskFilters;
  created_at: string;
}

export function useTaskSavedFilters(spaceId?: string) {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();
  const orgId = currentOrg?.id;

  const queryKey = ['task-saved-filters', orgId, spaceId];

  const { data: savedFilters = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !orgId) return [];

      let query = supabase
        .from('task_saved_filters')
        .select('id, name, filters, created_at')
        .eq('organization_id', orgId)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (spaceId) {
        query = query.eq('space_id', spaceId);
      } else {
        query = query.is('space_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SavedFilter[];
    },
    enabled: !!orgId,
  });

  const saveFilter = useMutation({
    mutationFn: async ({ name, filters }: { name: string; filters: TaskFilters }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !orgId) throw new Error('Not authenticated');

      const { error } = await supabase.from('task_saved_filters').insert({
        organization_id: orgId,
        created_by: user.id,
        space_id: spaceId || null,
        name,
        filters: filters as any,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteFilter = useMutation({
    mutationFn: async (filterId: string) => {
      const { error } = await supabase
        .from('task_saved_filters')
        .delete()
        .eq('id', filterId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return { savedFilters, isLoading, saveFilter, deleteFilter };
}
