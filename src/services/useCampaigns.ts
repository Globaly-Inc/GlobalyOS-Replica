/**
 * Email Campaigns Service Hooks
 * React Query hooks for all campaign CRUD operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';
import type {
  EmailCampaign,
  CampaignRecipient,
  EmailTemplate,
  SenderIdentity,
  EmailSuppression,
  EmailBuilderState,
  AudienceFilters,
  AudienceSource,
} from '@/types/campaigns';

// ─── Campaigns ────────────────────────────────────────────────────────────────

export const useCampaigns = (statusFilter?: string) => {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ['email-campaigns', orgId, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from('email_campaigns')
        .select('*', { count: 'exact' })
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        q = q.eq('status', statusFilter);
      }

      const { data, error, count } = await q;
      if (error) throw error;
      return { data: (data ?? []) as unknown as EmailCampaign[], count: count ?? 0 };
    },
    enabled: !!orgId,
  });
};

export const useCampaign = (id: string | null | undefined) => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['email-campaign', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('id', id!)
        .eq('organization_id', currentOrg!.id)
        .single();
      if (error) throw error;
      return data as unknown as EmailCampaign;
    },
    enabled: !!id && !!currentOrg?.id,
  });
};

export const useCreateCampaign = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: employee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (input: Partial<EmailCampaign>) => {
      const { data, error } = await supabase
        .from('email_campaigns')
        .insert({
          organization_id: currentOrg!.id,
          created_by: employee?.id,
          ...input,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as EmailCampaign;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-campaigns', currentOrg?.id] });
    },
  });
};

export const useUpdateCampaign = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<EmailCampaign> & { id: string }) => {
      const { data, error } = await supabase
        .from('email_campaigns')
        .update(input as any)
        .eq('id', id)
        .eq('organization_id', currentOrg!.id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as EmailCampaign;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['email-campaigns', currentOrg?.id] });
      qc.invalidateQueries({ queryKey: ['email-campaign', data.id] });
    },
  });
};

export const useDeleteCampaign = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('email_campaigns')
        .delete()
        .eq('id', id)
        .eq('organization_id', currentOrg!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-campaigns', currentOrg?.id] });
    },
  });
};

export const useDuplicateCampaign = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: employee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (campaign: EmailCampaign) => {
      const { data, error } = await supabase
        .from('email_campaigns')
        .insert({
          organization_id: currentOrg!.id,
          created_by: employee?.id,
          name: `${campaign.name} (Copy)`,
          status: 'draft',
          subject: campaign.subject,
          preview_text: campaign.preview_text,
          from_name: campaign.from_name,
          from_email: campaign.from_email,
          reply_to: campaign.reply_to,
          content_json: campaign.content_json as any,
          audience_source: campaign.audience_source,
          audience_filters: campaign.audience_filters as any,
          track_opens: campaign.track_opens,
          track_clicks: campaign.track_clicks,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as EmailCampaign;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-campaigns', currentOrg?.id] });
    },
  });
};

// ─── Campaign Recipients ──────────────────────────────────────────────────────

export const useCampaignRecipients = (campaignId: string | null | undefined, page = 1, perPage = 50) => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['campaign-recipients', campaignId, page],
    queryFn: async () => {
      const from = (page - 1) * perPage;
      const { data, error, count } = await supabase
        .from('campaign_recipients')
        .select('*', { count: 'exact' })
        .eq('campaign_id', campaignId!)
        .eq('organization_id', currentOrg!.id)
        .order('created_at', { ascending: false })
        .range(from, from + perPage - 1);
      if (error) throw error;
      return { data: (data ?? []) as unknown as CampaignRecipient[], count: count ?? 0 };
    },
    enabled: !!campaignId && !!currentOrg?.id,
  });
};

// ─── Email Templates ──────────────────────────────────────────────────────────

export const useEmailTemplates = () => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['email-templates', currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('organization_id', currentOrg!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EmailTemplate[];
    },
    enabled: !!currentOrg?.id,
  });
};

export const useCreateEmailTemplate = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: employee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (input: { name: string; category?: string; content_json: EmailBuilderState }) => {
      const { data, error } = await supabase
        .from('email_templates')
        .insert({
          organization_id: currentOrg!.id,
          created_by: employee?.id,
          ...input,
          content_json: input.content_json as any,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as EmailTemplate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-templates', currentOrg?.id] });
    },
  });
};

export const useDeleteEmailTemplate = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id)
        .eq('organization_id', currentOrg!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-templates', currentOrg?.id] });
    },
  });
};

// ─── Sender Identities ────────────────────────────────────────────────────────

export const useSenderIdentities = () => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['sender-identities', currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sender_identities')
        .select('*')
        .eq('organization_id', currentOrg!.id)
        .order('is_default', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SenderIdentity[];
    },
    enabled: !!currentOrg?.id,
  });
};

export const useCreateSenderIdentity = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: employee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (input: { display_name: string; from_email: string; reply_to?: string }) => {
      const { data, error } = await supabase
        .from('sender_identities')
        .insert({
          organization_id: currentOrg!.id,
          created_by: employee?.id,
          ...input,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as SenderIdentity;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sender-identities', currentOrg?.id] });
    },
  });
};

export const useDeleteSenderIdentity = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sender_identities')
        .delete()
        .eq('id', id)
        .eq('organization_id', currentOrg!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sender-identities', currentOrg?.id] });
    },
  });
};

// ─── Email Suppressions ───────────────────────────────────────────────────────

export const useEmailSuppressions = (page = 1, perPage = 50) => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['email-suppressions', currentOrg?.id, page],
    queryFn: async () => {
      const from = (page - 1) * perPage;
      const { data, error, count } = await supabase
        .from('email_suppressions')
        .select('*', { count: 'exact' })
        .eq('organization_id', currentOrg!.id)
        .order('created_at', { ascending: false })
        .range(from, from + perPage - 1);
      if (error) throw error;
      return { data: (data ?? []) as unknown as EmailSuppression[], count: count ?? 0 };
    },
    enabled: !!currentOrg?.id,
  });
};

export const useAddSuppression = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async (input: { email: string; type?: string; reason?: string }) => {
      const { data, error } = await supabase
        .from('email_suppressions')
        .upsert({
          organization_id: currentOrg!.id,
          email: input.email.toLowerCase().trim(),
          type: input.type ?? 'manual',
          reason: input.reason,
        } as any, { onConflict: 'organization_id,email' })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as EmailSuppression;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-suppressions', currentOrg?.id] });
    },
  });
};

export const useRemoveSuppression = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('email_suppressions')
        .delete()
        .eq('id', id)
        .eq('organization_id', currentOrg!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-suppressions', currentOrg?.id] });
    },
  });
};
