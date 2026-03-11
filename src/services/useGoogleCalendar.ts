/**
 * Google Calendar Integration Hooks
 * Connect, disconnect, and manage Google Calendar OAuth
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const useGoogleCalendarConnect = (source: 'scheduler' | 'inbox' = 'scheduler') => {
  const { currentOrg } = useOrganization();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!currentOrg?.id || !user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: {
          action: 'initiate',
          organization_id: currentOrg.id,
          source,
        },
      });

      if (error) throw error;
      if (!data?.auth_url) throw new Error(data?.error || 'Failed to initiate connection');

      // Redirect to Google OAuth
      window.location.href = data.auth_url;
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to connect Google Calendar');
    },
  });
};

export const useGoogleCalendarDisconnect = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!currentOrg?.id || !user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: {
          action: 'disconnect',
          organization_id: currentOrg.id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduler_integration_settings'] });
      toast.success('Google Calendar disconnected');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to disconnect Google Calendar');
    },
  });
};
