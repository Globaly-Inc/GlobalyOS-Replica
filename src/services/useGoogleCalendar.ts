/**
 * Google Calendar Integration Hooks
 * Connect, disconnect, and manage Google Calendar OAuth
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const useGoogleCalendarConnect = () => {
  const { currentOrg } = useOrganization();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!currentOrg?.id || !user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: {
          organization_id: currentOrg.id,
        },
        headers: { 'x-action': 'initiate' },
      });

      // The edge function routes by ?action= param, but invoke sends POST to root.
      // We need to call with action=initiate via query params instead.
      // Let's use fetch directly.
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/google-calendar-auth?action=initiate`,
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

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/google-calendar-auth?action=disconnect`,
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
