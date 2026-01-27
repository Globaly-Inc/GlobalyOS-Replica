/**
 * Office Leave Types domain service hooks
 * Handles per-office leave type configuration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errorUtils';

export interface OfficeLeaveType {
  id: string;
  office_id: string;
  organization_id: string;
  name: string;
  category: 'paid' | 'unpaid';
  description: string | null;
  default_days: number;
  min_days_advance: number;
  max_negative_days: number;
  applies_to_gender: 'all' | 'male' | 'female';
  applies_to_employment_types: string[] | null;
  carry_forward_mode: string;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

// Fetch office leave types for a specific office
export const useOfficeLeaveTypes = (officeId: string | undefined, activeOnly = true) => {
  return useQuery({
    queryKey: ['office-leave-types', officeId, activeOnly],
    queryFn: async (): Promise<OfficeLeaveType[]> => {
      if (!officeId) return [];

      let query = supabase
        .from('office_leave_types')
        .select('*')
        .eq('office_id', officeId)
        .order('name');

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as OfficeLeaveType[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!officeId,
  });
};

// Fetch all office leave types for an organization (for balances/requests)
export const useOrganizationOfficeLeaveTypes = (activeOnly = true) => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['org-office-leave-types', currentOrg?.id, activeOnly],
    queryFn: async (): Promise<OfficeLeaveType[]> => {
      if (!currentOrg?.id) return [];

      let query = supabase
        .from('office_leave_types')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('name');

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as OfficeLeaveType[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!currentOrg?.id,
  });
};

// Create office leave type
interface CreateOfficeLeaveTypeInput {
  office_id: string;
  name: string;
  category: 'paid' | 'unpaid';
  description?: string;
  default_days: number;
  min_days_advance?: number;
  max_negative_days?: number;
  applies_to_gender?: 'all' | 'male' | 'female';
  applies_to_employment_types?: string[];
  carry_forward_mode?: string;
}

export const useCreateOfficeLeaveType = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async (input: CreateOfficeLeaveTypeInput) => {
      if (!currentOrg?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('office_leave_types')
        .insert({
          ...input,
          organization_id: currentOrg.id,
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['office-leave-types', variables.office_id] });
      queryClient.invalidateQueries({ queryKey: ['org-office-leave-types'] });
      toast.success('Leave type created');
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to create leave type');
      toast.error(message);
    },
  });
};

// Update office leave type
interface UpdateOfficeLeaveTypeInput {
  id: string;
  office_id: string;
  name?: string;
  category?: 'paid' | 'unpaid';
  description?: string | null;
  default_days?: number;
  min_days_advance?: number;
  max_negative_days?: number;
  applies_to_gender?: 'all' | 'male' | 'female';
  applies_to_employment_types?: string[] | null;
  carry_forward_mode?: string;
  is_active?: boolean;
}

export const useUpdateOfficeLeaveType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, office_id, ...updates }: UpdateOfficeLeaveTypeInput) => {
      const { error } = await supabase
        .from('office_leave_types')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      return { office_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['office-leave-types', data.office_id] });
      queryClient.invalidateQueries({ queryKey: ['org-office-leave-types'] });
      toast.success('Leave type updated');
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to update leave type');
      toast.error(message);
    },
  });
};

// Delete office leave type
export const useDeleteOfficeLeaveType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, office_id }: { id: string; office_id: string }) => {
      const { error } = await supabase
        .from('office_leave_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { office_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['office-leave-types', data.office_id] });
      queryClient.invalidateQueries({ queryKey: ['org-office-leave-types'] });
      toast.success('Leave type deleted');
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to delete leave type');
      toast.error(message);
    },
  });
};

// Copy templates to office
export const useCopyTemplatesToOffice = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async ({ officeId, countryCode }: { officeId: string; countryCode?: string }) => {
      if (!currentOrg?.id) throw new Error('Not authenticated');

      // Fetch global templates with country defaults
      const { data: templates, error: fetchError } = await supabase
        .from('template_leave_types')
        .select(`
          *,
          country_defaults:template_leave_type_country_defaults(
            country_code, 
            default_days
          )
        `)
        .eq('is_active', true)
        .is('country_code', null)
        .order('sort_order');

      if (fetchError) throw fetchError;

      if (!templates || templates.length === 0) {
        throw new Error('No templates available');
      }

      // Insert as office leave types with country-specific defaults
      const { error: insertError } = await supabase
        .from('office_leave_types')
        .insert(
          templates.map(t => {
            // Check for country-specific default
            const countryOverride = countryCode && t.country_defaults
              ? (t.country_defaults as Array<{ country_code: string; default_days: number }>)
                  .find(cd => cd.country_code === countryCode)
              : null;
            
            return {
              office_id: officeId,
              organization_id: currentOrg.id,
              name: t.name,
              category: t.category,
              description: t.description,
              // Apply country-specific default if available, otherwise use global template default
              default_days: countryOverride?.default_days ?? t.default_days,
              min_days_advance: t.min_days_advance,
              max_negative_days: t.max_negative_days,
              applies_to_gender: t.applies_to_gender,
              applies_to_employment_types: t.applies_to_employment_types,
              carry_forward_mode: t.carry_forward_mode,
              is_active: true,
            };
          })
        );

      if (insertError) throw insertError;

      return { officeId, count: templates.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['office-leave-types', data.officeId] });
      queryClient.invalidateQueries({ queryKey: ['org-office-leave-types'] });
      toast.success(`Added ${data.count} leave types from templates`);
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to copy templates');
      toast.error(message);
    },
  });
};
