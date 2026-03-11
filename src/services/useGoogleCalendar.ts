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

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      const res = await fetch(
        `${supabaseUrl}/functions/v1/google-calendar-auth?action=initiate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': anonKey,
          },
          body: JSON.stringify({ organization_id: currentOrg.id, source }),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to initiate connection');

      // Redirect to Google OAuth
      window.location.href = result.auth_url;
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

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      const res = await fetch(
        `${supabaseUrl}/functions/v1/google-calendar-auth?action=disconnect`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': anonKey,
          },
          body: JSON.stringify({ organization_id: currentOrg.id }),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to disconnect');
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
