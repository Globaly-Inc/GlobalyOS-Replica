import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SpaceMemberLog {
  id: string;
  space_id: string;
  employee_id: string;
  organization_id: string;
  action_type: 'added' | 'removed';
  source: 'manual' | 'auto_sync' | 'space_creation';
  performed_by: string | null;
  created_at: string;
  employee?: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    } | null;
  } | null;
}

export const useSpaceMemberLogs = (spaceId: string | null) => {
  return useQuery({
    queryKey: ['chat-space-member-logs', spaceId],
    queryFn: async (): Promise<SpaceMemberLog[]> => {
      if (!spaceId) return [];

      const { data, error } = await supabase
        .from('chat_space_member_logs')
        .select(`
          *,
          employee:employees!chat_space_member_logs_employee_id_fkey (
            id,
            profiles:user_id (full_name, avatar_url)
          )
        `)
        .eq('space_id', spaceId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as SpaceMemberLog[];
    },
    enabled: !!spaceId,
  });
};
