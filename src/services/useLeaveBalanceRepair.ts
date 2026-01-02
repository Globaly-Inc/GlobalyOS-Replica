/**
 * Service for repairing leave balances that are missing proper audit logs
 * Identifies invalid 2026 balances and enables clean re-initialization
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export interface InvalidBalance {
  balance_id: string;
  employee_id: string;
  employee_name: string;
  avatar_url: string | null;
  leave_type_id: string;
  leave_type_name: string;
  balance: number;
  employment_type: string | null;
}

export interface RepairResult {
  deletedBalances: number;
  affectedEmployees: string[];
  errors: string[];
}

/**
 * Hook to fetch 2026 balances that lack proper initialization logs
 */
export const useInvalidBalances = (year: number) => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ["invalid-leave-balances", currentOrg?.id, year],
    queryFn: async (): Promise<InvalidBalance[]> => {
      if (!currentOrg?.id) return [];

      // Get all balances for the target year
      const { data: balances, error: balError } = await supabase
        .from("leave_type_balances")
        .select(`
          id,
          employee_id,
          leave_type_id,
          balance,
          employee:employees!inner(
            id,
            employment_type,
            profiles!inner(full_name, avatar_url)
          ),
          leave_type:leave_types!inner(id, name)
        `)
        .eq("organization_id", currentOrg.id)
        .eq("year", year);

      if (balError) throw balError;
      if (!balances?.length) return [];

      // Get all logs for the target year with initialization actions
      const { data: logs, error: logError } = await supabase
        .from("leave_balance_logs")
        .select("employee_id, leave_type_id, action")
        .eq("organization_id", currentOrg.id)
        .in("action", ["year_allocation", "year_init", "carry_forward_in"])
        .gte("effective_date", `${year}-01-01`)
        .lte("effective_date", `${year}-12-31`);

      if (logError) throw logError;

      // Create a set of valid employee+leave_type combinations (those with proper logs)
      const validKey = (empId: string, ltId: string) => `${empId}-${ltId}`;
      const validSet = new Set(
        (logs || []).map((l) => validKey(l.employee_id, l.leave_type_id))
      );

      // Filter balances to find those without proper logs
      const invalidBalances: InvalidBalance[] = [];

      for (const balance of balances) {
        const key = validKey(balance.employee_id, balance.leave_type_id);
        
        if (!validSet.has(key)) {
          const emp = balance.employee as any;
          const lt = balance.leave_type as any;
          
          invalidBalances.push({
            balance_id: balance.id,
            employee_id: balance.employee_id,
            employee_name: emp.profiles.full_name,
            avatar_url: emp.profiles.avatar_url,
            leave_type_id: balance.leave_type_id,
            leave_type_name: lt.name,
            balance: balance.balance,
            employment_type: emp.employment_type,
          });
        }
      }

      // Sort by employee name
      invalidBalances.sort((a, b) => a.employee_name.localeCompare(b.employee_name));

      return invalidBalances;
    },
    enabled: !!currentOrg?.id && year > 0,
    staleTime: 1000 * 60, // 1 minute
  });
};

/**
 * Hook to delete invalid balances (those without proper audit logs)
 * After deletion, the affected employees will appear in the "missing balances" list
 * and can be properly re-initialized
 */
export const useDeleteInvalidBalances = () => {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      balanceIds,
      year,
    }: {
      balanceIds: string[];
      year: number;
    }): Promise<RepairResult> => {
      if (!currentOrg?.id) throw new Error("No organization");
      if (!balanceIds.length) throw new Error("No balances selected");

      const result: RepairResult = {
        deletedBalances: 0,
        affectedEmployees: [],
        errors: [],
      };

      // Get employee IDs before deletion for return value
      const { data: balances } = await supabase
        .from("leave_type_balances")
        .select("employee_id")
        .in("id", balanceIds);

      const affectedEmployeeIds = [...new Set(balances?.map((b) => b.employee_id) || [])];
      result.affectedEmployees = affectedEmployeeIds;

      // Delete the invalid balances
      const { error: deleteError, count } = await supabase
        .from("leave_type_balances")
        .delete()
        .in("id", balanceIds)
        .eq("organization_id", currentOrg.id)
        .eq("year", year);

      if (deleteError) {
        result.errors.push(`Failed to delete balances: ${deleteError.message}`);
      } else {
        result.deletedBalances = count || balanceIds.length;
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["leave-type-balances"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance-logs"] });
      queryClient.invalidateQueries({ queryKey: ["missing-leave-balances"] });
      queryClient.invalidateQueries({ queryKey: ["invalid-leave-balances"] });

      if (result.errors.length > 0) {
        toast.error(`Repair completed with errors: ${result.errors.join(", ")}`);
      } else {
        toast.success(
          `Deleted ${result.deletedBalances} invalid balances. ${result.affectedEmployees.length} employees can now be re-initialized.`
        );
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to repair balances");
    },
  });
};

/**
 * Hook to check employment type eligibility and delete ineligible balances
 * This ensures employees only have balances for leave types they qualify for
 */
export const useCleanIneligibleBalances = () => {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (year: number): Promise<{ deleted: number; checked: number }> => {
      if (!currentOrg?.id) throw new Error("No organization");

      // Get all balances with employee and leave type details
      const { data: balances, error: balError } = await supabase
        .from("leave_type_balances")
        .select(`
          id,
          employee_id,
          leave_type_id,
          employee:employees!inner(
            id,
            employment_type,
            gender,
            office_id
          ),
          leave_type:leave_types!inner(
            id,
            applies_to_employment_types,
            applies_to_gender,
            applies_to_all_offices
          )
        `)
        .eq("organization_id", currentOrg.id)
        .eq("year", year);

      if (balError) throw balError;
      if (!balances?.length) return { deleted: 0, checked: 0 };

      // Get office mappings
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

      // Find ineligible balances
      const ineligibleIds: string[] = [];

      for (const balance of balances) {
        const emp = balance.employee as any;
        const lt = balance.leave_type as any;

        // Check employment type eligibility
        const empTypes = lt.applies_to_employment_types as string[] | null;
        if (empTypes && empTypes.length > 0 && emp.employment_type && !empTypes.includes(emp.employment_type)) {
          ineligibleIds.push(balance.id);
          continue;
        }

        // Check gender eligibility
        const genderRestriction = lt.applies_to_gender || 'all';
        if (genderRestriction !== 'all' && emp.gender !== genderRestriction) {
          ineligibleIds.push(balance.id);
          continue;
        }

        // Check office eligibility
        if (!lt.applies_to_all_offices && emp.office_id) {
          const officeSet = officeMappingsByType.get(balance.leave_type_id);
          if (!officeSet || !officeSet.has(emp.office_id)) {
            ineligibleIds.push(balance.id);
            continue;
          }
        }
      }

      // Delete ineligible balances
      if (ineligibleIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("leave_type_balances")
          .delete()
          .in("id", ineligibleIds);

        if (deleteError) throw deleteError;
      }

      return { deleted: ineligibleIds.length, checked: balances.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["leave-type-balances"] });
      queryClient.invalidateQueries({ queryKey: ["missing-leave-balances"] });
      queryClient.invalidateQueries({ queryKey: ["invalid-leave-balances"] });

      if (result.deleted > 0) {
        toast.success(`Cleaned ${result.deleted} ineligible balances out of ${result.checked} checked`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to clean ineligible balances");
    },
  });
};
