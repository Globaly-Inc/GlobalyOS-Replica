import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useEffect } from 'react';

export interface CRMServiceCategory {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  is_default: boolean;
  created_at: string;
}

export const useCRMServiceCategories = () => {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;

  const query = useQuery({
    queryKey: ['crm-service-categories', orgId],
    queryFn: async () => {
      // Ensure defaults exist for this org
      await supabase.rpc('ensure_crm_service_categories_defaults', {
        p_organization_id: orgId!,
      });

      const { data, error } = await supabase
        .from('crm_service_categories')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as unknown as CRMServiceCategory[];
    },
    enabled: !!orgId,
  });

  return query;
};

export const useCreateCRMServiceCategory = () => {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const slug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const { data, error } = await supabase
        .from('crm_service_categories')
        .insert({
          organization_id: currentOrg!.id,
          name: name.trim(),
          slug,
          is_default: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as CRMServiceCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-service-categories'] });
    },
  });
};
