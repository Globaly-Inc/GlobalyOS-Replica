/**
 * Employee domain service hooks
 * Handles all employee-related data fetching and mutations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import type { EmployeeDirectoryItem } from '@/types';

interface UseEmployeesOptions {
  status?: 'invited' | 'active' | 'inactive' | 'all';
  includeOffice?: boolean;
}

export const useEmployees = (options: UseEmployeesOptions = {}) => {
  const { currentOrg } = useOrganization();
  const { status = 'all', includeOffice = true } = options;

  return useQuery({
    queryKey: ['employees', currentOrg?.id, status, includeOffice],
    queryFn: async () => {
      if (!currentOrg?.id) return [];

      const selectQuery = includeOffice
        ? `id, position, department, status, join_date, office_id,
           profiles!inner(full_name, avatar_url, email),
           office:offices(id, name, city, country)`
        : `id, position, department, status, join_date, office_id,
           profiles!inner(full_name, avatar_url, email)`;

      let query = supabase
        .from('employees')
        .select(selectQuery)
        .eq('organization_id', currentOrg.id);

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    },
    enabled: !!currentOrg?.id,
  });
};

export const useEmployee = (employeeId: string | undefined) => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['employee', employeeId, currentOrg?.id],
    queryFn: async () => {
      if (!employeeId || !currentOrg?.id) return null;

      const { data, error } = await supabase
        .rpc('get_employee_for_viewer', { target_employee_id: employeeId });

      if (error) throw error;

      return data?.[0] || null;
    },
    enabled: !!employeeId && !!currentOrg?.id,
  });
};

export const useEmployeeProfile = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: ['employee-profile', employeeId],
    queryFn: async () => {
      if (!employeeId) return null;

      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          user_id,
          position,
          department,
          office_id,
          manager_id,
          join_date,
          status,
          superpowers,
          phone,
          personal_email,
          street,
          city,
          state,
          postcode,
          country,
          date_of_birth,
          salary,
          remuneration,
          remuneration_currency,
          id_number,
          tax_number,
          bank_details,
          emergency_contact_name,
          emergency_contact_phone,
          emergency_contact_relationship,
          position_effective_date,
          profiles!inner(
            id,
            full_name,
            email,
            avatar_url,
            timezone
          ),
          office:offices(id, name, city, country),
          manager:employees!employees_manager_id_fkey(
            id,
            profiles!inner(full_name, avatar_url)
          )
        `)
        .eq('id', employeeId)
        .single();

      if (error) throw error;

      return data;
    },
    enabled: !!employeeId,
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      employeeId, 
      updates 
    }: { 
      employeeId: string; 
      updates: Record<string, unknown>;
    }) => {
      const { error } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', employeeId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employee-profile', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee updated');
    },
    onError: (error) => {
      toast.error('Failed to update employee');
      console.error('Update employee error:', error);
    },
  });
};

export const useDirectReports = (managerId: string | undefined) => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['direct-reports', managerId, currentOrg?.id],
    queryFn: async () => {
      if (!managerId || !currentOrg?.id) return [];

      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          position,
          department,
          status,
          profiles!inner(
            full_name,
            avatar_url,
            email
          )
        `)
        .eq('organization_id', currentOrg.id)
        .eq('manager_id', managerId)
        .eq('status', 'active');

      if (error) throw error;

      return data || [];
    },
    enabled: !!managerId && !!currentOrg?.id,
  });
};
