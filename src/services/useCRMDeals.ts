import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentEmployee } from './useCurrentEmployee';
import type { CRMDeal, DealFilters, DealStatus } from '@/types/crm-pipeline';
import { toast } from 'sonner';

function useEmployee() {
  const q = useCurrentEmployee();
  return q.data;
}

export function useCRMDeals(filters: DealFilters = {}) {
  const employee = useEmployee();
  const orgId = employee?.organization_id;

  return useQuery({
    queryKey: ['crm-deals', orgId, filters],
    queryFn: async () => {
      if (!orgId) return { data: [] as CRMDeal[], count: 0 };

      let query = supabase
        .from('crm_deals')
        .select(`
          *,
          contact:crm_contacts!crm_deals_contact_id_fkey(id, first_name, last_name, email, avatar_url),
          company:crm_companies!crm_deals_company_id_fkey(id, name),
          assignee:employees!crm_deals_assignee_id_fkey(id, first_name, last_name, avatar_url),
          agent_partner:crm_partners!crm_deals_agent_partner_id_fkey(id, name),
          current_stage:crm_pipeline_stages!crm_deals_current_stage_id_fkey(id, name, color, stage_type, sort_order)
        `, { count: 'exact' })
        .eq('organization_id', orgId)
        .order('updated_at', { ascending: false });

      if (filters.pipeline_id) query = query.eq('pipeline_id', filters.pipeline_id);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.assignee_id) query = query.eq('assignee_id', filters.assignee_id);
      if (filters.agent_partner_id) query = query.eq('agent_partner_id', filters.agent_partner_id);
      if (filters.priority) query = query.eq('priority', filters.priority);
      if (filters.search) query = query.ilike('title', `%${filters.search}%`);

      const page = filters.page || 1;
      const perPage = filters.per_page || 50;
      query = query.range((page - 1) * perPage, page * perPage - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: (data || []) as unknown as CRMDeal[], count: count || 0 };
    },
    enabled: !!orgId,
  });
}

export function useCRMDealsByPipeline(pipelineId: string | undefined) {
  const employee = useEmployee();
  const orgId = employee?.organization_id;

  return useQuery({
    queryKey: ['crm-deals-pipeline', orgId, pipelineId],
    queryFn: async () => {
      if (!orgId || !pipelineId) return [];
      const { data, error } = await supabase
        .from('crm_deals')
        .select(`
          *,
          contact:crm_contacts!crm_deals_contact_id_fkey(id, first_name, last_name, email, avatar_url),
          assignee:employees!crm_deals_assignee_id_fkey(id, first_name, last_name, avatar_url),
          agent_partner:crm_partners!crm_deals_agent_partner_id_fkey(id, name),
          current_stage:crm_pipeline_stages!crm_deals_current_stage_id_fkey(id, name, color, stage_type, sort_order)
        `)
        .eq('organization_id', orgId)
        .eq('pipeline_id', pipelineId)
        .eq('status', 'active')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as CRMDeal[];
    },
    enabled: !!orgId && !!pipelineId,
  });
}

export function useCRMDeal(dealId: string | undefined) {
  const employee = useEmployee();
  const orgId = employee?.organization_id;

  return useQuery({
    queryKey: ['crm-deal', dealId],
    queryFn: async () => {
      if (!dealId || !orgId) return null;
      const { data, error } = await supabase
        .from('crm_deals')
        .select(`
          *,
          contact:crm_contacts!crm_deals_contact_id_fkey(id, first_name, last_name, email, avatar_url),
          company:crm_companies!crm_deals_company_id_fkey(id, name),
          assignee:employees!crm_deals_assignee_id_fkey(id, first_name, last_name, avatar_url),
          agent_partner:crm_partners!crm_deals_agent_partner_id_fkey(id, name),
          current_stage:crm_pipeline_stages!crm_deals_current_stage_id_fkey(id, name, color, stage_type, sort_order)
        `)
        .eq('id', dealId)
        .eq('organization_id', orgId)
        .single();
      if (error) throw error;
      return data as unknown as CRMDeal;
    },
    enabled: !!dealId && !!orgId,
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  const employee = useEmployee();

  return useMutation({
    mutationFn: async (input: {
      pipeline_id: string;
      title: string;
      contact_id?: string;
      company_id?: string;
      assignee_id?: string;
      agent_partner_id?: string;
      current_stage_id?: string;
      deal_value?: number;
      currency?: string;
      priority?: 'low' | 'medium' | 'high';
      service_ids?: string[];
    }) => {
      if (!employee) throw new Error('Not authenticated');
      const { service_ids, ...dealInput } = input;
      const { data, error } = await supabase
        .from('crm_deals')
        .insert({
          ...dealInput,
          organization_id: employee.organization_id,
          created_by: employee.id,
          assignee_id: input.assignee_id || employee.id,
          source: 'staff' as const,
        })
        .select()
        .single();
      if (error) throw error;

      if (service_ids && service_ids.length > 0) {
        const { error: sErr } = await supabase
          .from('crm_deal_services')
          .insert(service_ids.map(sid => ({
            deal_id: data.id,
            service_id: sid,
            organization_id: employee.organization_id,
          })));
        if (sErr) throw sErr;
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-deals'] });
      qc.invalidateQueries({ queryKey: ['crm-deals-pipeline'] });
      toast.success('Deal created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; priority?: 'low' | 'medium' | 'high'; assignee_id?: string | null; contact_id?: string | null; company_id?: string | null; deal_value?: number | null; currency?: string; expected_close_date?: string | null }) => {
      const { error } = await supabase
        .from('crm_deals')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['crm-deals'] });
      qc.invalidateQueries({ queryKey: ['crm-deals-pipeline'] });
      qc.invalidateQueries({ queryKey: ['crm-deal', vars.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useMoveDealStage() {
  const qc = useQueryClient();
  const employee = useEmployee();

  return useMutation({
    mutationFn: async ({ dealId, stageId }: { dealId: string; stageId: string }) => {
      const { error } = await supabase
        .from('crm_deals')
        .update({ current_stage_id: stageId })
        .eq('id', dealId);
      if (error) throw error;

      if (employee) {
        await supabase.from('crm_deal_activity_log').insert({
          deal_id: dealId,
          organization_id: employee.organization_id,
          action_type: 'stage_changed',
          actor_type: 'staff',
          actor_id: employee.id,
          new_value: { stage_id: stageId } as any,
          description: 'Deal moved to new stage',
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-deals'] });
      qc.invalidateQueries({ queryKey: ['crm-deals-pipeline'] });
      qc.invalidateQueries({ queryKey: ['crm-deal'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCloseDeal() {
  const qc = useQueryClient();
  const employee = useEmployee();

  return useMutation({
    mutationFn: async ({ dealId, status, lost_reason, lost_notes, actual_close_date }: {
      dealId: string;
      status: 'won' | 'lost' | 'cancelled';
      lost_reason?: string;
      lost_notes?: string;
      actual_close_date?: string;
    }) => {
      const updates: any = {
        status,
        actual_close_date: actual_close_date || new Date().toISOString().split('T')[0],
      };
      if (status === 'lost' || status === 'cancelled') {
        updates.lost_reason = lost_reason || null;
        updates.lost_notes = lost_notes || null;
      }
      const { error } = await supabase
        .from('crm_deals')
        .update(updates)
        .eq('id', dealId);
      if (error) throw error;

      if (employee) {
        await supabase.from('crm_deal_activity_log').insert({
          deal_id: dealId,
          organization_id: employee.organization_id,
          action_type: `deal_${status}`,
          actor_type: 'staff',
          actor_id: employee.id,
          description: `Deal marked as ${status}`,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-deals'] });
      qc.invalidateQueries({ queryKey: ['crm-deals-pipeline'] });
      qc.invalidateQueries({ queryKey: ['crm-deal'] });
      toast.success('Deal closed');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useReopenDeal() {
  const qc = useQueryClient();
  const employee = useEmployee();

  return useMutation({
    mutationFn: async ({ dealId, stageId }: { dealId: string; stageId: string }) => {
      const { error } = await supabase
        .from('crm_deals')
        .update({
          status: 'active' as DealStatus,
          current_stage_id: stageId,
          lost_reason: null,
          lost_notes: null,
          actual_close_date: null,
        })
        .eq('id', dealId);
      if (error) throw error;

      if (employee) {
        await supabase.from('crm_deal_activity_log').insert({
          deal_id: dealId,
          organization_id: employee.organization_id,
          action_type: 'deal_reopened',
          actor_type: 'staff',
          actor_id: employee.id,
          description: 'Deal reopened',
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-deals'] });
      qc.invalidateQueries({ queryKey: ['crm-deals-pipeline'] });
      qc.invalidateQueries({ queryKey: ['crm-deal'] });
      toast.success('Deal reopened');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Deal Notes ───

export function useDealNotes(dealId: string | undefined) {
  return useQuery({
    queryKey: ['crm-deal-notes', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      const { data, error } = await supabase
        .from('crm_deal_notes')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!dealId,
  });
}

export function useAddDealNote() {
  const qc = useQueryClient();
  const employee = useEmployee();

  return useMutation({
    mutationFn: async (input: { deal_id: string; content: string; is_internal?: boolean; requirement_id?: string }) => {
      if (!employee) throw new Error('Not authenticated');
      const { error } = await supabase.from('crm_deal_notes').insert({
        ...input,
        organization_id: employee.organization_id,
        author_type: 'staff' as const,
        author_id: employee.id,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['crm-deal-notes', vars.deal_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Deal Tasks ───

export function useDealTasks(dealId: string | undefined) {
  return useQuery({
    queryKey: ['crm-deal-tasks', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      const { data, error } = await supabase
        .from('crm_deal_tasks')
        .select(`*, assignee:employees!crm_deal_tasks_assignee_id_fkey(id, first_name, last_name, avatar_url)`)
        .eq('deal_id', dealId)
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
    enabled: !!dealId,
  });
}

export function useAddDealTask() {
  const qc = useQueryClient();
  const employee = useEmployee();

  return useMutation({
    mutationFn: async (input: { deal_id: string; title: string; description?: string; assignee_id?: string; due_date?: string; target_role?: 'assignee' | 'contact' | 'agent'; stage_id?: string; requirement_id?: string }) => {
      if (!employee) throw new Error('Not authenticated');
      const { error } = await supabase.from('crm_deal_tasks').insert({
        ...input,
        organization_id: employee.organization_id,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['crm-deal-tasks', vars.deal_id] });
      toast.success('Task added');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateDealTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, deal_id, ...updates }: { id: string; deal_id: string; [key: string]: any }) => {
      const { error } = await supabase.from('crm_deal_tasks').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['crm-deal-tasks', vars.deal_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Deal Activity Log ───

export function useDealActivityLog(dealId: string | undefined) {
  return useQuery({
    queryKey: ['crm-deal-activity', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      const { data, error } = await supabase
        .from('crm_deal_activity_log')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!dealId,
  });
}

// ─── Deal Documents ───

export function useDealDocuments(dealId: string | undefined) {
  return useQuery({
    queryKey: ['crm-deal-documents', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      const { data, error } = await supabase
        .from('crm_deal_documents')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!dealId,
  });
}

// ─── Deal Fees ───

export function useDealFees(dealId: string | undefined) {
  return useQuery({
    queryKey: ['crm-deal-fees', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      const { data, error } = await supabase
        .from('crm_deal_fees')
        .select('*, instalments:crm_deal_fee_instalments(*)')
        .eq('deal_id', dealId)
        .order('created_at');
      if (error) throw error;
      return data || [];
    },
    enabled: !!dealId,
  });
}

// ─── Deal Requirements ───

export function useDealRequirements(dealId: string | undefined) {
  return useQuery({
    queryKey: ['crm-deal-requirements', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      const { data, error } = await supabase
        .from('crm_deal_requirements')
        .select('*, stage_requirement:crm_stage_requirements(*)')
        .eq('deal_id', dealId)
        .order('created_at');
      if (error) throw error;
      return data || [];
    },
    enabled: !!dealId,
  });
}

export function useUpdateDealRequirement() {
  const qc = useQueryClient();
  const employee = useEmployee();

  return useMutation({
    mutationFn: async ({ id, deal_id, status }: { id: string; deal_id: string; status: string }) => {
      const updates: any = { status };
      if (status === 'completed' && employee) {
        updates.completed_by = employee.id;
        updates.completed_at = new Date().toISOString();
      }
      if (status === 'pending') {
        updates.completed_by = null;
        updates.completed_at = null;
      }
      const { error } = await supabase.from('crm_deal_requirements').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['crm-deal-requirements', vars.deal_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Deal Document Upload ───

export function useUploadDealDocument() {
  const qc = useQueryClient();
  const employee = useEmployee();

  return useMutation({
    mutationFn: async ({ deal_id, file }: { deal_id: string; file: File }) => {
      if (!employee) throw new Error('Not authenticated');
      const filePath = `${employee.organization_id}/${deal_id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('deal-documents')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error } = await supabase.from('crm_deal_documents').insert({
        deal_id,
        organization_id: employee.organization_id,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type || null,
        file_size: file.size,
        uploaded_by_type: 'staff',
        uploaded_by: employee.id,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['crm-deal-documents', vars.deal_id] });
      toast.success('Document uploaded');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateDealDocStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, deal_id, status }: { id: string; deal_id: string; status: 'pending' | 'approved' | 'rejected' }) => {
      const { error } = await supabase.from('crm_deal_documents').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['crm-deal-documents', vars.deal_id] });
      toast.success('Document status updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Deal Fee Mutations ───

export function useAddDealFee() {
  const qc = useQueryClient();
  const employee = useEmployee();

  return useMutation({
    mutationFn: async (input: { deal_id: string; fee_name: string; amount: number; currency?: string }) => {
      if (!employee) throw new Error('Not authenticated');
      const { error } = await supabase.from('crm_deal_fees').insert({
        deal_id: input.deal_id,
        organization_id: employee.organization_id,
        fee_name: input.fee_name,
        amount: input.amount,
        currency: input.currency || 'USD',
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['crm-deal-fees', vars.deal_id] });
      toast.success('Fee added');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAddDealFeeInstalment() {
  const qc = useQueryClient();
  const employee = useEmployee();

  return useMutation({
    mutationFn: async (input: { deal_fee_id: string; amount: number; due_date: string }) => {
      if (!employee) throw new Error('Not authenticated');
      // Get current max instalment_number
      const { data: existing } = await supabase
        .from('crm_deal_fee_instalments')
        .select('instalment_number')
        .eq('deal_fee_id', input.deal_fee_id)
        .order('instalment_number', { ascending: false })
        .limit(1);
      const nextNum = (existing?.[0]?.instalment_number || 0) + 1;

      const { error } = await supabase.from('crm_deal_fee_instalments').insert({
        deal_fee_id: input.deal_fee_id,
        organization_id: employee.organization_id,
        instalment_number: nextNum,
        amount: input.amount,
        due_date: input.due_date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-deal-fees'] });
      toast.success('Instalment added');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
