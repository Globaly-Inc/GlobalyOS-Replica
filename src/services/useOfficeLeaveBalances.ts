/**
 * Office-aware leave balances service hooks
 * Fetches leave types and balances from office_leave_types table
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

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

export interface LeaveTypeWithBalance extends OfficeLeaveType {
  currentBalance: number;
  availableBalance: number;
  isExhausted: boolean;
}

/**
 * Fetch leave types for an employee based on their office
 * Falls back to org-level leave_types if no office_leave_types exist
 */
export const useEmployeeLeaveTypes = (
  employeeId: string | undefined,
  options?: { enabled?: boolean }
) => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['employee-leave-types', employeeId, currentOrg?.id],
    queryFn: async (): Promise<LeaveTypeWithBalance[]> => {
      if (!employeeId || !currentOrg?.id) return [];

      const currentYear = new Date().getFullYear();

      // Get employee's office, gender, and employment type
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('office_id, gender, employment_type')
        .eq('id', employeeId)
        .single();

      if (empError) throw empError;
      if (!employee) return [];

      // First try to get leave types from office_leave_types
      let leaveTypes: OfficeLeaveType[] = [];

      if (employee.office_id) {
        const { data: officeTypes, error: officeError } = await supabase
          .from('office_leave_types')
          .select('*')
          .eq('office_id', employee.office_id)
          .eq('is_active', true)
          .order('name');

        if (!officeError && officeTypes && officeTypes.length > 0) {
          leaveTypes = officeTypes as OfficeLeaveType[];
        }
      }

      // No office leave types found - return empty array
      // Employees should have office_leave_types configured via their office
      if (leaveTypes.length === 0) {
        return [];
      }

      // Filter by gender and employment type
      const employeeGender = employee.gender;
      const employeeEmploymentType = employee.employment_type;

      const filteredTypes = leaveTypes.filter((type) => {
        // Gender check
        if (type.applies_to_gender !== 'all') {
          if (!employeeGender || employeeGender !== type.applies_to_gender) {
            return false;
          }
        }

        // Employment type check
        if (type.applies_to_employment_types && type.applies_to_employment_types.length > 0) {
          if (!employeeEmploymentType || !type.applies_to_employment_types.includes(employeeEmploymentType)) {
            return false;
          }
        }

        return true;
      });

      // Fetch balances for this employee - use only office_leave_type_id
      const { data: balances } = await supabase
        .from('leave_type_balances')
        .select('office_leave_type_id, balance')
        .eq('employee_id', employeeId)
        .eq('year', currentYear)
        .not('office_leave_type_id', 'is', null);

      // Create balance map using office_leave_type_id
      const balanceByOfficeLeaveTypeId = new Map<string, number>();
      balances?.forEach((b) => {
        if (b.office_leave_type_id) {
          balanceByOfficeLeaveTypeId.set(b.office_leave_type_id, b.balance);
        }
      });

      // Combine types with balances
      const typesWithBalance: LeaveTypeWithBalance[] = filteredTypes.map((type) => {
        const currentBalance = balanceByOfficeLeaveTypeId.get(type.id) ?? 0;
        const maxNegative = type.max_negative_days || 0;
        const availableBalance = currentBalance + maxNegative;
        const isExhausted = availableBalance <= 0;

        return {
          ...type,
          currentBalance,
          availableBalance,
          isExhausted,
        };
      });

      return typesWithBalance;
    },
    staleTime: 30 * 1000,
    enabled: options?.enabled !== false && !!employeeId && !!currentOrg?.id,
  });
};

/**
 * Hook to initialize leave balances for an employee using office leave types
 */
export const useInitializeEmployeeOfficeBalances = () => {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      year = new Date().getFullYear(),
    }: {
      employeeId: string;
      year?: number;
    }) => {
      if (!currentOrg?.id) throw new Error('No organization');

      // Get employee's office
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('office_id, gender, employment_type')
        .eq('id', employeeId)
        .single();

      if (empError) throw empError;
      if (!employee?.office_id) throw new Error('Employee has no office assigned');

      // Get office leave types
      const { data: officeTypes, error: typesError } = await supabase
        .from('office_leave_types')
        .select('*')
        .eq('office_id', employee.office_id)
        .eq('is_active', true);

      if (typesError) throw typesError;
      if (!officeTypes?.length) throw new Error('No leave types configured for this office');

      // Get current user for logging
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('Not authenticated');

      const { data: creator } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .eq('organization_id', currentOrg.id)
        .single();

      if (!creator) throw new Error('Employee not found');

      // Check existing balances
      const { data: existingBalances } = await supabase
        .from('leave_type_balances')
        .select('office_leave_type_id')
        .eq('employee_id', employeeId)
        .eq('year', year);

      const existingSet = new Set(existingBalances?.map((b) => b.office_leave_type_id) || []);

      // Filter types by eligibility
      const eligibleTypes = officeTypes.filter((type) => {
        // Skip if balance already exists
        if (existingSet.has(type.id)) return false;

        // Gender check
        if (type.applies_to_gender !== 'all' && employee.gender !== type.applies_to_gender) {
          return false;
        }

        // Employment type check
        if (type.applies_to_employment_types?.length && employee.employment_type) {
          if (!type.applies_to_employment_types.includes(employee.employment_type)) {
            return false;
          }
        }

        return true;
      });

      // Create balance logs (trigger will create balances)
      const logsToInsert = eligibleTypes.map((type) => ({
        employee_id: employeeId,
        organization_id: currentOrg.id,
        leave_type: type.name,
        office_leave_type_id: type.id,
        change_amount: type.default_days,
        previous_balance: 0,
        new_balance: type.default_days,
        reason: `${year} annual allocation`,
        created_by: creator.id,
        effective_date: `${year}-01-01`,
        action: 'year_allocation',
        year: year,
      }));

      if (logsToInsert.length > 0) {
        const { error: logError } = await supabase
          .from('leave_balance_logs')
          .insert(logsToInsert);

        if (logError) throw logError;
      }

      return { balancesCreated: logsToInsert.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['employee-leave-types'] });
      queryClient.invalidateQueries({ queryKey: ['leave-type-balances'] });
      toast.success(`Initialized ${result.balancesCreated} leave balances`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to initialize balances');
    },
  });
};
