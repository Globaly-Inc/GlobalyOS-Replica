import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';

export interface MessageStar {
  id: string;
  employee_id: string;
  organization_id: string;
  message_id: string;
  created_at: string;
}

export const useMessageStars = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useQuery({
    queryKey: ['message-stars', currentOrg?.id, currentEmployee?.id],
    queryFn: async () => {
      if (!currentOrg?.id || !currentEmployee?.id) return [];

      const { data, error } = await supabase
        .from('chat_message_stars')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .eq('employee_id', currentEmployee.id);

      if (error) throw error;
      return (data || []) as MessageStar[];
    },
    enabled: !!currentOrg?.id && !!currentEmployee?.id,
  });
};

export const useIsMessageStarred = (messageId: string | undefined) => {
  const { data: stars = [] } = useMessageStars();
  
  if (!messageId) return false;
  return stars.some(s => s.message_id === messageId);
};

export const useToggleMessageStar = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (messageId: string) => {
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error('Not authenticated');

      // Check if star exists
      const { data: existing } = await supabase
        .from('chat_message_stars')
        .select('id')
        .eq('employee_id', currentEmployee.id)
        .eq('message_id', messageId)
        .maybeSingle();

      if (existing) {
        // Remove star
        const { error } = await supabase
          .from('chat_message_stars')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
        return { action: 'removed' as const, messageId };
      } else {
        // Add star
        const { error } = await supabase
          .from('chat_message_stars')
          .insert({
            employee_id: currentEmployee.id,
            organization_id: currentOrg.id,
            message_id: messageId,
          });
        if (error) throw error;
        return { action: 'added' as const, messageId };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-stars'] });
      queryClient.invalidateQueries({ queryKey: ['starred-messages'] });
    },
  });
};
