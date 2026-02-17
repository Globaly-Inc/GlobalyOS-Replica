/**
 * CRM Service Hooks
 * React Query hooks for CRM contacts, companies, and activities
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';
import type { CRMContact, CRMCompany, CRMActivity, CRMContactFilters, CRMCompanyFilters } from '@/types/crm';

// ─── Contacts ─────────────────────────────────────────

export const useCRMContacts = (filters: CRMContactFilters = {}) => {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ['crm-contacts', orgId, filters],
    queryFn: async () => {
      let query = supabase
        .from('crm_contacts')
        .select('*, company:crm_companies(id, name, logo_url)', { count: 'exact' })
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });

      if (filters.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }
      if (filters.rating) query = query.eq('rating', filters.rating);
      if (filters.source) query = query.eq('source', filters.source);
      if (filters.is_archived !== undefined) query = query.eq('is_archived', filters.is_archived);
      if (filters.company_id) query = query.eq('company_id', filters.company_id);

      const page = filters.page || 1;
      const perPage = filters.per_page || 20;
      const from = (page - 1) * perPage;
      query = query.range(from, from + perPage - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data as unknown as CRMContact[], count: count || 0 };
    },
    enabled: !!orgId,
  });
};

export const useCRMContact = (id: string | null) => {
  const { currentOrg } = useOrganization();
  return useQuery({
    queryKey: ['crm-contact', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_contacts')
        .select('*, company:crm_companies(*)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as unknown as CRMContact;
    },
    enabled: !!id && !!currentOrg?.id,
  });
};

export const useCreateCRMContact = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: employee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (input: Partial<CRMContact>) => {
      const { data, error } = await supabase
        .from('crm_contacts')
        .insert({ ...input, organization_id: currentOrg!.id, created_by: employee?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-contacts'] }),
  });
};

export const useUpdateCRMContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CRMContact> & { id: string }) => {
      const { data, error } = await supabase
        .from('crm_contacts')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['crm-contacts'] });
      qc.invalidateQueries({ queryKey: ['crm-contact', vars.id] });
    },
  });
};

export const useDeleteCRMContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-contacts'] }),
  });
};

// ─── Companies ────────────────────────────────────────

export const useCRMCompanies = (filters: CRMCompanyFilters = {}) => {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ['crm-companies', orgId, filters],
    queryFn: async () => {
      let query = supabase
        .from('crm_companies')
        .select('*', { count: 'exact' })
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }
      if (filters.rating) query = query.eq('rating', filters.rating);
      if (filters.industry) query = query.eq('industry', filters.industry);

      const page = filters.page || 1;
      const perPage = filters.per_page || 20;
      const from = (page - 1) * perPage;
      query = query.range(from, from + perPage - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data as unknown as CRMCompany[], count: count || 0 };
    },
    enabled: !!orgId,
  });
};

export const useCRMCompany = (id: string | null) => {
  const { currentOrg } = useOrganization();
  return useQuery({
    queryKey: ['crm-company', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_companies')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as unknown as CRMCompany;
    },
    enabled: !!id && !!currentOrg?.id,
  });
};

export const useCreateCRMCompany = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: employee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (input: Partial<CRMCompany>) => {
      const { data, error } = await supabase
        .from('crm_companies')
        .insert({ ...input, organization_id: currentOrg!.id, created_by: employee?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-companies'] }),
  });
};

export const useUpdateCRMCompany = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CRMCompany> & { id: string }) => {
      const { data, error } = await supabase
        .from('crm_companies')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['crm-companies'] });
      qc.invalidateQueries({ queryKey: ['crm-company', vars.id] });
    },
  });
};

export const useDeleteCRMCompany = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_companies').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-companies'] }),
  });
};

// ─── Activities ───────────────────────────────────────

export const useCRMActivities = (contactId?: string | null, companyId?: string | null) => {
  const { currentOrg } = useOrganization();
  return useQuery({
    queryKey: ['crm-activities', contactId, companyId],
    queryFn: async () => {
      let query = supabase
        .from('crm_activity_log')
        .select('*, employee:employees(id, first_name, last_name, avatar_url)')
        .eq('organization_id', currentOrg!.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (contactId) query = query.eq('contact_id', contactId);
      if (companyId) query = query.eq('company_id', companyId);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as CRMActivity[];
    },
    enabled: !!currentOrg?.id && (!!contactId || !!companyId),
  });
};

export const useCreateCRMActivity = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: employee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (input: Partial<CRMActivity>) => {
      const { data, error } = await supabase
        .from('crm_activity_log')
        .insert({
          ...input,
          organization_id: currentOrg!.id,
          employee_id: employee!.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      if (vars.contact_id) qc.invalidateQueries({ queryKey: ['crm-activities', vars.contact_id] });
      if (vars.company_id) qc.invalidateQueries({ queryKey: ['crm-activities', null, vars.company_id] });
    },
  });
};

// ─── Company contacts count ───────────────────────────

export const useCRMCompanyContactsCount = (companyId: string | null) => {
  const { currentOrg } = useOrganization();
  return useQuery({
    queryKey: ['crm-company-contacts-count', companyId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('crm_contacts')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId!)
        .eq('organization_id', currentOrg!.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!companyId && !!currentOrg?.id,
  });
};
