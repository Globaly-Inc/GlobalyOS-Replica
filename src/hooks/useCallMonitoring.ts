import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

export interface ActiveCall {
  id: string;
  twilio_sid: string;
  from_number: string | null;
  to_number: string | null;
  event_type: string;
  direction: string;
  created_at: string;
  phone_number_id: string | null;
}

export function useActiveCalls() {
  const { currentOrg } = useOrganization();
  return useQuery({
    queryKey: ['active-calls', currentOrg?.id],
    enabled: !!currentOrg?.id,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('twilio-monitor-call', {
        body: { action: 'list_active', organization_id: currentOrg!.id },
      });
      if (error) throw error;
      return (data?.calls ?? []) as ActiveCall[];
    },
  });
}

export function useMonitorCall() {
  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      call_sid: string;
      mode: 'listen' | 'whisper' | 'barge';
      supervisor_number?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('twilio-monitor-call', {
        body: { action: 'monitor', ...params },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Joined call in ${data.mode} mode`);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to monitor call');
    },
  });
}

export function useDialCampaignContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { campaign_id: string; organization_id: string }) => {
      const { data, error } = await supabase.functions.invoke('twilio-campaign-dial', {
        body: params,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.done) {
        toast.success(data.message || 'Campaign completed!');
      } else {
        toast.success(`Calling ${data.contact?.contact_name || data.contact?.phone_number}`);
      }
      qc.invalidateQueries({ queryKey: ['call-campaigns'] });
      qc.invalidateQueries({ queryKey: ['campaign-contacts'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to dial');
    },
  });
}
