/**
 * Presence and Typing Query/Mutation Hooks
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';

export const useTypingIndicator = () => {
  const { data: currentEmployee } = useCurrentEmployee();
  const { currentOrg } = useOrganization();

  const updateTypingStatus = async (conversationId: string | null, spaceId: string | null) => {
    if (!currentEmployee?.id || !currentOrg?.id) return;

    await supabase
      .from('chat_presence')
      .upsert({
        employee_id: currentEmployee.id,
        organization_id: currentOrg.id,
        typing_in_conversation_id: conversationId,
        typing_in_space_id: spaceId,
        is_online: true,
        last_seen_at: new Date().toISOString()
      }, { onConflict: 'employee_id' });
  };

  const clearTypingStatus = async () => {
    if (!currentEmployee?.id) return;

    await supabase
      .from('chat_presence')
      .update({
        typing_in_conversation_id: null,
        typing_in_space_id: null
      })
      .eq('employee_id', currentEmployee.id);
  };

  return { updateTypingStatus, clearTypingStatus };
};

export const useTypingUsers = (conversationId: string | null, spaceId: string | null) => {
  const { data: currentEmployee } = useCurrentEmployee();

  return useQuery({
    queryKey: ['typing-users', conversationId, spaceId],
    queryFn: async () => {
      if (!conversationId && !spaceId) return [];

      let query = supabase
        .from('chat_presence')
        .select(`
          employee_id,
          employees:employee_id (
            id,
            profiles:user_id (
              full_name
            )
          )
        `)
        .neq('employee_id', currentEmployee?.id || '');

      if (conversationId) {
        query = query.eq('typing_in_conversation_id', conversationId);
      } else if (spaceId) {
        query = query.eq('typing_in_space_id', spaceId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((p: any) => ({
        employeeId: p.employee_id,
        name: p.employees?.profiles?.full_name || 'Someone'
      }));
    },
    enabled: (!!conversationId || !!spaceId) && !!currentEmployee?.id,
    staleTime: 5000,
  });
};

export const useOnlinePresence = () => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['online-presence', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];

      const { data, error } = await supabase
        .from('chat_presence')
        .select('employee_id, is_online, last_seen_at')
        .eq('organization_id', currentOrg.id)
        .eq('is_online', true);

      if (error) throw error;

      return data || [];
    },
    enabled: !!currentOrg?.id,
    refetchInterval: 30000,
  });
};
