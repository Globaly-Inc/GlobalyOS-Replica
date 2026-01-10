import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';

export interface ChatFavorite {
  id: string;
  employee_id: string;
  organization_id: string;
  conversation_id: string | null;
  space_id: string | null;
  created_at: string;
}

export const useChatFavorites = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useQuery({
    queryKey: ['chat-favorites', currentOrg?.id, currentEmployee?.id],
    queryFn: async () => {
      if (!currentOrg?.id || !currentEmployee?.id) return [];

      const { data, error } = await supabase
        .from('chat_favorites')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .eq('employee_id', currentEmployee.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as ChatFavorite[];
    },
    enabled: !!currentOrg?.id && !!currentEmployee?.id,
  });
};

export const useToggleFavorite = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      spaceId 
    }: { 
      conversationId?: string; 
      spaceId?: string;
    }) => {
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error('Not authenticated');
      if (!conversationId && !spaceId) throw new Error('Must provide conversationId or spaceId');

      // Check if favorite exists
      let query = supabase
        .from('chat_favorites')
        .select('id')
        .eq('employee_id', currentEmployee.id)
        .eq('organization_id', currentOrg.id);

      if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      } else if (spaceId) {
        query = query.eq('space_id', spaceId);
      }

      const { data: existing } = await query.maybeSingle();

      if (existing) {
        // Remove favorite
        const { error } = await supabase
          .from('chat_favorites')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
        return { action: 'removed' as const };
      } else {
        // Add favorite
        const { error } = await supabase
          .from('chat_favorites')
          .insert({
            employee_id: currentEmployee.id,
            organization_id: currentOrg.id,
            conversation_id: conversationId || null,
            space_id: spaceId || null,
          });
        if (error) throw error;
        return { action: 'added' as const };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-favorites'] });
    },
  });
};

export const useIsFavorite = (conversationId?: string, spaceId?: string) => {
  const { data: favorites = [] } = useChatFavorites();

  if (conversationId) {
    return favorites.some(f => f.conversation_id === conversationId);
  }
  if (spaceId) {
    return favorites.some(f => f.space_id === spaceId);
  }
  return false;
};
