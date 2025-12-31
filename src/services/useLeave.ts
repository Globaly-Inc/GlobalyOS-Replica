/**
 * Leave management domain service hooks
 * Handles all leave-related data fetching and mutations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from './useCurrentEmployee';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errorUtils';
import type { 
  LeaveType, 
  LeaveTypeBalanceWithType, 
  LeaveRequestWithEmployee,
  LeaveRequestStatus,
  HalfDayType,
} from '@/types';

// Fetch leave types for organization
export const useLeaveTypes = (activeOnly = true) => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['leave-types', currentOrg?.id, activeOnly],
    queryFn: async (): Promise<LeaveType[]> => {
      if (!currentOrg?.id) return [];

      let query = supabase
        .from('leave_types')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('name');

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as LeaveType[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - leave types rarely change
    enabled: !!currentOrg?.id,
  });
};

// Fetch leave balances for an employee
export const useLeaveBalances = (employeeId: string | undefined, year?: number) => {
  const currentYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ['leave-balances', employeeId, currentYear],
    queryFn: async (): Promise<LeaveTypeBalanceWithType[]> => {
      if (!employeeId) return [];

      const { data, error } = await supabase
        .from('leave_type_balances')
        .select(`
          id,
          employee_id,
          leave_type_id,
          organization_id,
          balance,
          year,
          created_at,
          updated_at,
          leave_type:leave_types!inner(
            id,
            organization_id,
            name,
            category,
            description,
            default_days,
            min_days_advance,
            applies_to_all_offices,
            is_active,
            is_system,
            created_at,
            updated_at
          )
        `)
        .eq('employee_id', employeeId)
        .eq('year', currentYear);

      if (error) throw error;

      return data as LeaveTypeBalanceWithType[];
    },
    staleTime: 30 * 1000, // 30 seconds - may change after approvals
    enabled: !!employeeId,
  });
};

// Fetch leave requests
interface UseLeaveRequestsOptions {
  employeeId?: string;
  status?: LeaveRequestStatus | 'all';
  startDate?: string;
  endDate?: string;
}

export const useLeaveRequests = (options: UseLeaveRequestsOptions = {}) => {
  const { currentOrg } = useOrganization();
  const { employeeId, status = 'all', startDate, endDate } = options;

  return useQuery({
    queryKey: ['leave-requests', currentOrg?.id, employeeId, status, startDate, endDate],
    queryFn: async (): Promise<LeaveRequestWithEmployee[]> => {
      if (!currentOrg?.id) return [];

      let query = supabase
        .from('leave_requests')
        .select(`
          *,
          employee:employees!leave_requests_employee_id_fkey(
            id,
            manager_id,
            profiles!inner(
              full_name,
              avatar_url
            )
          ),
          reviewer:employees!leave_requests_reviewed_by_fkey(
            profiles(full_name)
          )
        `)
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false });

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      if (startDate) {
        query = query.gte('start_date', startDate);
      }

      if (endDate) {
        query = query.lte('end_date', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as LeaveRequestWithEmployee[];
    },
    staleTime: 30 * 1000, // 30 seconds - active updates
    enabled: !!currentOrg?.id,
  });
};

// Fetch pending leave requests for approval (manager/HR view)
export const usePendingLeaveApprovals = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useQuery({
    queryKey: ['pending-leave-approvals', currentOrg?.id, currentEmployee?.id],
    queryFn: async (): Promise<LeaveRequestWithEmployee[]> => {
      if (!currentOrg?.id) return [];

      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          employee:employees!leave_requests_employee_id_fkey(
            id,
            manager_id,
            profiles!inner(
              full_name,
              avatar_url
            )
          )
        `)
        .eq('organization_id', currentOrg.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data as LeaveRequestWithEmployee[];
    },
    staleTime: 30 * 1000, // 30 seconds - needs freshness
    enabled: !!currentOrg?.id,
  });
};

// Create leave request
interface CreateLeaveRequestInput {
  leave_type: string;
  start_date: string;
  end_date: string;
  days_count: number;
  half_day_type: HalfDayType;
  reason: string;
}

export const useCreateLeaveRequest = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (input: CreateLeaveRequestInput) => {
      if (!currentOrg?.id || !currentEmployee?.id) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase
        .from('leave_requests')
        .insert({
          ...input,
          employee_id: currentEmployee.id,
          organization_id: currentOrg.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-leave-approvals'] });
      toast.success('Leave request submitted');
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to submit leave request');
      toast.error(message);
      console.error('Create leave request error:', error);
    },
  });
};

// Update leave request status (approve/reject)
interface UpdateLeaveStatusInput {
  requestId: string;
  status: 'approved' | 'rejected';
}

export const useUpdateLeaveStatus = () => {
  const queryClient = useQueryClient();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({ requestId, status }: UpdateLeaveStatusInput) => {
      if (!currentEmployee?.id) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase
        .from('leave_requests')
        .update({
          status,
          reviewed_by: currentEmployee.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-leave-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      toast.success(`Leave request ${variables.status}`);
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to update leave request');
      toast.error(message);
      console.error('Update leave status error:', error);
    },
  });
};

// Cancel leave request
export const useCancelLeaveRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('leave_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-leave-approvals'] });
      toast.success('Leave request cancelled');
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to cancel leave request');
      toast.error(message);
      console.error('Cancel leave request error:', error);
    },
  });
};
