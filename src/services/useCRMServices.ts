/**
 * CRM Services & Partners - React Query hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import type { CRMService, CRMPartner, CRMServiceFilters, CRMPartnerFilters, ServiceApplication } from '@/types/crm-services';

// ─── Services ─────────────────────────────────────────

export const useCRMServices = (filters: CRMServiceFilters = {}) => {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ['crm-services', orgId, filters],
    queryFn: async () => {
      let query = supabase
        .from('crm_services')
        .select('*, provider_partner:crm_partners(id, name, type)', { count: 'exact' })
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });

      if (filters.search) {
        const sanitized = filters.search.replace(/[%_\\'"()]/g, '');
        query = query.or(`name.ilike.%${sanitized}%,category.ilike.%${sanitized}%,short_description.ilike.%${sanitized}%`);
      }
      if (filters.category) query = query.eq('category', filters.category);
      if (filters.visibility) query = query.eq('visibility', filters.visibility as any);
      if (filters.status) query = query.eq('status', filters.status as any);
      if (filters.service_type) query = query.eq('service_type', filters.service_type as any);

      const page = filters.page || 1;
      const perPage = filters.per_page || 20;
      const from = (page - 1) * perPage;
      query = query.range(from, from + perPage - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data as unknown as CRMService[], count: count || 0 };
    },
    enabled: !!orgId,
  });
};

export const useCRMService = (id: string | null) => {
  const { currentOrg } = useOrganization();
  return useQuery({
    queryKey: ['crm-service', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_services')
        .select('*, provider_partner:crm_partners(id, name, type)')
        .eq('id', id!)
        .eq('organization_id', currentOrg!.id)
        .single();
      if (error) throw error;

      // Fetch offices
      const { data: offices } = await supabase
        .from('crm_service_offices')
        .select('*, office:offices(id, name)')
        .eq('service_id', id!);

      return { ...data, offices: offices || [] } as unknown as CRMService;
    },
    enabled: !!id && !!currentOrg?.id,
  });
};

export const useCreateCRMService = () => {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      category?: string;
      short_description?: string;
      long_description?: string;
      service_type?: string;
      provider_partner_id?: string | null;
      visibility?: string;
      status?: string;
      tags?: string[];
      eligibility_notes?: string;
      required_docs_template?: any[];
      workflow_stages?: any[];
      sla_target_days?: number | null;
      office_ids?: string[];
    }) => {
      const { office_ids, ...serviceData } = input;
      const { data, error } = await supabase
        .from('crm_services')
        .insert({ ...serviceData, organization_id: currentOrg!.id } as any)
        .select()
        .single();
      if (error) throw error;

      // Insert office associations
      if (office_ids && office_ids.length > 0) {
        const officeRows = office_ids.map(oid => ({
          service_id: data.id,
          office_id: oid,
          organization_id: currentOrg!.id,
        }));
        const { error: offErr } = await supabase.from('crm_service_offices').insert(officeRows);
        if (offErr) throw offErr;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-services'] });
    },
  });
};

export const useUpdateCRMService = () => {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, office_ids, ...updates }: { id: string; office_ids?: string[]; [key: string]: any }) => {
      const { error } = await supabase.from('crm_services').update(updates).eq('id', id).eq('organization_id', currentOrg!.id);
      if (error) throw error;

      if (office_ids !== undefined) {
        await supabase.from('crm_service_offices').delete().eq('service_id', id);
        if (office_ids.length > 0) {
          const officeRows = office_ids.map(oid => ({
            service_id: id,
            office_id: oid,
            organization_id: currentOrg!.id,
          }));
          const { error: offErr } = await supabase.from('crm_service_offices').insert(officeRows);
          if (offErr) throw offErr;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-services'] });
      queryClient.invalidateQueries({ queryKey: ['crm-service'] });
    },
  });
};

export const useDeleteCRMService = () => {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_services').delete().eq('id', id).eq('organization_id', currentOrg!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-services'] });
    },
  });
};

// ─── Partners ─────────────────────────────────────────

export const useCRMPartners = (filters: CRMPartnerFilters = {}) => {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ['crm-partners', orgId, filters],
    queryFn: async () => {
      let query = supabase
        .from('crm_partners')
        .select('*', { count: 'exact' })
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });

      if (filters.search) {
        const sanitized = filters.search.replace(/[%_\\'"()]/g, '');
        query = query.or(`name.ilike.%${sanitized}%,email.ilike.%${sanitized}%,trading_name.ilike.%${sanitized}%`);
      }
      if (filters.type) query = query.eq('type', filters.type as any);
      if (filters.contract_status) query = query.eq('contract_status', filters.contract_status as any);

      const page = filters.page || 1;
      const perPage = filters.per_page || 20;
      const from = (page - 1) * perPage;
      query = query.range(from, from + perPage - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data as unknown as CRMPartner[], count: count || 0 };
    },
    enabled: !!orgId,
  });
};

export const useCRMPartner = (id: string | null) => {
  const { currentOrg } = useOrganization();
  return useQuery({
    queryKey: ['crm-partner', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_partners')
        .select('*')
        .eq('id', id!)
        .eq('organization_id', currentOrg!.id)
        .single();
      if (error) throw error;
      return data as unknown as CRMPartner;
    },
    enabled: !!id && !!currentOrg?.id,
  });
};

export const useCreateCRMPartner = () => {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<CRMPartner>) => {
      const { data, error } = await supabase
        .from('crm_partners')
        .insert({ ...input, organization_id: currentOrg!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-partners'] });
    },
  });
};

export const useUpdateCRMPartner = () => {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from('crm_partners').update(updates).eq('id', id).eq('organization_id', currentOrg!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-partners'] });
      queryClient.invalidateQueries({ queryKey: ['crm-partner'] });
    },
  });
};

export const useDeleteCRMPartner = () => {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_partners').delete().eq('id', id).eq('organization_id', currentOrg!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-partners'] });
    },
  });
};

// ─── Service Applications ─────────────────────────────

export const useServiceApplications = (filters: { status?: string; service_id?: string; page?: number; per_page?: number } = {}) => {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ['service-applications', orgId, filters],
    queryFn: async () => {
      let query = supabase
        .from('service_applications')
        .select('*, service:crm_services(id, name, category), office:offices(id, name), agent_partner:crm_partners(id, name), crm_contact:crm_contacts(id, first_name, last_name)', { count: 'exact' })
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });

      if (filters.status) query = query.eq('status', filters.status as any);
      if (filters.service_id) query = query.eq('service_id', filters.service_id);

      const page = filters.page || 1;
      const perPage = filters.per_page || 20;
      const from = (page - 1) * perPage;
      query = query.range(from, from + perPage - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data as unknown as ServiceApplication[], count: count || 0 };
    },
    enabled: !!orgId,
  });
};
