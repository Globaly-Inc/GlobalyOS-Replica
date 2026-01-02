/**
 * Service for detecting employees missing leave balances for a given year
 * with proper eligibility filtering (gender, employment type, office)
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

export interface MissingLeaveType {
  leave_type_id: string;
  leave_type_name: string;
  default_days: number | null;
  carry_forward_mode: string;
  previous_balance: number | null;
  carry_forward_amount: number;
  projected_balance: number;
}

export interface EmployeeMissingBalance {
  employee_id: string;
  full_name: string;
  avatar_url: string | null;
  department: string | null;
  position: string | null;
  gender: string | null;
  employment_type: string | null;
  office_id: string | null;
  missing_leave_types: MissingLeaveType[];
  total_carry_forward: number;
  total_allocation: number;
}

/**
 * Calculate carried forward amount based on mode
 */
const getCarriedForwardAmount = (
  mode: string,
  previousBalance: number
): number => {
  switch (mode) {
    case 'positive_only':
      return Math.max(0, previousBalance);
    case 'negative_only':
      return Math.min(0, previousBalance);
    case 'all':
      return previousBalance;
    case 'none':
    default:
      return 0;
  }
};

/**
 * Hook to fetch employees who are missing leave balances for a given year
 * with proper eligibility filtering
 */
export const useMissingBalances = (year: number) => {
  const { currentOrg } = useOrganization();
  const previousYear = year - 1;

  return useQuery({
    queryKey: ["missing-leave-balances", currentOrg?.id, year],
    queryFn: async (): Promise<EmployeeMissingBalance[]> => {
      if (!currentOrg?.id) return [];

      // 1. Fetch all active employees with their attributes
      const { data: employees, error: empError } = await supabase
        .from("employees")
        .select(`
          id,
          office_id,
          gender,
          employment_type,
          position,
          profiles!inner(full_name, avatar_url)
        `)
        .eq("organization_id", currentOrg.id)
        .eq("status", "active");

      if (empError) throw empError;
      if (!employees?.length) return [];

      // 2. Fetch all active leave types with eligibility rules
      const { data: leaveTypes, error: ltError } = await supabase
        .from("leave_types")
        .select("id, name, default_days, applies_to_all_offices, applies_to_gender, applies_to_employment_types, carry_forward_mode")
        .eq("organization_id", currentOrg.id)
        .eq("is_active", true);

      if (ltError) throw ltError;
      if (!leaveTypes?.length) return [];

      // 3. Fetch existing balances for target year
      const { data: existingBalances } = await supabase
        .from("leave_type_balances")
        .select("employee_id, leave_type_id")
        .eq("organization_id", currentOrg.id)
        .eq("year", year);

      const existingKey = (empId: string, ltId: string) => `${empId}-${ltId}`;
      const existingSet = new Set(
        existingBalances?.map((b) => existingKey(b.employee_id, b.leave_type_id)) || []
      );

      // 4. Fetch previous year balances for carry forward preview
      const { data: prevBalances } = await supabase
        .from("leave_type_balances")
        .select("employee_id, leave_type_id, balance")
        .eq("organization_id", currentOrg.id)
        .eq("year", previousYear);

      const prevBalanceMap = new Map<string, number>();
      prevBalances?.forEach((b) => {
        prevBalanceMap.set(existingKey(b.employee_id, b.leave_type_id), b.balance);
      });

      // 5. Fetch leave type office mappings
      const { data: officeMappings } = await supabase
        .from("leave_type_offices")
        .select("leave_type_id, office_id");

      const officeMappingsByType = new Map<string, Set<string>>();
      officeMappings?.forEach((m) => {
        if (!officeMappingsByType.has(m.leave_type_id)) {
          officeMappingsByType.set(m.leave_type_id, new Set());
        }
        officeMappingsByType.get(m.leave_type_id)!.add(m.office_id);
      });

      // 6. Process each employee to find missing balances
      const result: EmployeeMissingBalance[] = [];

      for (const employee of employees) {
        const employeeProfile = employee.profiles as { full_name: string; avatar_url: string | null };
        const missingTypes: MissingLeaveType[] = [];
        let totalCarryForward = 0;
        let totalAllocation = 0;

        for (const leaveType of leaveTypes) {
          // Skip if balance already exists
          if (existingSet.has(existingKey(employee.id, leaveType.id))) {
            continue;
          }

          // Check eligibility - Gender
          const genderRestriction = leaveType.applies_to_gender || 'all';
          if (genderRestriction !== 'all' && employee.gender !== genderRestriction) {
            continue;
          }

          // Check eligibility - Employment type
          const empTypes = leaveType.applies_to_employment_types as string[] | null;
          if (empTypes && empTypes.length > 0 && employee.employment_type && !empTypes.includes(employee.employment_type)) {
            continue;
          }

          // Check eligibility - Office
          if (!leaveType.applies_to_all_offices && employee.office_id) {
            const officeSet = officeMappingsByType.get(leaveType.id);
            if (!officeSet || !officeSet.has(employee.office_id)) {
              continue;
            }
          }

          // Calculate projected balance with carry forward
          const defaultDays = leaveType.default_days || 0;
          const carryMode = leaveType.carry_forward_mode || 'none';
          const prevBalance = prevBalanceMap.get(existingKey(employee.id, leaveType.id)) ?? null;
          
          let carryForwardAmount = 0;
          if (carryMode !== 'none' && prevBalance !== null) {
            carryForwardAmount = getCarriedForwardAmount(carryMode, prevBalance);
          }

          const projectedBalance = defaultDays + carryForwardAmount;
          totalCarryForward += carryForwardAmount;
          totalAllocation += defaultDays;

          missingTypes.push({
            leave_type_id: leaveType.id,
            leave_type_name: leaveType.name,
            default_days: leaveType.default_days,
            carry_forward_mode: carryMode,
            previous_balance: prevBalance,
            carry_forward_amount: carryForwardAmount,
            projected_balance: projectedBalance,
          });
        }

        // Only include employees with missing eligible leave types
        if (missingTypes.length > 0) {
          result.push({
            employee_id: employee.id,
            full_name: employeeProfile.full_name,
            avatar_url: employeeProfile.avatar_url,
            department: null, // Could be fetched if needed
            position: employee.position,
            gender: employee.gender,
            employment_type: employee.employment_type,
            office_id: employee.office_id,
            missing_leave_types: missingTypes,
            total_carry_forward: totalCarryForward,
            total_allocation: totalAllocation,
          });
        }
      }

      // Sort by name
      result.sort((a, b) => a.full_name.localeCompare(b.full_name));

      return result;
    },
    enabled: !!currentOrg?.id && year > 0,
    staleTime: 1000 * 60, // 1 minute
  });
};
