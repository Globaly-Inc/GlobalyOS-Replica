/**
 * CRM Duplicate Detection & Merge Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import type { CRMContact, CRMCompany } from '@/types/crm';

export const useCRMDuplicateContacts = (contact: CRMContact | null | undefined) => {
  const { currentOrg } = useOrganization();
  return useQuery({
    queryKey: ['crm-duplicate-contacts', contact?.id],
    queryFn: async () => {
      if (!contact) return [];
      const conditions: string[] = [];
      if (contact.email) conditions.push(`email.eq.${contact.email}`);
      if (contact.phone) conditions.push(`phone.eq.${contact.phone}`);
      if (conditions.length === 0 && contact.first_name && contact.last_name) {
        conditions.push(`and(first_name.ilike.${contact.first_name},last_name.ilike.${contact.last_name})`);
      }
      if (conditions.length === 0) return [];

      const { data, error } = await supabase
        .from('crm_contacts')
        .select('*, company:crm_companies(id, name)')
        .eq('organization_id', currentOrg!.id)
        .neq('id', contact.id)
        .or(conditions.join(','))
        .limit(5);
      if (error) throw error;
      return data as unknown as CRMContact[];
    },
    enabled: !!contact?.id && !!currentOrg?.id,
  });
};

export const useCRMDuplicateCompanies = (company: CRMCompany | null | undefined) => {
  const { currentOrg } = useOrganization();
  return useQuery({
    queryKey: ['crm-duplicate-companies', company?.id],
    queryFn: async () => {
      if (!company) return [];
      const conditions: string[] = [];
      if (company.email) conditions.push(`email.eq.${company.email}`);
      if (company.name) conditions.push(`name.ilike.${company.name}`);
      if (conditions.length === 0) return [];

      const { data, error } = await supabase
        .from('crm_companies')
        .select('*')
        .eq('organization_id', currentOrg!.id)
        .neq('id', company.id)
        .or(conditions.join(','))
        .limit(5);
      if (error) throw error;
      return data as unknown as CRMCompany[];
    },
    enabled: !!company?.id && !!currentOrg?.id,
  });
};

export const useMergeCRMContacts = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ primaryId, duplicateId, mergedData }: { primaryId: string; duplicateId: string; mergedData: Partial<CRMContact> }) => {
      // Update primary with merged data
      const { error: updateError } = await supabase
        .from('crm_contacts')
        .update(mergedData as any)
        .eq('id', primaryId);
      if (updateError) throw updateError;

      // Reassign activities
      const { error: actError } = await supabase
        .from('crm_activity_log')
        .update({ contact_id: primaryId } as any)
        .eq('contact_id', duplicateId);
      if (actError) throw actError;

      // Delete duplicate
      const { error: delError } = await supabase
        .from('crm_contacts')
        .delete()
        .eq('id', duplicateId);
      if (delError) throw delError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-contacts'] });
      qc.invalidateQueries({ queryKey: ['crm-contact'] });
      qc.invalidateQueries({ queryKey: ['crm-activities'] });
      qc.invalidateQueries({ queryKey: ['crm-duplicate-contacts'] });
    },
  });
};

export const useMergeCRMCompanies = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ primaryId, duplicateId, mergedData }: { primaryId: string; duplicateId: string; mergedData: Partial<CRMCompany> }) => {
      const { error: updateError } = await supabase
        .from('crm_companies')
        .update(mergedData as any)
        .eq('id', primaryId);
      if (updateError) throw updateError;

      // Reassign contacts
      const { error: contactError } = await supabase
        .from('crm_contacts')
        .update({ company_id: primaryId } as any)
        .eq('company_id', duplicateId);
      if (contactError) throw contactError;

      // Reassign activities
      const { error: actError } = await supabase
        .from('crm_activity_log')
        .update({ company_id: primaryId } as any)
        .eq('company_id', duplicateId);
      if (actError) throw actError;

      const { error: delError } = await supabase
        .from('crm_companies')
        .delete()
        .eq('id', duplicateId);
      if (delError) throw delError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-companies'] });
      qc.invalidateQueries({ queryKey: ['crm-company'] });
      qc.invalidateQueries({ queryKey: ['crm-activities'] });
      qc.invalidateQueries({ queryKey: ['crm-duplicate-companies'] });
    },
  });
};
