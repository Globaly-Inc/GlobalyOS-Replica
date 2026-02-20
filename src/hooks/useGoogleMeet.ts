/**
 * useGoogleMeet
 * Shared hook for creating Google Meet links via the google-calendar-proxy edge function.
 * Used by both Inbox and Team Chat composers.
 */

import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function useCreateMeetLink() {
  const { currentOrg } = useOrganization();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (): Promise<string> => {
      if (!currentOrg?.id || !user?.id) throw new Error('Not authenticated');

      const now = new Date();
      const startTime = now.toISOString();
      const endTime = new Date(now.getTime() + 30 * 60 * 1000).toISOString(); // 30 min

      const { data, error } = await supabase.functions.invoke('google-calendar-proxy', {
        body: {
          action: 'create_meet',
          user_id: user.id,
          organization_id: currentOrg.id,
          summary: 'Quick Meet',
          start_time: startTime,
          end_time: endTime,
        },
      });

      if (error) throw error;
      if (!data?.meet_link) throw new Error('No Meet link returned. Is Google Calendar connected?');
      return data.meet_link as string;
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create Meet link');
    },
  });
}
