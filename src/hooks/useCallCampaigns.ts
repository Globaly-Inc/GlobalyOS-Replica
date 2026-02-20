import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

export interface CallCampaign {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  phone_number_id: string | null;
  status: string;
  total_contacts: number;
  completed_calls: number;
  connected_calls: number;
  failed_calls: number;
  avg_duration_seconds: number;
  voicemail_drop_text: string | null;
  created_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignContact {
  id: string;
  campaign_id: string;
  organization_id: string;
  contact_name: string | null;
  phone_number: string;
  crm_contact_id: string | null;
  status: string;
  call_sid: string | null;
  duration_seconds: number | null;
  outcome: string | null;
  notes: string | null;
  called_at: string | null;
  created_at: string;
}

export function useCallCampaigns() {
  const { currentOrg } = useOrganization();
  return useQuery({
    queryKey: ['call-campaigns', currentOrg?.id],
    enabled: !!currentOrg?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_campaigns')
        .select('*')
        .eq('organization_id', currentOrg!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CallCampaign[];
    },
  });
}

export function useCampaignContacts(campaignId?: string) {
  const { currentOrg } = useOrganization();
  return useQuery({
    queryKey: ['campaign-contacts', campaignId],
    enabled: !!campaignId && !!currentOrg?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_campaign_contacts')
        .select('*')
        .eq('campaign_id', campaignId!)
        .eq('organization_id', currentOrg!.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CampaignContact[];
    },
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  return useMutation({
    mutationFn: async (params: {
      name: string;
      description?: string;
      phone_number_id?: string;
      voicemail_drop_text?: string;
      contacts: { contact_name?: string; phone_number: string; crm_contact_id?: string }[];
    }) => {
      const orgId = currentOrg!.id;
      const { data: campaign, error } = await supabase
        .from('call_campaigns')
        .insert({
          organization_id: orgId,
          name: params.name,
          description: params.description || null,
          phone_number_id: params.phone_number_id || null,
          voicemail_drop_text: params.voicemail_drop_text || null,
          total_contacts: params.contacts.length,
        } as any)
        .select()
        .single();
      if (error) throw error;

      if (params.contacts.length > 0) {
        const contactRows = params.contacts.map((c) => ({
          campaign_id: campaign.id,
          organization_id: orgId,
          contact_name: c.contact_name || null,
          phone_number: c.phone_number,
          crm_contact_id: c.crm_contact_id || null,
        }));
        const { error: cErr } = await supabase.from('call_campaign_contacts').insert(contactRows as any);
        if (cErr) throw cErr;
      }

      return campaign;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['call-campaigns'] });
      toast.success('Campaign created');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateCampaignStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === 'active') updates.started_at = new Date().toISOString();
      if (status === 'completed') updates.completed_at = new Date().toISOString();
      const { error } = await supabase.from('call_campaigns').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['call-campaigns'] });
      toast.success('Campaign status updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
