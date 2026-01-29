/**
 * Employee domain service hooks
 * Handles all employee-related data fetching and mutations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errorUtils';
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
    staleTime: 2 * 60 * 1000, // 2 minutes - employee list changes infrequently
    gcTime: 10 * 60 * 1000,
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
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!employeeId && !!currentOrg?.id,
  });
};

export const useEmployeeProfile = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: ['employee-profile', employeeId],
    staleTime: 2 * 60 * 1000, // 2 minutes
    queryFn: async () => {
      if (!employeeId) return null;

      // Use the secure RPC function that enforces field-level access control
      const { data: employeeData, error: rpcError } = await supabase
        .rpc('get_employee_for_viewer', { target_employee_id: employeeId });

      if (rpcError) throw rpcError;
      
      const employee = employeeData?.[0];
      if (!employee) return null;

      // Fetch related data (profile, office, manager) separately
      const { data: relatedData, error: relatedError } = await supabase
        .from('employees')
        .select(`
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

      if (relatedError) throw relatedError;

      // Map RPC response fields to expected format with field-level security applied
      return {
        id: employee.emp_id,
        user_id: employee.emp_user_id,
        position: employee.emp_position,
        department: employee.emp_department,
        office_id: employee.emp_office_id,
        manager_id: employee.emp_manager_id,
        join_date: employee.emp_join_date,
        status: employee.emp_status,
        superpowers: employee.emp_superpowers,
        phone: employee.emp_phone,
        personal_email: employee.emp_personal_email,
        street: employee.emp_street,
        city: employee.emp_city,
        state: employee.emp_state,
        postcode: employee.emp_postcode,
        country: employee.emp_country,
        date_of_birth: employee.emp_date_of_birth,
        // Financial fields - will be NULL unless viewer is self/HR/admin
        salary: employee.emp_salary,
        remuneration: employee.emp_remuneration,
        remuneration_currency: employee.emp_remuneration_currency,
        id_number: employee.emp_id_number,
        tax_number: employee.emp_tax_number,
        bank_details: employee.emp_bank_details,
        emergency_contact_name: employee.emp_emergency_contact_name,
        emergency_contact_phone: employee.emp_emergency_contact_phone,
        emergency_contact_relationship: employee.emp_emergency_contact_relationship,
        position_effective_date: null,
        // Related data from second query
        profiles: relatedData?.profiles,
        office: relatedData?.office,
        manager: relatedData?.manager,
      };
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
      const message = getErrorMessage(error, 'Failed to update employee');
      toast.error(message);
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
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!managerId && !!currentOrg?.id,
  });
};
