import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface InboxActivityEntry {
  id: string;
  conversation_id: string;
  actor_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

export function useInboxActivity(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['inbox-activity', conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inbox_activity_log')
        .select('*')
        .eq('conversation_id', conversationId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as InboxActivityEntry[];
    },
  });
}

export async function logInboxActivity(params: {
  organizationId: string;
  conversationId: string;
  action: string;
  details?: Record<string, string | number | boolean | null>;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  const detailsJson: Json = params.details
    ? (Object.fromEntries(Object.entries(params.details).map(([k, v]) => [k, v ?? null])) as Json)
    : {};
  await supabase.from('inbox_activity_log').insert([{
    organization_id: params.organizationId,
    conversation_id: params.conversationId,
    actor_id: user?.id || null,
    action: params.action,
    details: detailsJson,
  }]);
}
