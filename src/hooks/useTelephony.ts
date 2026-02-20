import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

export interface OrgPhoneNumber {
  id: string;
  organization_id: string;
  phone_number: string;
  twilio_sid: string;
  friendly_name: string | null;
  country_code: string;
  capabilities: { sms?: boolean; voice?: boolean; mms?: boolean };
  status: string;
  monthly_cost: number;
  ivr_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AvailableNumber {
  phone_number: string;
  friendly_name: string;
  country_code: string;
  capabilities: { sms?: boolean; voice?: boolean; mms?: boolean };
  monthly_cost: number;
  type: string;
}

export function useOrgPhoneNumbers() {
  const { currentOrg } = useOrganization();
  return useQuery({
    queryKey: ['org-phone-numbers', currentOrg?.id],
    enabled: !!currentOrg?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_phone_numbers')
        .select('*')
        .eq('organization_id', currentOrg!.id)
        .neq('status', 'released')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as OrgPhoneNumber[];
    },
  });
}

export function useSearchNumbers() {
  return useMutation({
    mutationFn: async (params: {
      country?: string;
      area_code?: string;
      contains?: string;
      capabilities?: { sms?: boolean; voice?: boolean };
    }) => {
      const { data, error } = await supabase.functions.invoke('twilio-search-numbers', {
        body: params,
      });
      if (error) throw error;
      return (data?.numbers ?? []) as AvailableNumber[];
    },
  });
}

export function useProvisionNumber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      phone_number: string;
      friendly_name?: string;
      organization_id: string;
      country_code?: string;
      monthly_cost?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke('twilio-provision-number', {
        body: params,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-phone-numbers'] });
      qc.invalidateQueries({ queryKey: ['inbox-channels'] });
      toast.success('Phone number provisioned successfully!');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to provision number');
    },
  });
}

export function useReleaseNumber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { phone_number_id: string; organization_id: string }) => {
      const { data, error } = await supabase.functions.invoke('twilio-release-number', {
        body: params,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-phone-numbers'] });
      qc.invalidateQueries({ queryKey: ['inbox-channels'] });
      toast.success('Phone number released');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to release number');
    },
  });
}

export function useUpdateIvrConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; ivr_config: Record<string, unknown> }) => {
      const { error } = await supabase
        .from('org_phone_numbers')
        .update({ ivr_config: params.ivr_config as any })
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-phone-numbers'] });
      toast.success('IVR configuration saved');
    },
  });
}

export function useTelephonyUsage(phoneNumberId?: string) {
  const { currentOrg } = useOrganization();
  return useQuery({
    queryKey: ['telephony-usage', currentOrg?.id, phoneNumberId],
    enabled: !!currentOrg?.id,
    queryFn: async () => {
      let query = supabase
        .from('telephony_usage_logs')
        .select('*')
        .eq('organization_id', currentOrg!.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (phoneNumberId) {
        query = query.eq('phone_number_id', phoneNumberId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}
