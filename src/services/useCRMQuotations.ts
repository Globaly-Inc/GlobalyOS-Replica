/**
 * CRM Quotations - React Query hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from './useCurrentEmployee';
import type {
  CRMQuotation,
  CRMQuotationOption,
  CRMQuotationOptionService,
  CRMQuotationServiceFee,
  CRMQuotationComment,
  CRMQuotationSettings,
  QuotationFilters,
  QuotationStatus,
} from '@/types/crm-quotation';
import { toast } from 'sonner';

function useEmployee() {
  const q = useCurrentEmployee();
  return q.data;
}

// ─── List Quotations ──────────────────────────────────

export function useCRMQuotations(filters: QuotationFilters = {}) {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ['crm-quotations', orgId, filters],
    queryFn: async () => {
      if (!orgId) return { data: [] as CRMQuotation[], count: 0 };

      let query = supabase
        .from('crm_quotations')
        .select(`
          *,
          contact:crm_contacts!crm_quotations_contact_id_fkey(id, first_name, last_name, email),
          company:crm_companies!crm_quotations_company_id_fkey(id, name),
          assignee:employees!crm_quotations_assignee_id_fkey(id, profiles(full_name, avatar_url))
        `, { count: 'exact' })
        .eq('organization_id', orgId)
        .eq('is_template', false)
        .order('updated_at', { ascending: false });

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.assignee_id) query = query.eq('assignee_id', filters.assignee_id);
      if (filters.contact_id) query = query.eq('contact_id', filters.contact_id);
      if (filters.search) {
        const s = filters.search.replace(/[%_\\'"()]/g, '');
        query = query.or(`quotation_number.ilike.%${s}%`);
      }
      if (filters.date_from) query = query.gte('created_at', filters.date_from);
      if (filters.date_to) query = query.lte('created_at', filters.date_to);

      const page = filters.page || 1;
      const perPage = filters.per_page || 25;
      query = query.range((page - 1) * perPage, page * perPage - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: (data || []) as unknown as CRMQuotation[], count: count || 0 };
    },
    enabled: !!orgId,
  });
}

// ─── Single Quotation Detail ──────────────────────────

export function useCRMQuotationDetail(id: string | undefined) {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ['crm-quotation', id],
    queryFn: async () => {
      if (!orgId || !id) return null;

      const { data: quotation, error } = await supabase
        .from('crm_quotations')
        .select(`
          *,
          contact:crm_contacts!crm_quotations_contact_id_fkey(id, first_name, last_name, email, avatar_url, phone),
          company:crm_companies!crm_quotations_company_id_fkey(id, name),
          assignee:employees!crm_quotations_assignee_id_fkey(id, profiles(full_name, avatar_url))
        `)
        .eq('id', id)
        .eq('organization_id', orgId)
        .single();
      if (error) throw error;

      // Fetch options
      const { data: options } = await supabase
        .from('crm_quotation_options')
        .select('*')
        .eq('quotation_id', id)
        .eq('organization_id', orgId)
        .order('sort_order');

      // Fetch option services
      const optionIds = (options || []).map(o => o.id);
      let services: any[] = [];
      if (optionIds.length > 0) {
        const { data: svcData } = await supabase
          .from('crm_quotation_option_services')
          .select(`
            *,
            service:crm_services!crm_quotation_option_services_service_id_fkey(id, name),
            partner:crm_partners!crm_quotation_option_services_partner_id_fkey(id, name)
          `)
          .in('option_id', optionIds)
          .eq('organization_id', orgId)
          .order('sort_order');
        services = svcData || [];
      }

      // Fetch fees
      const serviceIds = services.map(s => s.id);
      let fees: any[] = [];
      if (serviceIds.length > 0) {
        const { data: feeData } = await supabase
          .from('crm_quotation_service_fees')
          .select('*')
          .in('option_service_id', serviceIds)
          .eq('organization_id', orgId);
        fees = feeData || [];
      }

      // Assemble nested structure
      const servicesWithFees = services.map(s => ({
        ...s,
        fees: fees.filter(f => f.option_service_id === s.id),
      }));

      const optionsWithServices = (options || []).map(o => ({
        ...o,
        services: servicesWithFees.filter(s => s.option_id === o.id),
      }));

      return {
        ...quotation,
        options: optionsWithServices,
      } as unknown as CRMQuotation;
    },
    enabled: !!orgId && !!id,
  });
}

// ─── Create Quotation ─────────────────────────────────

export function useCreateQuotation() {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  const employee = useEmployee();

  return useMutation({
    mutationFn: async (data: Partial<CRMQuotation>) => {
      const orgId = currentOrg?.id;
      if (!orgId) throw new Error('No organization');

      const { data: result, error } = await supabase
        .from('crm_quotations')
        .insert({
          organization_id: orgId,
          office_id: data.office_id || employee?.office_id || null,
          contact_id: data.contact_id || null,
          company_id: data.company_id || null,
          assignee_id: data.assignee_id || employee?.id || null,
          currency: data.currency || 'AUD',
          valid_until: data.valid_until || null,
          notes: data.notes || null,
          cover_letter: data.cover_letter || null,
          created_by: employee?.id || null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-quotations'] });
      toast.success('Quotation created');
    },
    onError: (err: any) => toast.error(err.message),
  });
}

// ─── Update Quotation ─────────────────────────────────

export function useUpdateQuotation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CRMQuotation> & { id: string }) => {
      const { error } = await supabase
        .from('crm_quotations')
        .update(data as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['crm-quotation', vars.id] });
      qc.invalidateQueries({ queryKey: ['crm-quotations'] });
      toast.success('Quotation updated');
    },
    onError: (err: any) => toast.error(err.message),
  });
}

// ─── Delete Quotation ─────────────────────────────────

export function useDeleteQuotation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_quotations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-quotations'] });
      toast.success('Quotation deleted');
    },
    onError: (err: any) => toast.error(err.message),
  });
}

// ─── Quotation Options CRUD ───────────────────────────

export function useAddQuotationOption() {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async (data: { quotation_id: string; name: string; sort_order?: number }) => {
      const { data: result, error } = await supabase
        .from('crm_quotation_options')
        .insert({
          quotation_id: data.quotation_id,
          organization_id: currentOrg!.id,
          name: data.name,
          sort_order: data.sort_order || 0,
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['crm-quotation', vars.quotation_id] });
    },
  });
}

export function useDeleteQuotationOption() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quotation_id }: { id: string; quotation_id: string }) => {
      const { error } = await supabase.from('crm_quotation_options').delete().eq('id', id);
      if (error) throw error;
      return quotation_id;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['crm-quotation', vars.quotation_id] });
    },
  });
}

// ─── Option Services CRUD ─────────────────────────────

export function useAddOptionService() {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async (data: {
      option_id: string;
      quotation_id: string;
      service_id?: string | null;
      service_name: string;
      partner_id?: string | null;
      sort_order?: number;
    }) => {
      const { data: result, error } = await supabase
        .from('crm_quotation_option_services')
        .insert({
          option_id: data.option_id,
          organization_id: currentOrg!.id,
          service_id: data.service_id || null,
          service_name: data.service_name,
          partner_id: data.partner_id || null,
          sort_order: data.sort_order || 0,
        })
        .select()
        .single();
      if (error) throw error;
      return { ...result, quotation_id: data.quotation_id };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['crm-quotation', vars.quotation_id] });
    },
  });
}

export function useDeleteOptionService() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quotation_id }: { id: string; quotation_id: string }) => {
      const { error } = await supabase.from('crm_quotation_option_services').delete().eq('id', id);
      if (error) throw error;
      return quotation_id;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['crm-quotation', vars.quotation_id] });
    },
  });
}

export function useUpdateQuotationOption() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quotation_id, ...data }: { id: string; quotation_id: string; name?: string; description?: string }) => {
      const { error } = await supabase
        .from('crm_quotation_options')
        .update(data as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['crm-quotation', vars.quotation_id] });
    },
  });
}

// ─── Service Fees CRUD ────────────────────────────────

export function useAddServiceFee() {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async (data: {
      option_service_id: string;
      quotation_id: string;
      fee_name: string;
      amount: number;
      tax_mode?: 'inclusive' | 'exclusive';
      tax_rate?: number;
      revenue_type?: string;
    }) => {
      const taxRate = data.tax_rate || 0;
      const taxMode = data.tax_mode || 'exclusive';
      let taxAmount = 0;
      let totalAmount = data.amount;

      if (taxMode === 'inclusive') {
        const base = data.amount / (1 + taxRate / 100);
        taxAmount = Math.round((data.amount - base) * 100) / 100;
      } else {
        taxAmount = Math.round(data.amount * (taxRate / 100) * 100) / 100;
        totalAmount = data.amount + taxAmount;
      }

      const { data: result, error } = await supabase
        .from('crm_quotation_service_fees')
        .insert({
          option_service_id: data.option_service_id,
          organization_id: currentOrg!.id,
          fee_name: data.fee_name,
          amount: data.amount,
          tax_mode: taxMode as any,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total_amount: Math.round(totalAmount * 100) / 100,
          revenue_type: (data.revenue_type || 'revenue_from_client') as any,
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['crm-quotation', vars.quotation_id] });
    },
  });
}

export function useDeleteServiceFee() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quotation_id }: { id: string; quotation_id: string }) => {
      const { error } = await supabase.from('crm_quotation_service_fees').delete().eq('id', id);
      if (error) throw error;
      return quotation_id;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['crm-quotation', vars.quotation_id] });
    },
  });
}

// ─── Comments ─────────────────────────────────────────

export function useCRMQuotationComments(quotationId: string | undefined) {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ['crm-quotation-comments', quotationId],
    queryFn: async () => {
      if (!orgId || !quotationId) return [];
      const { data, error } = await supabase
        .from('crm_quotation_comments')
        .select('*')
        .eq('quotation_id', quotationId)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as CRMQuotationComment[];
    },
    enabled: !!orgId && !!quotationId,
  });
}

export function useAddQuotationComment() {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  const employee = useEmployee();

  return useMutation({
    mutationFn: async (data: { quotation_id: string; content: string }) => {
      const { error } = await supabase
        .from('crm_quotation_comments')
        .insert({
          quotation_id: data.quotation_id,
          organization_id: currentOrg!.id,
          author_type: 'staff' as any,
          author_id: employee?.id || null,
          author_name: employee?.profiles?.full_name || 'Staff',
          content: data.content,
        });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['crm-quotation-comments', vars.quotation_id] });
    },
  });
}

// ─── Quotation Settings ───────────────────────────────

export function useCRMQuotationSettings() {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ['crm-quotation-settings', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('crm_quotation_settings')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as CRMQuotationSettings | null;
    },
    enabled: !!orgId,
  });
}

// ─── Templates ────────────────────────────────────────

export function useCRMQuotationTemplates() {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ['crm-quotation-templates', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('crm_quotations')
        .select('id, template_name, currency, notes, created_at')
        .eq('organization_id', orgId)
        .eq('is_template', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });
}

// ─── Send Quotation ───────────────────────────────────

export function useSendQuotation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Generate a public token and update status
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { error } = await supabase
        .from('crm_quotations')
        .update({
          status: 'sent' as any,
          public_token: token,
          token_expires_at: expiresAt.toISOString(),
          sent_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
      return { token };
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['crm-quotation', id] });
      qc.invalidateQueries({ queryKey: ['crm-quotations'] });
      toast.success('Quotation sent');
    },
    onError: (err: any) => toast.error(err.message),
  });
}
