/**
 * Forms CRUD data hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Form, FormNode, LogicRule, FormulaDefinition, FormTheme, FormSettings, FormSubmission } from '@/types/forms';

// ============= Forms List =============

export function useForms() {
  const { currentOrg } = useOrganization();
  return useQuery({
    queryKey: ['forms', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Form[];
    },
    enabled: !!currentOrg?.id,
  });
}

// ============= Single Form =============

export function useForm(formId: string | undefined) {
  const { currentOrg } = useOrganization();
  return useQuery({
    queryKey: ['form', formId],
    queryFn: async () => {
      if (!formId || !currentOrg?.id) return null;
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .eq('organization_id', currentOrg.id)
        .single();
      if (error) throw error;
      return data as unknown as Form;
    },
    enabled: !!formId && !!currentOrg?.id,
  });
}

// ============= Create Form =============

export function useCreateForm() {
  const { currentOrg } = useOrganization();
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      if (!currentOrg?.id || !user?.id) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('forms')
        .insert({
          organization_id: currentOrg.id,
          name,
          slug,
          created_by: user.id,
          status: 'draft',
          settings: {},
          theme: {},
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Form;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forms', currentOrg?.id] });
      toast.success('Form created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ============= Update Form =============

export function useUpdateForm() {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Form> & { id: string }) => {
      const { error } = await supabase
        .from('forms')
        .update(updates as Record<string, unknown>)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['form', vars.id] });
      qc.invalidateQueries({ queryKey: ['forms', currentOrg?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ============= Delete Form =============

export function useDeleteForm() {
  const { currentOrg } = useOrganization();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('forms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forms', currentOrg?.id] });
      toast.success('Form deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ============= Save Form Version (draft save) =============

export function useSaveFormDraft() {
  const { currentOrg } = useOrganization();
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      formId,
      layoutTree,
      logicRules,
      calculations,
      theme,
      settings,
      name,
    }: {
      formId: string;
      layoutTree: FormNode[];
      logicRules: LogicRule[];
      calculations: FormulaDefinition[];
      theme: FormTheme;
      settings: FormSettings;
      name?: string;
    }) => {
      if (!currentOrg?.id || !user?.id) throw new Error('Not authenticated');

      // Update form metadata
      const formUpdates: Record<string, unknown> = { theme, settings };
      if (name) formUpdates.name = name;
      await supabase.from('forms').update(formUpdates).eq('id', formId);

      // Upsert a draft version (version_number = 0 means draft)
      const { data: existing } = await supabase
        .from('form_versions')
        .select('id')
        .eq('form_id', formId)
        .eq('version_number', 0)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('form_versions')
          .update({
            layout_tree: JSON.parse(JSON.stringify(layoutTree)),
            logic_rules: JSON.parse(JSON.stringify(logicRules)),
            calculations: JSON.parse(JSON.stringify(calculations)),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('form_versions').insert([{
          form_id: formId,
          organization_id: currentOrg.id,
          version_number: 0,
          layout_tree: JSON.parse(JSON.stringify(layoutTree)),
          logic_rules: JSON.parse(JSON.stringify(logicRules)),
          calculations: JSON.parse(JSON.stringify(calculations)),
          created_by: user.id,
        }]);
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['form', vars.formId] });
      toast.success('Form saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ============= Publish Form =============

export function usePublishForm() {
  const { currentOrg } = useOrganization();
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      formId,
      layoutTree,
      logicRules,
      calculations,
    }: {
      formId: string;
      layoutTree: FormNode[];
      logicRules: LogicRule[];
      calculations: FormulaDefinition[];
    }) => {
      if (!currentOrg?.id || !user?.id) throw new Error('Not authenticated');

      // Get current max version
      const { data: versions } = await supabase
        .from('form_versions')
        .select('version_number')
        .eq('form_id', formId)
        .gt('version_number', 0)
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVersion = (versions?.[0]?.version_number ?? 0) + 1;

      // Create published version
      const { data: version, error: vErr } = await supabase
        .from('form_versions')
        .insert([{
          form_id: formId,
          organization_id: currentOrg.id,
          version_number: nextVersion,
          layout_tree: JSON.parse(JSON.stringify(layoutTree)),
          logic_rules: JSON.parse(JSON.stringify(logicRules)),
          calculations: JSON.parse(JSON.stringify(calculations)),
          created_by: user.id,
        }])
        .select()
        .single();
      if (vErr) throw vErr;

      // Update form status
      const { error: fErr } = await supabase
        .from('forms')
        .update({ published_version_id: version.id, status: 'published' })
        .eq('id', formId);
      if (fErr) throw fErr;

      return version;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['form', vars.formId] });
      qc.invalidateQueries({ queryKey: ['forms', currentOrg?.id] });
      toast.success('Form published!');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ============= Load Draft Version =============

export function useFormDraftVersion(formId: string | undefined) {
  return useQuery({
    queryKey: ['form-draft', formId],
    queryFn: async () => {
      if (!formId) return null;
      // Try draft (version 0) first, then latest published
      const { data } = await supabase
        .from('form_versions')
        .select('*')
        .eq('form_id', formId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!formId,
  });
}

// ============= Submissions =============

export function useFormSubmissions(formId: string | undefined) {
  const { currentOrg } = useOrganization();
  return useQuery({
    queryKey: ['form-submissions', formId],
    queryFn: async () => {
      if (!formId || !currentOrg?.id) return [];
      const { data, error } = await supabase
        .from('form_submissions')
        .select('*')
        .eq('form_id', formId)
        .eq('organization_id', currentOrg.id)
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FormSubmission[];
    },
    enabled: !!formId && !!currentOrg?.id,
  });
}

export function useUpdateSubmissionStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, formId }: { id: string; status: string; formId: string }) => {
      const { error } = await supabase
        .from('form_submissions')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      return formId;
    },
    onSuccess: (formId) => {
      qc.invalidateQueries({ queryKey: ['form-submissions', formId] });
      toast.success('Status updated');
    },
  });
}
