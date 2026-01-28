import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useSpaceMembersRealtime = (spaceId: string | null) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!spaceId) return;

    const channel = supabase
      .channel(`space-members-${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_space_members',
          filter: `space_id=eq.${spaceId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-space-members', spaceId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_space_member_logs',
          filter: `space_id=eq.${spaceId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-space-member-logs', spaceId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [spaceId, queryClient]);
};
