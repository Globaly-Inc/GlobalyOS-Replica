import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';

export const useTaskFavorites = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useQuery({
    queryKey: ['task-favorites', currentOrg?.id, currentEmployee?.id],
    queryFn: async () => {
      if (!currentOrg?.id || !currentEmployee?.id) return [];

      const { data, error } = await supabase
        .from('task_favorites')
        .select('task_id')
        .eq('organization_id', currentOrg.id)
        .eq('employee_id', currentEmployee.id);

      if (error) throw error;
      return (data || []).map((d: any) => d.task_id as string);
    },
    enabled: !!currentOrg?.id && !!currentEmployee?.id,
  });
};

export const useIsTaskFavorite = (taskId: string) => {
  const { data: favoriteIds = [] } = useTaskFavorites();
  return favoriteIds.includes(taskId);
};

export interface FavoriteTaskDetail {
  task_id: string;
  name: string;
  list_id: string | null;
  space_id: string | null;
}

export const useTaskFavoritesWithDetails = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useQuery({
    queryKey: ['task-favorites-details', currentOrg?.id, currentEmployee?.id],
    queryFn: async (): Promise<FavoriteTaskDetail[]> => {
      if (!currentOrg?.id || !currentEmployee?.id) return [];

      const { data, error } = await supabase
        .from('task_favorites')
        .select('task_id, tasks:task_id(name, list_id)')
        .eq('organization_id', currentOrg.id)
        .eq('employee_id', currentEmployee.id);

      if (error) throw error;
      return (data || []).map((d: any) => ({
        task_id: d.task_id,
        name: d.tasks?.name ?? 'Untitled',
        list_id: d.tasks?.list_id ?? null,
        space_id: null,
      }));
    },
    enabled: !!currentOrg?.id && !!currentEmployee?.id,
  });
};

export const useToggleTaskFavorite = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (taskId: string) => {
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('task_favorites')
        .select('id')
        .eq('employee_id', currentEmployee.id)
        .eq('task_id', taskId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('task_favorites')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
        return { action: 'removed' as const, taskId };
      } else {
        const { error } = await supabase
          .from('task_favorites')
          .insert({
            employee_id: currentEmployee.id,
            organization_id: currentOrg.id,
            task_id: taskId,
          });
        if (error) throw error;
        return { action: 'added' as const, taskId };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-favorites'] });
    },
  });
};
