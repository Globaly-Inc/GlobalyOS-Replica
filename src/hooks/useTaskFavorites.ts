import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';

export const useListFavorites = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useQuery({
    queryKey: ['list-favorites', currentOrg?.id, currentEmployee?.id],
    queryFn: async () => {
      if (!currentOrg?.id || !currentEmployee?.id) return [];

      const { data, error } = await supabase
        .from('task_list_favorites')
        .select('list_id')
        .eq('organization_id', currentOrg.id)
        .eq('employee_id', currentEmployee.id);

      if (error) throw error;
      return (data || []).map((d: any) => d.list_id as string);
    },
    enabled: !!currentOrg?.id && !!currentEmployee?.id,
  });
};

export const useIsListFavorite = (listId: string) => {
  const { data: favoriteIds = [] } = useListFavorites();
  return favoriteIds.includes(listId);
};

export interface FavoriteListDetail {
  list_id: string;
  name: string;
  space_id: string | null;
}

export const useListFavoritesWithDetails = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useQuery({
    queryKey: ['list-favorites-details', currentOrg?.id, currentEmployee?.id],
    queryFn: async (): Promise<FavoriteListDetail[]> => {
      if (!currentOrg?.id || !currentEmployee?.id) return [];

      const { data, error } = await supabase
        .from('task_list_favorites')
        .select('list_id, task_lists:list_id(name, space_id)')
        .eq('organization_id', currentOrg.id)
        .eq('employee_id', currentEmployee.id);

      if (error) throw error;
      return (data || []).map((d: any) => ({
        list_id: d.list_id,
        name: d.task_lists?.name ?? 'Untitled',
        space_id: d.task_lists?.space_id ?? null,
      }));
    },
    enabled: !!currentOrg?.id && !!currentEmployee?.id,
  });
};

export const useToggleListFavorite = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (listId: string) => {
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('task_list_favorites')
        .select('id')
        .eq('employee_id', currentEmployee.id)
        .eq('list_id', listId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('task_list_favorites')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
        return { action: 'removed' as const, listId };
      } else {
        const { error } = await supabase
          .from('task_list_favorites')
          .insert({
            employee_id: currentEmployee.id,
            organization_id: currentOrg.id,
            list_id: listId,
          });
        if (error) throw error;
        return { action: 'added' as const, listId };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-favorites'] });
      queryClient.invalidateQueries({ queryKey: ['list-favorites-details'] });
    },
  });
};
