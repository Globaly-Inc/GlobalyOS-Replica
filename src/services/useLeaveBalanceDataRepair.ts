/**
 * Service for detecting and repairing incorrect leave balances
 * Recalculates balances from the sum of all logs (source of truth)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export interface IncorrectBalance {
  balanceId: string;
  employeeId: string;
  employeeName: string;
  leaveTypeId: string;
  leaveTypeName: string;
  year: number;
  currentBalance: number;
  correctBalance: number;
  difference: number;
  issueType: 'doubled' | 'mismatch';
}

export interface RepairSummary {
  totalChecked: number;
  incorrectCount: number;
  repairedCount: number;
  errors: string[];
}

/**
 * Fetch all balances that don't match their log totals
 */
export const useIncorrectBalances = (year?: number) => {
  const { currentOrg } = useOrganization();
  const targetYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ["incorrect-leave-balances", currentOrg?.id, targetYear],
    queryFn: async (): Promise<IncorrectBalance[]> => {
      if (!currentOrg?.id) return [];

      // Get all balances for the year
      const { data: balances, error: balError } = await supabase
        .from("leave_type_balances")
        .select(`
          id,
          employee_id,
          leave_type_id,
          balance,
          year,
          employee:employees!inner(
            id,
            profiles!inner(full_name)
          ),
          leave_type:leave_types!inner(
            id,
            name
          )
        `)
        .eq("organization_id", currentOrg.id)
        .eq("year", targetYear);

      if (balError) throw balError;
      if (!balances?.length) return [];

      // Get all logs for this org/year to calculate correct balances
      const { data: logs, error: logError } = await supabase
        .from("leave_balance_logs")
        .select("employee_id, leave_type_id, change_amount, action, year")
        .eq("organization_id", currentOrg.id)
        .in("action", [
          "year_allocation",
          "year_init",
          "carry_forward_in",
          "manual_adjustment",
          "leave_deduct"
        ])
        .eq("year", targetYear)
        .not("leave_type_id", "is", null);

      if (logError) throw logError;

      // Calculate correct balance from logs for each employee/leave_type
      const correctBalances = new Map<string, number>();
      
      (logs || []).forEach((log) => {
        if (!log.leave_type_id) return;
        const key = `${log.employee_id}-${log.leave_type_id}`;
        const current = correctBalances.get(key) || 0;
        correctBalances.set(key, current + (log.change_amount || 0));
      });

      // Compare and find mismatches
      const incorrect: IncorrectBalance[] = [];

      for (const bal of balances) {
        const key = `${bal.employee_id}-${bal.leave_type_id}`;
        const correctBalance = correctBalances.get(key) || 0;
        const currentBalance = bal.balance || 0;
        
        // Round to handle floating point issues
        const roundedCurrent = Math.round(currentBalance * 10) / 10;
        const roundedCorrect = Math.round(correctBalance * 10) / 10;

        if (roundedCurrent !== roundedCorrect) {
          const diff = roundedCurrent - roundedCorrect;
          
          // Determine issue type
          const isDoubled = Math.abs(roundedCurrent) > 0 && 
            Math.abs(roundedCorrect) > 0 && 
            Math.abs(roundedCurrent / roundedCorrect - 2) < 0.01;

          incorrect.push({
            balanceId: bal.id,
            employeeId: bal.employee_id,
            employeeName: (bal.employee as any)?.profiles?.full_name || 'Unknown',
            leaveTypeId: bal.leave_type_id,
            leaveTypeName: (bal.leave_type as any)?.name || 'Unknown',
            year: bal.year,
            currentBalance: roundedCurrent,
            correctBalance: roundedCorrect,
            difference: diff,
            issueType: isDoubled ? 'doubled' : 'mismatch',
          });
        }
      }

      return incorrect;
    },
    enabled: !!currentOrg?.id,
    staleTime: 30000,
  });
};

/**
 * Repair all incorrect balances by updating them to match log totals
 */
export const useRepairBalances = () => {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (incorrectBalances: IncorrectBalance[]): Promise<RepairSummary> => {
      if (!currentOrg?.id) throw new Error("No organization");

      const result: RepairSummary = {
        totalChecked: incorrectBalances.length,
        incorrectCount: incorrectBalances.length,
        repairedCount: 0,
        errors: [],
      };

      for (const balance of incorrectBalances) {
        const { error } = await supabase
          .from("leave_type_balances")
          .update({ 
            balance: balance.correctBalance,
            updated_at: new Date().toISOString(),
          })
          .eq("id", balance.balanceId);

        if (error) {
          result.errors.push(`Failed to repair ${balance.employeeName} - ${balance.leaveTypeName}: ${error.message}`);
        } else {
          result.repairedCount++;
        }
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["incorrect-leave-balances"] });
      queryClient.invalidateQueries({ queryKey: ["leave-type-balances"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
      
      if (result.errors.length > 0) {
        toast.error(`Repaired ${result.repairedCount}/${result.incorrectCount} with ${result.errors.length} errors`);
      } else {
        toast.success(`Successfully repaired ${result.repairedCount} balances`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to repair balances");
    },
  });
};

/**
 * Repair a single incorrect balance
 */
export const useRepairSingleBalance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (balance: IncorrectBalance) => {
      const { error } = await supabase
        .from("leave_type_balances")
        .update({ 
          balance: balance.correctBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", balance.balanceId);

      if (error) throw error;
      return balance;
    },
    onSuccess: (balance) => {
      queryClient.invalidateQueries({ queryKey: ["incorrect-leave-balances"] });
      queryClient.invalidateQueries({ queryKey: ["leave-type-balances"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
      toast.success(`Repaired ${balance.employeeName} - ${balance.leaveTypeName}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to repair balance");
    },
  });
};

/**
 * Get summary stats for balance health
 */
export const useBalanceHealthStats = (year?: number) => {
  const { currentOrg } = useOrganization();
  const targetYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ["balance-health-stats", currentOrg?.id, targetYear],
    queryFn: async () => {
      if (!currentOrg?.id) return null;

      // Count total balances
      const { count: totalBalances } = await supabase
        .from("leave_type_balances")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", currentOrg.id)
        .eq("year", targetYear);

      // Get all balances with their correct values from logs
      const { data: balances } = await supabase
        .from("leave_type_balances")
        .select("id, employee_id, leave_type_id, balance")
        .eq("organization_id", currentOrg.id)
        .eq("year", targetYear);

      const { data: logs } = await supabase
        .from("leave_balance_logs")
        .select("employee_id, leave_type_id, change_amount")
        .eq("organization_id", currentOrg.id)
        .eq("year", targetYear)
        .in("action", ["year_allocation", "year_init", "carry_forward_in", "manual_adjustment", "leave_deduct"])
        .not("leave_type_id", "is", null);

      // Calculate correct balances
      const correctBalances = new Map<string, number>();
      (logs || []).forEach((log) => {
        if (!log.leave_type_id) return;
        const key = `${log.employee_id}-${log.leave_type_id}`;
        correctBalances.set(key, (correctBalances.get(key) || 0) + (log.change_amount || 0));
      });

      // Count mismatches
      let doubledCount = 0;
      let mismatchCount = 0;

      (balances || []).forEach((bal) => {
        const key = `${bal.employee_id}-${bal.leave_type_id}`;
        const correct = correctBalances.get(key) || 0;
        const current = bal.balance || 0;

        if (Math.abs(current - correct) > 0.01) {
          if (correct !== 0 && Math.abs(current / correct - 2) < 0.01) {
            doubledCount++;
          } else {
            mismatchCount++;
          }
        }
      });

      return {
        totalBalances: totalBalances || 0,
        doubledCount,
        mismatchCount,
        healthyCount: (totalBalances || 0) - doubledCount - mismatchCount,
        year: targetYear,
      };
    },
    enabled: !!currentOrg?.id,
    staleTime: 30000,
  });
};
